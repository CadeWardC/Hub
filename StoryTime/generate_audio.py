#!/usr/bin/env python3
"""Generate reusable Mandarin sentence recordings locally, then build the reader."""
import argparse
import hashlib
import json

from build_stories import ROOT, compile_library, parse_story


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--voice', default='zf_001')
    parser.add_argument('--speed', type=float, default=1.0)
    args = parser.parse_args()
    if not 0.5 <= args.speed <= 2:
        parser.error('--speed must be between 0.5 and 2')
    import numpy as np
    import soundfile as sf
    import torch
    from kokoro import KPipeline

    repo = 'hexgrad/Kokoro-82M-v1.1-zh'
    torch.set_num_threads(4)
    pipeline = KPipeline(lang_code='z', repo_id=repo, device='cpu')
    directory = ROOT / 'audio'
    directory.mkdir(exist_ok=True)
    manifest = {'model': repo, 'voice': args.voice, 'speed': args.speed,
                'sampleRate': 24000, 'stories': {}}
    paths = sorted(p for p in (ROOT / 'stories').glob('*.txt') if not p.name.startswith('_'))
    for path in paths:
        story = parse_story(path)
        clips = []
        for i, sentence in enumerate(story['sentences']):
            text = sentence['zh']
            identity = json.dumps([repo, args.voice, args.speed, text], ensure_ascii=False)
            name = hashlib.sha256(identity.encode()).hexdigest()[:24] + '.wav'
            target = directory / name
            if not target.exists():
                chunks = [result.audio.numpy() for result in pipeline(text, voice=args.voice, speed=args.speed)]
                if not chunks:
                    raise RuntimeError(f'No audio: {story["id"]} sentence {i + 1}')
                audio = np.concatenate(chunks)
                if not np.isfinite(audio).all() or np.max(np.abs(audio)) < 0.001:
                    raise RuntimeError(f'Invalid or silent audio: {text}')
                temporary = target.with_suffix('.tmp')
                sf.write(temporary, audio, 24000, format='WAV', subtype='PCM_16')
                temporary.replace(target)
            info = sf.info(target)
            clips.append({'zh': text, 'src': 'audio/' + name, 'duration': info.duration})
            print(f'{story["id"]} {i + 1}/{len(story["sentences"])}: {info.duration:.2f}s', flush=True)
        manifest['stories'][story['id']] = clips
    target = directory / 'manifest.json'
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(target)
    print(f'Built {compile_library()} stories with Kokoro narration.', flush=True)


if __name__ == '__main__':
    main()
