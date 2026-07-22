"""Dependency-free validation for checked-in Flutter story assets."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "assets" / "content" / "catalog.json"


def validate() -> list[str]:
    errors: list[str] = []
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    ids: set[str] = set()
    for entry in catalog.get("stories", []):
        story_id = entry.get("id", "")
        if not story_id or story_id in ids:
            errors.append(f"Catalog story id is missing or duplicated: {story_id!r}")
        ids.add(story_id)
        path = ROOT / entry.get("path", "")
        if not path.is_file():
            errors.append(f"{story_id}: story JSON is missing at {path}")
            continue
        story = json.loads(path.read_text(encoding="utf-8"))
        if story.get("schemaVersion") != 1:
            errors.append(f"{story_id}: unsupported schemaVersion")
        if story.get("id") != story_id:
            errors.append(f"{story_id}: catalog/story id mismatch")
        if entry.get("blockCount") != len(story.get("blocks", [])):
            errors.append(f"{story_id}: catalog block count is stale")
        block_ids: set[str] = set()
        for block in story.get("blocks", []):
            block_id = block.get("id", "")
            if not block_id or block_id in block_ids:
                errors.append(f"{story_id}: missing or duplicate block id {block_id!r}")
            block_ids.add(block_id)
            reconstructed = "".join(token.get("text", "") for token in block.get("tokens", []))
            if reconstructed != block.get("hanzi", ""):
                errors.append(f"{story_id}/{block_id}: tokens do not reconstruct text")
            audio = block.get("audio") or {}
            audio_path = path.parent / audio.get("path", "")
            if not audio_path.is_file() or audio_path.stat().st_size < 128:
                errors.append(f"{story_id}/{block_id}: MP3 is missing or empty")
            if int(audio.get("durationMs", 0)) <= 0:
                errors.append(f"{story_id}/{block_id}: duration is missing")
    return errors


def main() -> None:
    errors = validate()
    if errors:
        raise SystemExit("\n".join(errors))
    count = len(json.loads(CATALOG.read_text(encoding="utf-8")).get("stories", []))
    print(f"Validated {count} published Mandarin stor{'y' if count == 1 else 'ies'}.")


if __name__ == "__main__":
    main()
