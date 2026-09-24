#!/usr/bin/env python3
"""Compile plain-text stories with Python's standard library. No dependencies."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LEVELS = ('beginner', 'intermediate', 'advanced')
FIELDS = {'title', 'level', 'series', 'symbol', 'description', 'note'}


def parse_story(path):
    """One sentence per line: Chinese | optional pinyin | optional English."""
    def fail(line, message):
        raise ValueError(f'{path.name}:{line}: {message}')

    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', path.stem):
        fail(1, 'Use a lowercase filename with hyphens, e.g. rainy-day-beginner.txt.')
    lines = path.read_text(encoding='utf-8-sig').splitlines()
    story = {'id': path.stem, 'sentences': []}
    in_body = False
    for number, raw in enumerate(lines, 1):
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        if not in_body:
            if line == '---':
                in_body = True
                continue
            key, separator, value = line.partition(':')
            key, value = key.strip(), value.strip()
            if not separator or key not in FIELDS:
                fail(number, 'Use a known header (title, level, series, symbol, description, note), then --- before the story.')
            if key in story:
                fail(number, f'Duplicate header: {key}.')
            if not value or len(value) > (120 if key == 'title' else 500):
                fail(number, f'{key} is empty or too long.')
            story[key] = value
        else:
            parts = [part.strip() for part in line.split('|')]
            if len(parts) > 3:
                fail(number, 'Use at most two | separators: Chinese | pinyin | English.')
            if not parts[0] or len(parts[0]) > 1000:
                fail(number, 'Chinese is required, up to 1,000 characters per sentence.')
            if any(len(part) > 2000 for part in parts[1:]):
                fail(number, 'A translation is too long (maximum 2,000 characters).')
            story['sentences'].append(dict(zip(('zh', 'pinyin', 'en'), parts)))
    if not story.get('title'):
        fail(1, 'Add title: Your title.')
    if story.get('level') not in LEVELS:
        fail(1, 'Level must be beginner, intermediate, or advanced.')
    if not in_body or not 1 <= len(story['sentences']) <= 500:
        fail(len(lines), 'Add --- followed by 1–500 sentence lines.')
    if sum(len(value) for sentence in story['sentences'] for value in sentence.values()) > 90000:
        fail(len(lines), 'Story is too large; split it into chapters.')
    return story


def compile_library(root=ROOT):
    paths = sorted(path for path in (root / 'stories').glob('*.txt') if not path.name.startswith('_'))
    if not paths:
        raise ValueError('No stories found in stories/*.txt.')
    # Validate everything before replacing any generated file.
    stories = [parse_story(path) for path in paths]
    manifest_path = root / 'audio' / 'manifest.json'
    recordings = json.loads(manifest_path.read_text(encoding='utf-8'))['stories'] if manifest_path.exists() else {}
    word_path = root / 'word-data.json'
    word_data = json.loads(word_path.read_text(encoding='utf-8')).get('clips', {}) if word_path.exists() else {}
    def matching_words(source, text):
        entry = word_data.get(source, {})
        path = root / source
        if entry.get('zh') == text and path.is_file() and entry.get('sha256') == hashlib.sha256(path.read_bytes()).hexdigest():
            return entry.get('words', [])
        return []
    audio_assets = set()
    for story in stories:
        clips = recordings.get(story['id'], [])
        for index, sentence in enumerate(story['sentences']):
            clip = clips[index] if index < len(clips) else {}
            source = clip.get('src', '')
            # Edited sentences must never play a stale recording.
            if clip.get('zh') == sentence['zh'] and re.fullmatch(r'audio/[a-f0-9]{24}\.wav', source) and (root / source).is_file():
                sentence['audio'] = source
                audio_assets.add('./' + source)
                words = matching_words(source, sentence['zh'])
                if words:
                    sentence['words'] = words
                for speed, variant in clip.get('speeds', {}).items():
                    variant_source = variant.get('src', '')
                    if speed in ('0.5', '0.65', '0.8') and re.fullmatch(r'audio/[a-f0-9]{24}\.wav', variant_source) and (root / variant_source).is_file():
                        sentence.setdefault('audioSpeeds', {})[speed] = variant_source
                        audio_assets.add('./' + variant_source)
                        variant_words = matching_words(variant_source, sentence['zh'])
                        if words and [(w['text'], w['offset']) for w in variant_words] == [(w['text'], w['offset']) for w in words]:
                            sentence.setdefault('wordTimings', {})[speed] = [[w['start'], w['end']] for w in variant_words]
    versions = set()
    for story in stories:
        if story.get('series'):
            pair = (story['series'], story['level'])
            if pair in versions:
                raise ValueError(f'{story["id"]}: duplicate level {pair[1]} in series {pair[0]}.')
            versions.add(pair)
    stories.sort(key=lambda s: (LEVELS.index(s['level']), s['title'], s['id']))
    output = '// Generated by build_stories.py. Edit stories/*.txt instead.\n// Dictionary definitions adapted from CC-CEDICT, MDBG and contributors, CC BY-SA 4.0.\n// https://www.mdbg.net/chinese/dictionary?page=cc-cedict | https://creativecommons.org/licenses/by-sa/4.0/\nwindow.STORYTIME_STORIES = ' + json.dumps(stories, ensure_ascii=False, indent=2) + ';\n'
    (root / 'stories.js').write_text(output, encoding='utf-8')
    # Story and app changes update the PWA together, without a manual version bump.
    worker = root / 'sw.js'
    worker_text = worker.read_text(encoding='utf-8')
    worker_text = re.sub(r'const AUDIO_ASSETS = .*?;', 'const AUDIO_ASSETS = ' + json.dumps(sorted(audio_assets)) + ';', worker_text, count=1)
    normalized_worker = re.sub(r"const CACHE = '[^']+';", "const CACHE = '';", worker_text, count=1)
    digest = hashlib.sha256(normalized_worker.encode())
    for name in ('index.html', 'app.js', 'listening.js', 'stories.js', 'styles.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'):
        digest.update(name.encode())
        digest.update((root / name).read_bytes())
    worker.write_text(re.sub(r"const CACHE = '[^']+';", f"const CACHE = 'storytime-{digest.hexdigest()[:16]}';", worker_text, count=1), encoding='utf-8')
    return len(stories)


if __name__ == '__main__':
    try:
        print(f'Built {compile_library()} stories. Open StoryTime/index.html to read.')
    except (ValueError, OSError) as error:
        raise SystemExit(f'Story library not built: {error}') from error
