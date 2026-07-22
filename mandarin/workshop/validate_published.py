"""Dependency-free validation for checked-in Flutter story assets."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "assets" / "content" / "catalog.json"
LEVELS = {
    "newbie",
    "elementary",
    "intermediate",
    "upper-intermediate",
    "advanced",
    "master",
}


def _contains_hanzi(value: str) -> bool:
    return any("\u3400" <= character <= "\u9fff" for character in value)


def validate() -> list[str]:
    errors: list[str] = []
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    entries = catalog.get("stories", [])
    if len(entries) != 12:
        errors.append(f"Catalog must contain 12 stories, found {len(entries)}")
    level_counts = Counter(entry.get("level") for entry in entries)
    for level in LEVELS:
        if level_counts[level] != 2:
            errors.append(f"Catalog must contain two {level} stories")
    ids: set[str] = set()
    for entry in entries:
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
        if story.get("level") != entry.get("level"):
            errors.append(f"{story_id}: catalog/story level mismatch")
        if entry.get("blockCount") != len(story.get("blocks", [])):
            errors.append(f"{story_id}: catalog block count is stale")
        voices = story.get("voices", [])
        voice_ids = {voice.get("id") for voice in voices if voice.get("id")}
        if len(voice_ids) != len(voices) or "narrator" not in voice_ids:
            errors.append(f"{story_id}: voice ids are missing, duplicated, or lack narrator")
        all_hanzi = "".join(block.get("hanzi", "") for block in story.get("blocks", []))
        token_texts: set[str] = set()
        audio_paths: set[str] = set()
        block_ids: set[str] = set()
        for block in story.get("blocks", []):
            block_id = block.get("id", "")
            if not block_id or block_id in block_ids:
                errors.append(f"{story_id}: missing or duplicate block id {block_id!r}")
            block_ids.add(block_id)
            reconstructed = "".join(token.get("text", "") for token in block.get("tokens", []))
            if reconstructed != block.get("hanzi", ""):
                errors.append(f"{story_id}/{block_id}: tokens do not reconstruct text")
            if not block.get("pinyin") or not block.get("translation"):
                errors.append(f"{story_id}/{block_id}: pinyin or translation is missing")
            if block.get("speakerId") not in voice_ids:
                errors.append(f"{story_id}/{block_id}: speaker has no assigned voice")
            for token in block.get("tokens", []):
                text = token.get("text", "")
                token_texts.add(text)
                if _contains_hanzi(text):
                    if not token.get("pinyin") or not token.get("gloss"):
                        errors.append(
                            f"{story_id}/{block_id}/{text}: lexical annotation is incomplete"
                        )
                    if token.get("difficulty") not in range(1, 7):
                        errors.append(
                            f"{story_id}/{block_id}/{text}: difficulty is outside 1-6"
                        )
                if not isinstance(token.get("focus"), bool):
                    errors.append(f"{story_id}/{block_id}/{text}: focus must be boolean")
            audio = block.get("audio") or {}
            relative_audio_path = audio.get("path", "")
            if relative_audio_path in audio_paths:
                errors.append(f"{story_id}/{block_id}: audio path is duplicated")
            audio_paths.add(relative_audio_path)
            audio_path = path.parent / relative_audio_path
            if not audio_path.is_file() or audio_path.stat().st_size < 128:
                errors.append(f"{story_id}/{block_id}: MP3 is missing or empty")
            if int(audio.get("durationMs", 0)) <= 0:
                errors.append(f"{story_id}/{block_id}: duration is missing")
        for word in story.get("learningWords", []):
            if not any(word in token_text for token_text in token_texts):
                errors.append(
                    f"{story_id}: learning word {word!r} is absent from lexical tokens"
                )
        for voice in voices:
            name = voice.get("name", "")
            if _contains_hanzi(name) and name in all_hanzi and name not in token_texts:
                errors.append(f"{story_id}: character name {name!r} is not a lexical token")
        mp3_files = set((path.parent / "audio").glob("*.mp3"))
        if len(mp3_files) != len(story.get("blocks", [])):
            errors.append(f"{story_id}: audio file count does not match block count")
    return errors


def main() -> None:
    errors = validate()
    if errors:
        raise SystemExit("\n".join(errors))
    count = len(json.loads(CATALOG.read_text(encoding="utf-8")).get("stories", []))
    print(f"Validated {count} published Mandarin stor{'y' if count == 1 else 'ies'}.")


if __name__ == "__main__":
    main()
