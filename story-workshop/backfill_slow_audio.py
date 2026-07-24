"""Generate slow audio variants for stories already published to the app.

Run from anywhere: python story-workshop/backfill_slow_audio.py [--force]

For every story JSON in mandarin/assets/content/stories/, this creates 0.75x
and 0.5x WAVs next to each segment's audio file (via ffmpeg atempo) and writes
the resulting paths into each segment's "audioVariants" field. Existing
variant files are reused unless --force is passed.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from server import SLOW_VARIANTS, FLUTTER_CONTENT_ROOT, atomic_write_json, generate_slow_variants


def backfill(force: bool) -> int:
    stories_root = FLUTTER_CONTENT_ROOT / "stories"
    story_files = sorted(stories_root.glob("*.json"))
    if not story_files:
        print(f"No story files found in {stories_root}")
        return 1

    for story_file in story_files:
        story = json.loads(story_file.read_text(encoding="utf-8"))
        segments = story.get("segments") or []
        changed = False
        generated = 0
        for segment in segments:
            audio_file = str(segment.get("audioFile") or "")
            if not audio_file.startswith("assets/content/"):
                continue
            source = FLUTTER_CONTENT_ROOT / audio_file.removeprefix(
                "assets/content/"
            )
            if not source.is_file():
                print(f"  missing audio, skipped: {audio_file}")
                continue

            existing = {
                atempo: source.with_name(
                    f"{source.stem}_{suffix}{source.suffix}"
                )
                for suffix, atempo in SLOW_VARIANTS.items()
            }
            if not force and all(path.is_file() for path in existing.values()):
                variants = {
                    speed: path.name for speed, path in existing.items()
                }
            else:
                variants = generate_slow_variants(source)
                generated += len(variants)
            if not variants:
                continue

            segment["audioVariants"] = {
                speed: f"assets/content/audio/{name}"
                for speed, name in sorted(variants.items())
            }
            changed = True

        if changed:
            atomic_write_json(story_file, story)
        print(
            f"{story_file.name}: {len(segments)} segments, "
            f"{generated} variant files generated, "
            f"{'updated' if changed else 'unchanged'}"
        )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate variant WAVs even if they already exist.",
    )
    return backfill(parser.parse_args().force)


if __name__ == "__main__":
    sys.exit(main())
