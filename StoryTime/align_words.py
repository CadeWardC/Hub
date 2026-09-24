#!/usr/bin/env python3
"""Align recorded Mandarin words and build an offline dictionary for the reader."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re

from build_stories import ROOT, compile_library

MODEL = 'Qwen/Qwen3-ForcedAligner-0.6B'
NAMES = {'小白': 'Xiaobai (the cat’s name)', '小明': 'Xiaoming (a person’s name)', '小林': 'Xiaolin (the narrator’s name)'}


def load_dictionary(path):
    entries = {}
    with gzip.open(path, 'rt', encoding='utf-8') as stream:
        for line in stream:
            match = re.match(r'^(\S+) (\S+) \[(.*?)\] /(.*)/$', line.strip())
            if match:
                _, simplified, pinyin, definitions = match.groups()
                entries.setdefault(simplified, []).append((pinyin, definitions.split('/')))
    return entries


def word_rows(text, dictionary):
    import jieba
    from pypinyin import lazy_pinyin, Style
    tones = lazy_pinyin(text, style=Style.TONE, errors=lambda s: list(s))
    numbered = lazy_pinyin(text, style=Style.TONE3, neutral_tone_with_five=True, errors=lambda s: list(s))
    tokens = []
    for word, start, end in jieba.tokenize(text, HMM=False):
        if not re.search(r'[\u3400-\u9fffA-Za-z0-9]', word):
            continue
        parts = [(word, start, end)] if word in dictionary or word in NAMES or len(word) == 1 else [(ch, start+i, start+i+1) for i, ch in enumerate(word)]
        for word, start, end in parts:
            target = ' '.join(numbered[start:end]).lower().replace('5', '')
            candidates = dictionary.get(word, [])
            candidates.sort(key=lambda item: (item[0].lower().replace('5', '') != target, item[0][:1].isupper()))
            meanings = []
            if word in NAMES:
                meanings = [NAMES[word]]
            elif candidates:
                meanings = [d for d in candidates[0][1] if not d.startswith('CL:')][:3]
            if not meanings:
                meanings = ['Name or expression; see the sentence translation.']
            tokens.append({'text': word, 'offset': start, 'pinyin': ' '.join(tones[start:end]), 'meanings': meanings})
    return tokens


def repair_short_boundaries(words, duration):
    """Resolve quantized zero-length predictions without overlapping word regions."""
    for i, word in enumerate(words):
        if word['end'] - word['start'] <= 0.025:
            preceding = words[i-1]['end'] if i else 0.0
            word['start'] = round(max(preceding, word['end'] - (0.24 if i == 0 else 0.12)), 3)
        if i + 1 < len(words) and word['end'] > words[i+1]['start']:
            boundary = max(word['start'] + 0.005, words[i+1]['start'])
            word['end'] = round(boundary, 3)
            words[i+1]['start'] = round(boundary, 3)
        word['end'] = min(duration, max(word['end'], word['start'] + 0.005))
    return words


def attach_times(text, words, alignment, duration):
    positions = {}
    cursor = 0
    for item in alignment:
        chars = item.text.strip()
        offset = text.find(chars, cursor)
        if offset < 0:
            raise ValueError(f'Alignment does not match source text: {chars!r} in {text!r}')
        for i in range(len(chars)):
            positions[offset+i] = (float(item.start_time), float(item.end_time))
        cursor = offset + len(chars)
    rows = []
    previous = 0.0
    for word in words:
        indices = range(word['offset'], word['offset'] + len(word['text']))
        if any(i not in positions for i in indices):
            raise ValueError(f'Missing alignment for {word["text"]!r} in {text!r}')
        start = max(previous, positions[word['offset']][0])
        end = min(duration, max(start + 0.01, positions[word['offset'] + len(word['text']) - 1][1]))
        if start >= duration or end <= start:
            raise ValueError(f'Invalid word boundary: {word["text"]!r}')
        rows.append({**word, 'start': round(start, 3), 'end': round(end, 3)})
        previous = start
    return repair_short_boundaries(rows, duration)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model-path', default=str(ROOT.parents[1] / 'models' / MODEL.split('/')[-1]))
    parser.add_argument('--dictionary', type=Path, default=Path.home() / '.cache/storytime-tools/cedict/cedict.txt.gz')
    args = parser.parse_args()
    import torch
    from qwen_asr import Qwen3ForcedAligner
    torch.set_num_threads(4)
    dictionary = load_dictionary(args.dictionary)
    manifest = json.loads((ROOT / 'audio/manifest.json').read_text(encoding='utf-8'))
    output = ROOT / 'word-data.json'
    data = json.loads(output.read_text(encoding='utf-8')) if output.exists() else {'clips': {}}
    data.update({'aligner': MODEL, 'dictionary': 'CC-CEDICT (MDBG and contributors)',
                 'source': 'https://www.mdbg.net/chinese/dictionary?page=cc-cedict',
                 'license': 'CC BY-SA 4.0', 'modifications': 'Subset, segmentation, contextual pinyin, shortened definitions, name annotations, and audio timestamps.'})
    jobs = []
    needed = set()
    for clips in manifest['stories'].values():
        for clip in clips:
            words = word_rows(clip['zh'], dictionary)
            for recording in [clip, *clip.get('speeds', {}).values()]:
                source = recording['src']
                needed.add(source)
                digest = hashlib.sha256((ROOT / source).read_bytes()).hexdigest()
                cached = data['clips'].get(source, {})
                if cached.get('sha256') == digest and cached.get('zh') == clip['zh']:
                    if [(w['text'], w['offset']) for w in cached['words']] == [(w['text'], w['offset']) for w in words]:
                        cached['words'] = repair_short_boundaries([{**old, **word} for old, word in zip(cached['words'], words)], recording['duration'])
                    else:
                        jobs.append((source, clip['zh'], words, recording['duration'], digest))
                    continue
                jobs.append((source, clip['zh'], words, recording['duration'], digest))
    device = 'cuda:0' if torch.cuda.is_available() else 'cpu'
    print(f'Aligning {len(jobs)} recordings on {device}', flush=True)
    model = Qwen3ForcedAligner.from_pretrained(args.model_path, device_map=device,
        dtype=torch.bfloat16 if device.startswith('cuda') else torch.float32, attn_implementation='sdpa') if jobs else None
    for first in range(0, len(jobs), 8):
        batch = jobs[first:first+8]
        aligned = model.align(audio=[str(ROOT / job[0]) for job in batch], text=[job[1] for job in batch], language='Chinese')
        for (source, text, words, duration, digest), alignment in zip(batch, aligned):
            data['clips'][source] = {'zh': text, 'sha256': digest, 'words': attach_times(text, words, alignment, duration)}
        temporary = output.with_suffix('.tmp')
        temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        temporary.replace(output)
        print(f'Aligned {min(first+8, len(jobs))}/{len(jobs)} recordings', flush=True)
    data['clips'] = {src: entry for src, entry in data['clips'].items() if src in needed}
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    compile_library()


if __name__ == '__main__':
    main()
