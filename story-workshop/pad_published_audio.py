"""Add lead-in silence to stories already published to the app.

Run from anywhere: python story-workshop/pad_published_audio.py

Audio output pipelines (especially on web and Bluetooth) can swallow the
first ~100-200ms after playback starts, clipping the first syllable. New
recordings get a 250ms lead baked in by tts_engine; this pads the normal-
speed WAVs already published in mandarin/assets/content/audio/ and then
regenerates their slow variants. Files that already have >=200ms of leading
silence are left untouched, so the script is idempotent.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import soundfile as sf

from server import SLOW_VARIANTS, FLUTTER_CONTENT_ROOT, generate_slow_variants

LEAD_SECONDS = 0.25
SKIP_THRESHOLD_SECONDS = 0.2
SILENCE_AMPLITUDE = 0.01


def leading_silence_seconds(data: np.ndarray, sample_rate: int) -> float:
    loud = np.flatnonzero(np.abs(data) > SILENCE_AMPLITUDE)
    if loud.size == 0:
        return len(data) / sample_rate
    return float(loud[0]) / sample_rate


def main() -> int:
    audio_root = FLUTTER_CONTENT_ROOT / "audio"
    variant_suffixes = tuple(f"_{suffix}" for suffix in SLOW_VARIANTS)
    sources = [
        path
        for path in sorted(audio_root.glob("*.wav"))
        if not path.stem.endswith(variant_suffixes)
    ]
    if not sources:
        print(f"No audio files found in {audio_root}")
        return 1

    padded = 0
    for source in sources:
        data, sample_rate = sf.read(source)
        lead = leading_silence_seconds(data, sample_rate)
        if lead >= SKIP_THRESHOLD_SECONDS:
            continue
        silence = np.zeros(int(sample_rate * LEAD_SECONDS), dtype=data.dtype)
        sf.write(source, np.concatenate([silence, data]), sample_rate, subtype="PCM_16")
        generate_slow_variants(source)
        padded += 1
        print(f"padded {source.name} (had {lead * 1000:.0f}ms lead)")

    print(f"{padded} of {len(sources)} files padded; slow variants regenerated.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
