#!/usr/bin/env python3
"""Render slow narration with Rubber Band R3 before the browser plays it."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import wave

from build_stories import ROOT, compile_library

SPEEDS = ('0.5', '0.65', '0.8')


def find_rubberband(explicit=None):
    bundled = Path.home() / '.cache/storytime-tools/rubberband/rubberband-4.0.0-gpl-executable-windows/rubberband.exe'
    executable = explicit or shutil.which('rubberband') or (str(bundled) if bundled.is_file() else None)
    if not executable:
        raise RuntimeError('Install Rubber Band 4 and put rubberband on PATH, or pass --rubberband PATH.')
    return executable


def prepare_speeds(manifest, directory, executable):
    # Hash the actual source bytes so changed recordings cannot reuse old renders.
    jobs = {}
    for clips in manifest['stories'].values():
        for clip in clips:
            source = directory / Path(clip['src']).name
            source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
            for speed in SPEEDS:
                key = hashlib.sha256(f'{source_hash}:rubberband-4-r3:{speed}'.encode()).hexdigest()[:24]
                jobs[key] = (source, speed, directory / (key + '.wav'))

    def render(job):
        source, speed, output = job
        if not output.exists():
            temporary = output.with_suffix('.tmp.wav')
            subprocess.run([executable, '-3', '--quiet', '--tempo', speed, str(source), str(temporary)],
                           check=True, capture_output=True)
            with wave.open(str(temporary)) as wav:
                if wav.getframerate() != 24000 or wav.getnchannels() != 1 or wav.getnframes() < 6000:
                    raise RuntimeError(f'Invalid slow recording: {source}')
            temporary.replace(output)
        with wave.open(str(output)) as wav:
            duration = wav.getnframes() / wav.getframerate()
        return {'src': 'audio/' + output.name, 'duration': duration}

    results = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        for index, (key, result) in enumerate(zip(jobs, pool.map(render, jobs.values())), 1):
            results[key] = result
            if index % 24 == 0 or index == len(jobs):
                print(f'Prepared {index}/{len(jobs)} slow recordings', flush=True)
    for clips in manifest['stories'].values():
        for clip in clips:
            source_hash = hashlib.sha256((directory / Path(clip['src']).name).read_bytes()).hexdigest()
            clip['speeds'] = {speed: results[hashlib.sha256(f'{source_hash}:rubberband-4-r3:{speed}'.encode()).hexdigest()[:24]] for speed in SPEEDS}
    manifest['slowProcessing'] = 'Rubber Band 4 R3, offline tempo adjustment, unchanged pitch'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--rubberband')
    args = parser.parse_args()
    executable = find_rubberband(args.rubberband)
    target = ROOT / 'audio/manifest.json'
    manifest = json.loads(target.read_text(encoding='utf-8'))
    prepare_speeds(manifest, target.parent, executable)
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(target)
    compile_library()


if __name__ == '__main__':
    main()
