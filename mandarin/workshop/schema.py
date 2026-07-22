from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import jieba
from pypinyin import Style, lazy_pinyin

from .config import LEVELS, SUPPORTED_SPEAKERS


HAN_RE = re.compile(r"[\u3400-\u9fff]")
PUNCT_RE = re.compile(r"([，。！？；：、…—“”‘’（）《》,.!?;:\s]+)")


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not slug:
        raise ValueError("A Latin-letter slug or English title is required.")
    return slug


def baseline_tokens(text: str, level_rank: int = 1) -> list[dict[str, Any]]:
    tokens: list[dict[str, Any]] = []
    for part in PUNCT_RE.split(text):
        if not part:
            continue
        if PUNCT_RE.fullmatch(part):
            tokens.append(
                {"text": part, "pinyin": "", "gloss": "", "difficulty": 0, "focus": False}
            )
            continue
        for segment in jieba.lcut(part, HMM=False):
            if not segment:
                continue
            if HAN_RE.search(segment):
                pinyin = " ".join(lazy_pinyin(segment, style=Style.TONE, neutral_tone_with_five=False))
                tokens.append(
                    {
                        "text": segment,
                        "pinyin": pinyin,
                        "gloss": "",
                        "difficulty": level_rank,
                        "focus": False,
                    }
                )
            else:
                tokens.append(
                    {"text": segment, "pinyin": "", "gloss": "", "difficulty": 0, "focus": False}
                )
    return tokens


def hydrate_story(story: dict[str, Any]) -> dict[str, Any]:
    level = LEVELS.get(story.get("level", "newbie"), LEVELS["newbie"])
    voices = story.setdefault(
        "voices",
        [
            {"id": "narrator", "name": "Narrator", "speaker": "Vivian"},
            {"id": "female", "name": "Female voice", "speaker": "Serena"},
            {"id": "male", "name": "Male voice", "speaker": "Dylan"},
        ],
    )
    if not any(voice.get("id") == "narrator" for voice in voices):
        voices.insert(0, {"id": "narrator", "name": "Narrator", "speaker": "Vivian"})
    for index, block in enumerate(story.setdefault("blocks", []), start=1):
        block.setdefault("id", f"b{index:03d}")
        block.setdefault("kind", "narration")
        block.setdefault("speakerId", "narrator")
        block.setdefault("traditional", None)
        block.setdefault("pinyin", " ".join(lazy_pinyin(block.get("hanzi", ""), style=Style.TONE)))
        block.setdefault("translation", "")
        if not block.get("tokens"):
            block["tokens"] = baseline_tokens(block.get("hanzi", ""), level["rank"])
        block.setdefault("audio", {"path": f"audio/{block['id']}.mp3", "durationMs": 0})
    story.setdefault("schemaVersion", 1)
    story.setdefault("minutes", max(2, round(sum(len(block.get("hanzi", "")) for block in story["blocks"]) / 220)))
    story.setdefault("glyph", story.get("title", "读")[:1] or "读")
    story.setdefault("colors", ["#D7482F", "#8E2F21"])
    story.setdefault("topic", "Story")
    story.setdefault("summary", "")
    story.setdefault("pinyinTitle", "")
    return story


def normalize_story_for_spec(
    story: dict[str, Any], spec: dict[str, Any]
) -> dict[str, Any]:
    """Apply trusted authoring metadata after a model-generated draft."""

    identity = spec.get("id") or spec.get("englishTitle") or story.get("id", "")
    story["id"] = slugify(identity)
    if spec.get("englishTitle"):
        story["englishTitle"] = spec["englishTitle"]
    if spec.get("level") in LEVELS:
        story["level"] = spec["level"]
    if spec.get("topic"):
        story["topic"] = spec["topic"]
    story["minutes"] = min(8, max(4, int(story.get("minutes", 4))))
    return story


def validate_story(
    story: dict[str, Any], *, require_audio: bool = False, audio_root: Path | None = None
) -> list[str]:
    errors: list[str] = []
    required = ("id", "title", "englishTitle", "level", "blocks", "voices")
    for field in required:
        if field not in story or story[field] in (None, "", []):
            errors.append(f"Missing required story field: {field}")
    if story.get("schemaVersion") != 1:
        errors.append(f"Unsupported schema version: {story.get('schemaVersion')}")
    if story.get("level") not in LEVELS:
        errors.append(f"Unknown level: {story.get('level')}")
    minutes = story.get("minutes")
    if not isinstance(minutes, int) or not 4 <= minutes <= 8:
        errors.append("Story minutes must be an integer from 4 through 8")
    voice_ids: set[str] = set()
    for voice in story.get("voices", []):
        voice_id = voice.get("id", "")
        if not voice_id or voice_id in voice_ids:
            errors.append(f"Voice ids must be unique and non-empty: {voice_id!r}")
        voice_ids.add(voice_id)
        if voice.get("speaker") not in SUPPORTED_SPEAKERS:
            errors.append(f"Unsupported Qwen speaker for {voice_id}: {voice.get('speaker')}")
    if len(voice_ids) > 4:
        errors.append("Stories may use a narrator and at most three dialogue voices")
    if "narrator" not in voice_ids:
        errors.append("Stories must define the narrator voice")
    block_ids: set[str] = set()
    dialogue_voice_ids: set[str] = set()
    for index, block in enumerate(story.get("blocks", []), start=1):
        label = block.get("id") or f"block {index}"
        if label in block_ids:
            errors.append(f"Duplicate block id: {label}")
        block_ids.add(label)
        if block.get("kind") not in ("narration", "dialogue"):
            errors.append(f"{label}: kind must be narration or dialogue")
        if not block.get("hanzi"):
            errors.append(f"{label}: Chinese text is required")
        if not block.get("translation"):
            errors.append(f"{label}: English translation is required")
        if not block.get("pinyin"):
            errors.append(f"{label}: block pinyin is required")
        if block.get("speakerId") not in voice_ids:
            errors.append(f"{label}: unknown speakerId {block.get('speakerId')!r}")
        if block.get("kind") == "narration" and block.get("speakerId") != "narrator":
            errors.append(f"{label}: narration must use the narrator voice")
        if block.get("kind") == "dialogue":
            dialogue_voice_ids.add(block.get("speakerId", ""))
            if block.get("speakerId") == "narrator":
                errors.append(f"{label}: dialogue must use a character voice")
        tokens = block.get("tokens") or []
        if "".join(token.get("text", "") for token in tokens) != block.get("hanzi", ""):
            errors.append(f"{label}: token text does not reconstruct the Chinese block")
        for token_index, token in enumerate(tokens, start=1):
            difficulty = token.get("difficulty")
            if not isinstance(difficulty, int) or not 0 <= difficulty <= 6:
                errors.append(f"{label} token {token_index}: difficulty must be 0-6")
            if not isinstance(token.get("focus"), bool):
                errors.append(f"{label} token {token_index}: focus must be boolean")
            if HAN_RE.search(token.get("text", "")):
                if not token.get("pinyin"):
                    errors.append(f"{label} token {token_index}: pinyin is required")
                if not token.get("gloss"):
                    errors.append(f"{label} token {token_index}: contextual gloss is required")
                if not isinstance(difficulty, int) or not 1 <= difficulty <= 6:
                    errors.append(
                        f"{label} token {token_index}: Chinese difficulty must be 1-6"
                    )
        if require_audio:
            relative = (block.get("audio") or {}).get("path", "")
            filename = Path(relative).name if relative else ""
            if not filename or audio_root is None or not (audio_root / filename).is_file():
                errors.append(f"{label}: rendered audio is missing")
            if int((block.get("audio") or {}).get("durationMs", 0)) <= 0:
                errors.append(f"{label}: rendered audio duration is missing")
    if len(dialogue_voice_ids) > 3:
        errors.append("Stories may use at most three dialogue voices")
    return errors


def read_json(path: Path, default: Any = None) -> Any:
    if not path.is_file():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)
