#!/usr/bin/env python3
"""Generate Qwen3 Mandarin recordings, publish the complete set, remove replaced clips."""
import argparse
import hashlib
import json
import re
from pathlib import Path

from build_stories import ROOT, compile_library, parse_story

MODEL = 'Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice'
BASE_MODEL = 'Qwen/Qwen3-TTS-12Hz-1.7B-Base'
VOICES = ('Vivian', 'Serena', 'Uncle_Fu', 'Dylan', 'Eric', 'Ryan', 'Aiden', 'Ono_Anna', 'Sohee')
INSTRUCTION = '用温暖、自然、清晰的普通话朗读，语速适中，适合中文学习者。不要添加任何内容。'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model-path', help='Local model folder or Hugging Face model ID')
    parser.add_argument('--voice', default='Serena', choices=VOICES)
    parser.add_argument('--list-voices', action='store_true', help='List all presets without loading a model')
    parser.add_argument('--reference-audio', type=Path, help='Reference recording for voice cloning; selects the Base model')
    parser.add_argument('--reference-text', help='Exact transcript of the reference recording')
    parser.add_argument('--device', default='auto')
    parser.add_argument('--batch-size', type=int, default=4)
    args = parser.parse_args()
    if args.list_voices:
        print('\n'.join(VOICES))
        return
    if bool(args.reference_audio) != bool(args.reference_text):
        parser.error('Voice cloning requires both --reference-audio and --reference-text')
    if args.reference_audio and not args.reference_audio.is_file():
        parser.error('Reference audio file does not exist')
    model_id = BASE_MODEL if args.reference_audio else MODEL
    local_model = ROOT.parents[1] / 'models' / model_id.split('/')[-1]
    args.model_path = args.model_path or (str(local_model) if local_model.is_dir() else model_id)
    reference_hash = hashlib.sha256(args.reference_audio.read_bytes()).hexdigest() if args.reference_audio else None
    if not 1 <= args.batch_size <= 8:
        parser.error('--batch-size must be between 1 and 8')
    import numpy as np
    import soundfile as sf
    import torch
    from qwen_tts import Qwen3TTSModel

    directory = (ROOT / 'audio').resolve()
    directory.mkdir(exist_ok=True)
    target = directory / 'manifest.json'
    old = json.loads(target.read_text(encoding='utf-8')) if target.exists() else {'stories': {}}
    stories = [parse_story(p) for p in sorted((ROOT / 'stories').glob('*.txt')) if not p.name.startswith('_')]
    device = ('cuda:0' if torch.cuda.is_available() else 'cpu') if args.device == 'auto' else args.device
    torch.set_num_threads(4)
    print(f'Loading {args.model_path} on {device}', flush=True)
    model = Qwen3TTSModel.from_pretrained(args.model_path, device_map=device,
        dtype=torch.bfloat16 if device.startswith('cuda') else torch.float32, attn_implementation='sdpa')
    clone_prompt = model.create_voice_clone_prompt(ref_audio=str(args.reference_audio),
        ref_text=args.reference_text, x_vector_only_mode=False) if args.reference_audio else None
    manifest = {'model': model_id, 'voice': 'cloned' if clone_prompt else args.voice, 'language': 'Chinese',
                'instruction': None if clone_prompt else INSTRUCTION, 'sampleRate': 24000, 'stories': {}}
    if reference_hash:
        manifest['referenceSha256'] = reference_hash
    retained = set()
    for story in stories:
        clips = []
        entries = []
        for sentence in story['sentences']:
            text = sentence['zh']
            settings = [model_id, reference_hash, args.reference_text, text] if clone_prompt else [model_id, args.voice, INSTRUCTION, text]
            identity = json.dumps(settings, ensure_ascii=False)
            name = hashlib.sha256(identity.encode()).hexdigest()[:24] + '.wav'
            entries.append((text, name, directory / name))
        missing = list(dict.fromkeys(entry for entry in entries if not entry[2].exists()))
        for start in range(0, len(missing), args.batch_size):
            batch = missing[start:start + args.batch_size]
            torch.manual_seed(42)
            print(f'{story["id"]}: synthesizing {start + 1}-{start + len(batch)} of {len(missing)} missing sentences', flush=True)
            generation = dict(text=[entry[0] for entry in batch], language='Chinese',
                non_streaming_mode=True, max_new_tokens=max(256, max(len(entry[0]) for entry in batch) * 8))
            if clone_prompt:
                wavs, sr = model.generate_voice_clone(**generation, voice_clone_prompt=clone_prompt)
            else:
                wavs, sr = model.generate_custom_voice(**generation, speaker=args.voice, instruct=INSTRUCTION)
            if len(wavs) != len(batch):
                raise RuntimeError('Qwen returned the wrong number of recordings')
            for (text, name, output), wav in zip(batch, wavs):
                audio = np.asarray(wav)
                if audio.ndim != 1 or not np.isfinite(audio).all() or np.max(np.abs(audio)) < 0.001:
                    raise RuntimeError(f'Invalid or silent audio: {text}')
                if sr != 24000 or not 0.25 < len(audio) / sr < max(15, len(text) * 1.5):
                    raise RuntimeError(f'Unexpected audio duration or sample rate: {text}')
                temporary = output.with_suffix('.tmp')
                sf.write(temporary, audio, sr, format='WAV', subtype='PCM_16')
                temporary.replace(output)
        for i, (text, name, output) in enumerate(entries):
            info = sf.info(output)
            if info.samplerate != 24000 or info.channels != 1 or info.duration <= 0.25:
                raise RuntimeError(f'Invalid recording: {output}')
            source = 'audio/' + name
            retained.add(source)
            clips.append({'zh': text, 'src': source, 'duration': info.duration})
            print(f'{story["id"]} {i+1}/{len(story["sentences"])}: {info.duration:.2f}s', flush=True)
        manifest['stories'][story['id']] = clips
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(target)
    print(f'Built {compile_library()} stories with Qwen narration.', flush=True)
    # Only remove former manifest entries, after the complete replacement is built.
    removed = 0
    for clips in old['stories'].values():
        for clip in clips:
            source = clip.get('src', '')
            if source in retained or not re.fullmatch(r'audio/[a-f0-9]{24}\.wav', source):
                continue
            obsolete = (ROOT / source).resolve()
            if obsolete.parent != directory:
                raise RuntimeError(f'Refusing to remove audio outside {directory}')
            if obsolete.is_file():
                obsolete.unlink()
                removed += 1
    print(f'Removed {removed} replaced recordings.', flush=True)


if __name__ == '__main__':
    main()
