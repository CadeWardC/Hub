from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from tts_engine import missing_runtime_modules, synthesize_items


ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent
STATIC_ROOT = ROOT / "static"
DATA_ROOT = ROOT / ".workshop"
PROJECTS_ROOT = DATA_ROOT / "projects"
SETTINGS_FILE = DATA_ROOT / "settings.json"
MANDARIN_ROOT = REPO_ROOT / "mandarin"
FLUTTER_CONTENT_ROOT = MANDARIN_ROOT / "assets" / "content"
PORT = 8766
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

DEFAULT_STORY_PROMPT = """You are an expert writer of graded readers for absolute beginners in Mandarin, in the style of Du Chinese Newbie stories.

Write a complete story in natural English that will be translated into HSK 1 level Chinese. The story must be genuinely engaging, not a flat list of actions:
- Give the main character one small, concrete want or problem in the first few lines, an attempt that does not immediately work, and a warm resolution that feels earned.
- Include at least two short dialogue exchanges (characters saying or asking something), written so they translate into simple spoken Mandarin.
- Vary how sentences begin. Never write more than two sentences in a row that start with the same subject. Mix in time words (then, later, at night), places, and reactions as openers.
- Vary sentence length: mostly short sentences, with an occasional slightly longer one for rhythm.
- Use concrete, sensory details a beginner can picture (warm sun, cold water, a red door) instead of abstract description.
- Repeat the story's key words naturally in NEW sentences so learners meet them several times, but never repeat a whole sentence verbatim.
- Use simple, common vocabulary and grammar that maps cleanly onto HSK 1 Mandarin: everyday objects, family, food, animals, home, weather. Avoid idioms, wordplay, and anything culturally untranslatable. Keep names and places consistent.

Return only the finished English story. Do not include planning notes, headings such as "Story:", Markdown fences, or commentary."""

DEFAULT_LOCALIZATION_PROMPT = """You are a meticulous Mandarin graded-reader editor and pronunciation specialist preparing Newbie (HSK 1) content.

Convert the approved English story into natural Simplified Chinese for the requested learner level. Divide it into short, narratable segments. For every segment provide:
- faithful, natural English;
- Simplified Chinese with appropriate punctuation;
- Hanyu Pinyin with tone marks, matching the Chinese exactly;
- an ordered words array that reconstructs the Chinese exactly, with contextual pinyin and English definitions for every lexical word;
- clean Chinese audio text for speech synthesis.

Level discipline for HSK 1: stay inside the HSK 1 vocabulary (~150 core words) plus at most 3-5 extra topic words that the story reuses several times; those extra words must appear in the vocabulary list. Keep sentences roughly 4-10 characters. Prefer 说 and 问 for dialogue and keep each spoken line inside its own segment. Use connectives the level allows (然后, 可是, 因为, 所以) instead of starting every sentence the same way. Never produce two segments whose Chinese is identical.

Use consistent names and vocabulary. Prefer spoken, standard Mainland Mandarin. Do not add facts or plot events. Pinyin must use tone marks rather than tone numbers. Audio text must contain Chinese only, with punctuation and no pinyin, labels, stage directions, or Markdown.
Split the Chinese into real words rather than individual characters. Include punctuation as separate word items with blank pinyin and English fields. Every definition must describe what the word means in that particular sentence.

Return one valid json object matching the supplied schema exactly."""

# Superseded default prompts. A saved settings.json that still carries one of
# these verbatim is not a real customization, so get_settings drops it and
# the current default applies.
LEGACY_DEFAULT_PROMPTS = {
    "storyPrompt": [
        """You are an expert children's fiction writer creating engaging source stories for a graded Mandarin reader.

Write a complete story in natural English. Use a clear narrative arc, concrete actions, warm character details, and an ending that feels earned. Keep the language easy to translate into beginner-friendly Mandarin: prefer direct sentences, avoid wordplay that depends on English, and keep names and locations consistent.

Return only the finished English story. Do not include planning notes, headings such as "Story:", Markdown fences, or commentary."""
    ],
    "localizationPrompt": [
        """You are a meticulous Mandarin graded-reader editor and pronunciation specialist.

Convert the approved English story into natural Simplified Chinese for the requested learner level. Divide it into short, narratable segments. For every segment provide:
- faithful, natural English;
- Simplified Chinese with appropriate punctuation;
- Hanyu Pinyin with tone marks, matching the Chinese exactly;
- an ordered words array that reconstructs the Chinese exactly, with contextual pinyin and English definitions for every lexical word;
- clean Chinese audio text for speech synthesis.

Use consistent names and vocabulary. Prefer spoken, standard Mainland Mandarin. Do not add facts or plot events. Pinyin must use tone marks rather than tone numbers. Audio text must contain Chinese only, with punctuation and no pinyin, labels, stage directions, or Markdown.
Split the Chinese into real words rather than individual characters. Include punctuation as separate word items with blank pinyin and English fields. Every definition must describe what the word means in that particular sentence.

Return one valid json object matching the supplied schema exactly."""
    ],
}

DEFAULT_SETTINGS = {
    "storyPrompt": DEFAULT_STORY_PROMPT,
    "localizationPrompt": DEFAULT_LOCALIZATION_PROMPT,
    "voice": "Vivian",
    "voiceInstruction": "Speak naturally, clearly, and warmly for a Mandarin learner.",
}

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".ico": "image/x-icon",
}


class WorkshopError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def ensure_data_dirs() -> None:
    PROJECTS_ROOT.mkdir(parents=True, exist_ok=True)


def atomic_write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary, path)


def read_json(path: Path, fallback: Any) -> Any:
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return fallback


def load_dotenv_value(name: str) -> str:
    env_value = os.environ.get(name, "").strip()
    if env_value:
        return env_value

    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return ""

    for raw_line in env_path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() != name:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        return value.strip()
    return ""


def get_deepseek_model() -> str:
    return load_dotenv_value("DEEPSEEK_MODEL") or "deepseek-v4-pro"


def get_settings() -> dict[str, Any]:
    saved = read_json(SETTINGS_FILE, {})
    settings = dict(DEFAULT_SETTINGS)
    if isinstance(saved, dict):
        for key in settings:
            value = saved.get(key)
            if not (isinstance(value, str) and value.strip()):
                continue
            legacy = LEGACY_DEFAULT_PROMPTS.get(key, [])
            if any(value.strip() == old.strip() for old in legacy):
                continue
            settings[key] = value
    return settings


def save_settings(payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    for key in settings:
        if key in payload:
            value = str(payload[key]).strip()
            if not value:
                raise WorkshopError(f"{key} cannot be empty.")
            settings[key] = value
    atomic_write_json(SETTINGS_FILE, settings)
    return settings


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:48] or "untitled-story"


def project_path(project_id: str) -> Path:
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,79}", project_id):
        raise WorkshopError("Invalid project id.")
    return PROJECTS_ROOT / project_id


def project_file(project_id: str) -> Path:
    return project_path(project_id) / "project.json"


def normalize_project(payload: dict[str, Any], existing: dict[str, Any] | None = None) -> dict[str, Any]:
    project = dict(existing or {})
    previous_story = str(project.get("englishStory") or "")
    now = utc_now()
    if not project:
        title_hint = str(payload.get("title") or payload.get("idea") or "Untitled Story")
        project_id = f"{slugify(title_hint)}-{int(time.time())}"
        project = {
            "id": project_id,
            "createdAt": now,
            "status": "draft",
            "approved": False,
            "package": None,
        }

    text_fields = (
        "title",
        "idea",
        "level",
        "length",
        "constraints",
        "englishStory",
        "revisionNotes",
    )
    for key in text_fields:
        if key in payload:
            project[key] = str(payload.get(key) or "")
        elif key not in project:
            project[key] = ""

    if "approved" in payload:
        project["approved"] = bool(payload["approved"])
    if existing and "englishStory" in payload and project["englishStory"] != previous_story:
        project["approved"] = False
        project["status"] = "review"
        project["package"] = None
        for key in (
            "checkpoint",
            "audioDurationSeconds",
            "publishedAt",
            "flutterAssetPath",
        ):
            project.pop(key, None)
    project["updatedAt"] = now
    return project


def save_project(project: dict[str, Any]) -> dict[str, Any]:
    project_id = str(project.get("id", ""))
    path = project_file(project_id)
    atomic_write_json(path, project)
    return project


def load_project(project_id: str) -> dict[str, Any]:
    project = read_json(project_file(project_id), None)
    if not isinstance(project, dict):
        raise WorkshopError("Story project not found.", 404)
    return project


def list_projects() -> list[dict[str, Any]]:
    ensure_data_dirs()
    projects: list[dict[str, Any]] = []
    for path in PROJECTS_ROOT.glob("*/project.json"):
        project = read_json(path, None)
        if not isinstance(project, dict):
            continue
        projects.append(
            {
                "id": project.get("id"),
                "title": project.get("title") or "Untitled Story",
                "status": project.get("status") or "draft",
                "updatedAt": project.get("updatedAt"),
            }
        )
    return sorted(projects, key=lambda item: item.get("updatedAt") or "", reverse=True)


def unpublish_story_assets(story_id: str) -> None:
    """Remove a story's published files from the Flutter app content.

    Tolerates partially published or already-missing files so a delete can
    also clean up dangling library entries.
    """
    story_file = FLUTTER_CONTENT_ROOT / "stories" / f"{story_id}.json"
    story_file.unlink(missing_ok=True)

    audio_root = FLUTTER_CONTENT_ROOT / "audio"
    if audio_root.is_dir():
        for audio_file in audio_root.glob(f"{story_id}_*"):
            audio_file.unlink(missing_ok=True)

    index_path = FLUTTER_CONTENT_ROOT / "index.json"
    library = read_json(index_path, None)
    if isinstance(library, dict) and isinstance(library.get("stories"), list):
        remaining = [
            story
            for story in library["stories"]
            if not (isinstance(story, dict) and story.get("id") == story_id)
        ]
        if len(remaining) != len(library["stories"]):
            library["stories"] = remaining
            atomic_write_json(index_path, library)


def delete_project(project_id: str) -> None:
    folder = project_path(project_id)
    if not (folder / "project.json").exists():
        raise WorkshopError("Story project not found.", 404)
    unpublish_story_assets(project_id)
    shutil.rmtree(folder, ignore_errors=True)


def detect_qwen_models() -> dict[str, Any]:
    candidates = [REPO_ROOT / "models", REPO_ROOT / "mandarin" / "models"]
    model_root = next((path for path in candidates if path.exists()), candidates[-1])
    expected = {
        "customVoice": "Qwen3-TTS-12Hz-1.7B-CustomVoice",
        "base": "Qwen3-TTS-12Hz-1.7B-Base",
        "tokenizer": "Qwen3-TTS-Tokenizer-12Hz",
    }
    models = {
        key: {
            "name": folder,
            "available": (model_root / folder).is_dir(),
        }
        for key, folder in expected.items()
    }
    return {
        "root": str(model_root),
        "ready": all(model["available"] for model in models.values()),
        "models": models,
    }


def deepseek_chat(
    messages: list[dict[str, str]],
    *,
    json_output: bool = False,
    max_tokens: int = 12_000,
) -> tuple[str, dict[str, Any]]:
    api_key = load_dotenv_value("DEEPSEEK_API_KEY")
    if not api_key:
        raise WorkshopError(
            "DEEPSEEK_API_KEY is missing from the repository .env file.",
            503,
        )

    payload: dict[str, Any] = {
        "model": get_deepseek_model(),
        "messages": messages,
        "thinking": {"type": "disabled"},
        "max_tokens": max_tokens,
        "stream": False,
    }
    if json_output:
        payload["response_format"] = {"type": "json_object"}

    request = urllib.request.Request(
        DEEPSEEK_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Local-Story-Workshop/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = ""
        try:
            body = json.loads(error.read().decode("utf-8"))
            detail = str(body.get("error", {}).get("message") or "")
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass
        message = f"DeepSeek returned {error.code}."
        if detail:
            message = f"{message} {detail}"
        raise WorkshopError(message, 502) from error
    except urllib.error.URLError as error:
        raise WorkshopError(f"Could not reach DeepSeek: {error.reason}", 502) from error
    except TimeoutError as error:
        raise WorkshopError("DeepSeek took too long to respond. Please try again.", 504) from error

    try:
        choice = result["choices"][0]
        content = choice["message"]["content"]
    except (KeyError, IndexError, TypeError) as error:
        raise WorkshopError("DeepSeek returned an unexpected response.", 502) from error

    if not isinstance(content, str) or not content.strip():
        raise WorkshopError("DeepSeek returned an empty response. Please try again.", 502)
    return content.strip(), result.get("usage") or {}


def create_story(project: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    if not project.get("idea", "").strip():
        raise WorkshopError("Add a story idea before generating.")

    settings = get_settings()
    request = f"""Create the English story using this brief:

Working title: {project.get("title") or "Choose a fitting title"}
Story idea: {project.get("idea")}
Mandarin learner level after translation: {project.get("level") or "HSK 1–2"}
Target length: {project.get("length") or "600–900 words"}
Additional constraints: {project.get("constraints") or "None"}

Return only the finished English story."""
    story, usage = deepseek_chat(
        [
            {"role": "system", "content": settings["storyPrompt"]},
            {"role": "user", "content": request},
        ],
        max_tokens=8_000,
    )
    project["englishStory"] = story
    project["approved"] = False
    project["status"] = "review"
    project["package"] = None
    project.pop("checkpoint", None)
    project["updatedAt"] = utc_now()
    save_project(project)
    return project, usage


def revise_story(project: dict[str, Any], instructions: str) -> tuple[dict[str, Any], dict[str, Any]]:
    story = str(project.get("englishStory") or "").strip()
    if not story:
        raise WorkshopError("Generate or write the English story first.")
    if not instructions.strip():
        raise WorkshopError("Add revision instructions first.")

    settings = get_settings()
    request = f"""Revise the English story below.

Revision instructions:
{instructions.strip()}

Current story:
{story}

Return only the complete revised English story."""
    revised, usage = deepseek_chat(
        [
            {"role": "system", "content": settings["storyPrompt"]},
            {"role": "user", "content": request},
        ],
        max_tokens=8_000,
    )
    project["englishStory"] = revised
    project["revisionNotes"] = instructions.strip()
    project["approved"] = False
    project["status"] = "review"
    project["package"] = None
    project.pop("checkpoint", None)
    project["updatedAt"] = utc_now()
    save_project(project)
    return project, usage


def strip_json_fence(content: str) -> str:
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content, flags=re.IGNORECASE)
        content = re.sub(r"\s*```$", "", content)
    return content.strip()


def validate_package(package: Any) -> dict[str, Any]:
    if not isinstance(package, dict):
        raise WorkshopError("DeepSeek did not return a story package object.", 502)
    segments = package.get("segments")
    if not isinstance(segments, list) or not segments:
        raise WorkshopError("The generated package has no story segments.", 502)

    normalized_segments = []
    for index, segment in enumerate(segments, start=1):
        if not isinstance(segment, dict):
            raise WorkshopError("A generated story segment is invalid.", 502)
        english = str(segment.get("english") or "").strip()
        chinese = str(segment.get("chinese") or "").strip()
        pinyin = str(segment.get("pinyin") or "").strip()
        audio_text = str(
            segment.get("audioText")
            or (segment.get("audio") or {}).get("text")
            or chinese
        ).strip()
        if not all((english, chinese, pinyin, audio_text)):
            raise WorkshopError(
                f"Generated segment {index} is missing English, Chinese, pinyin, or audio text.",
                502,
            )
        words = segment.get("words")
        if not isinstance(words, list) or not words:
            raise WorkshopError(
                f"Generated segment {index} is missing word definitions.",
                502,
            )
        normalized_words = []
        for word_index, word in enumerate(words, start=1):
            if not isinstance(word, dict):
                raise WorkshopError(
                    f"Generated segment {index}, word {word_index} is invalid.",
                    502,
                )
            text = str(word.get("text") or "").strip()
            word_pinyin = str(word.get("pinyin") or "").strip()
            word_english = str(word.get("english") or "").strip()
            if not text:
                raise WorkshopError(
                    f"Generated segment {index}, word {word_index} has no text.",
                    502,
                )
            punctuation = re.fullmatch(
                r"[\s，。！？；：“”‘’、,.!?;:—…（）()]+",
                text,
            )
            if not punctuation and not (word_pinyin and word_english):
                raise WorkshopError(
                    f"Generated segment {index}, word {word_index} needs pinyin and a contextual definition.",
                    502,
                )
            normalized_words.append(
                {
                    "text": text,
                    "pinyin": word_pinyin,
                    "english": word_english,
                }
            )
        reconstructed = "".join(
            word["text"] for word in normalized_words
        ).replace(" ", "")
        if reconstructed != chinese.replace(" ", ""):
            raise WorkshopError(
                f"Generated segment {index}'s word list does not reconstruct its Chinese text.",
                502,
            )
        segment_id = f"{index:03d}"
        normalized_segments.append(
            {
                "id": segment_id,
                "english": english,
                "chinese": chinese,
                "pinyin": pinyin,
                "audioText": audio_text,
                "audioFile": f"audio/{segment_id}.wav",
                "words": normalized_words,
            }
        )
    package["segments"] = normalized_segments
    return package


def localize_story(project: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    story = str(project.get("englishStory") or "").strip()
    if not story:
        raise WorkshopError("Generate or write the English story first.")
    if not project.get("approved"):
        raise WorkshopError("Approve the English story before preparing Mandarin.")

    settings = get_settings()
    schema = {
        "schemaVersion": 1,
        "title": {
            "english": "Story title",
            "chinese": "中文标题",
            "pinyin": "Zhōngwén biāotí",
        },
        "level": project.get("level") or "HSK 1–2",
        "summary": {
            "english": "One sentence summary",
            "chinese": "一句话摘要。",
            "pinyin": "Yí jù huà zhāiyào.",
        },
        "segments": [
            {
                "id": "001",
                "english": "Natural English translation.",
                "chinese": "适合学习者的中文。",
                "pinyin": "Shìhé xuéxízhě de Zhōngwén.",
                "audioText": "适合学习者的中文。",
                "words": [
                    {
                        "text": "适合",
                        "pinyin": "shìhé",
                        "english": "suitable for",
                    },
                    {
                        "text": "学习者",
                        "pinyin": "xuéxízhě",
                        "english": "learner",
                    },
                    {
                        "text": "的",
                        "pinyin": "de",
                        "english": "possessive particle",
                    },
                    {
                        "text": "中文",
                        "pinyin": "Zhōngwén",
                        "english": "Chinese language",
                    },
                    {"text": "。", "pinyin": "", "english": ""},
                ],
            }
        ],
        "vocabulary": [
            {
                "simplified": "故事",
                "pinyin": "gùshi",
                "english": "story",
            }
        ],
    }
    request = f"""Return a valid json object for this approved story.

Learner level: {project.get("level") or "HSK 1–2"}
Use this exact JSON shape and key names:
{json.dumps(schema, ensure_ascii=False, indent=2)}

Requirements:
- Preserve the full story without skipping events.
- Make each segment short enough for one audio clip, usually 1–3 Chinese sentences.
- Use sequential three-digit segment ids.
- Include 8–20 useful vocabulary items.
- The English field in every segment is a natural translation of that Chinese segment.
- In every words array, use real lexical words in exact reading order. The text values, including punctuation, must concatenate to the segment's Chinese field exactly.
- Give every non-punctuation word tone-mark pinyin and its context-specific English meaning. Punctuation items must have blank pinyin and English.

Approved English story:
{story}"""
    content, usage = deepseek_chat(
        [
            {"role": "system", "content": settings["localizationPrompt"]},
            {"role": "user", "content": request},
        ],
        json_output=True,
        max_tokens=16_000,
    )
    try:
        package = json.loads(strip_json_fence(content))
    except json.JSONDecodeError as error:
        raise WorkshopError("DeepSeek returned malformed JSON. Please try again.", 502) from error
    package = validate_package(package)

    package["schemaVersion"] = 1
    package["storyId"] = project["id"]
    package["level"] = project.get("level") or package.get("level") or "HSK 1–2"
    package["source"] = {
        "approvedEnglish": story,
        "generatedAt": utc_now(),
        "model": get_deepseek_model(),
    }

    model_status = detect_qwen_models()
    audio_manifest = {
        "schemaVersion": 1,
        "storyId": project["id"],
        "engine": "Qwen3-TTS",
        "modelRoot": model_status["root"],
        "customVoiceModel": model_status["models"]["customVoice"]["name"],
        "baseModel": model_status["models"]["base"]["name"],
        "tokenizer": model_status["models"]["tokenizer"]["name"],
        "voice": settings["voice"],
        "language": "Chinese",
        "ready": model_status["ready"],
        "items": [
            {
                "id": segment["id"],
                "text": segment["audioText"],
                "output": segment["audioFile"],
            }
            for segment in package["segments"]
        ],
    }
    package["audio"] = {
        "engine": audio_manifest["engine"],
        "voice": audio_manifest["voice"],
        "language": audio_manifest["language"],
        "manifest": "audio_manifest.json",
    }

    folder = project_path(project["id"])
    atomic_write_json(folder / "story.json", package)
    atomic_write_json(folder / "audio_manifest.json", audio_manifest)
    (folder / "english.txt").write_text(story + "\n", encoding="utf-8")
    (folder / "audio").mkdir(exist_ok=True)

    project["package"] = package
    project["status"] = "files_ready"
    for key in (
        "checkpoint",
        "audioDurationSeconds",
        "publishedAt",
        "flutterAssetPath",
    ):
        project.pop(key, None)
    project["updatedAt"] = utc_now()
    save_project(project)
    return project, usage


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def checkpoint_project_files(project: dict[str, Any]) -> dict[str, Any]:
    package = project.get("package")
    if not isinstance(package, dict):
        raise WorkshopError("Create the Mandarin story files before checkpointing.")

    folder = project_path(project["id"])
    story_path = folder / "story.json"
    manifest_path = folder / "audio_manifest.json"
    if not story_path.is_file() or not manifest_path.is_file():
        raise WorkshopError("The story files are incomplete. Recreate the Mandarin package.")

    checkpoint = {
        "schemaVersion": 1,
        "projectId": project["id"],
        "createdAt": utc_now(),
        "storyFile": "story.json",
        "storySha256": file_sha256(story_path),
        "audioManifestFile": "audio_manifest.json",
        "audioManifestSha256": file_sha256(manifest_path),
    }
    atomic_write_json(folder / "checkpoint.json", checkpoint)
    project["checkpoint"] = checkpoint
    project["status"] = "checkpointed"
    project["updatedAt"] = utc_now()
    save_project(project)
    return project


def synthesize_project_audio(project: dict[str, Any]) -> dict[str, Any]:
    package = project.get("package")
    if not isinstance(package, dict):
        raise WorkshopError("Create the Mandarin package before generating audio.")

    folder = project_path(project["id"])
    checkpoint = read_json(folder / "checkpoint.json", None)
    if not isinstance(checkpoint, dict):
        raise WorkshopError("Save a story checkpoint before generating audio.")
    story_path = folder / "story.json"
    if (
        not story_path.is_file()
        or checkpoint.get("storySha256") != file_sha256(story_path)
    ):
        raise WorkshopError(
            "The story files changed after the checkpoint. Save a new checkpoint."
        )
    manifest_path = folder / "audio_manifest.json"
    manifest = read_json(manifest_path, None)
    if not isinstance(manifest, dict):
        raise WorkshopError("The audio manifest is missing. Recreate the Mandarin package.")

    model_status = detect_qwen_models()
    if not model_status["ready"]:
        raise WorkshopError("The local Qwen model folders are incomplete.", 503)

    model_path = (
        Path(model_status["root"])
        / model_status["models"]["customVoice"]["name"]
    )
    try:
        generated_items = synthesize_items(
            model_path=model_path,
            items=manifest.get("items") or [],
            output_dir=folder / "audio",
            speaker=str(manifest.get("voice") or get_settings()["voice"]),
            instruct=get_settings()["voiceInstruction"],
        )
    except Exception as error:
        raise WorkshopError(f"Qwen audio generation failed: {error}", 500) from error

    manifest["items"] = generated_items
    manifest["ready"] = True
    manifest["generatedAt"] = utc_now()
    manifest["durationSeconds"] = round(
        sum(float(item.get("durationSeconds") or 0) for item in generated_items),
        3,
    )
    atomic_write_json(manifest_path, manifest)

    audio_files = {item["id"]: item["output"] for item in generated_items}
    for segment in package.get("segments") or []:
        if segment.get("id") in audio_files:
            segment["audioFile"] = audio_files[segment["id"]]
    atomic_write_json(folder / "story.json", package)

    project["package"] = package
    project["status"] = "audio_ready"
    project["audioDurationSeconds"] = manifest["durationSeconds"]
    project["updatedAt"] = utc_now()
    save_project(project)
    return project


# Speed variants generated at publish time with ffmpeg so the reader can play
# genuinely slowed audio instead of asking the browser to time-stretch, which
# sounds choppy. Keys are filename suffixes, values are atempo factors (both
# within ffmpeg's single-filter atempo range of [0.5, 100]).
SLOW_VARIANTS = {"r075": "0.75", "r050": "0.5"}


def generate_slow_variants(source: Path) -> dict[str, str]:
    """Generate slowed WAVs next to *source*.

    Returns a mapping of speed (e.g. "0.75") to the variant file name. Missing
    ffmpeg or a failed conversion skips that variant instead of failing the
    publish; the app falls back to browser-side rate adjustment.
    """
    variants: dict[str, str] = {}
    for suffix, atempo in SLOW_VARIANTS.items():
        target = source.with_name(f"{source.stem}_{suffix}{source.suffix}")
        command = [
            "ffmpeg",
            "-y",
            "-i",
            str(source),
            "-filter:a",
            f"atempo={atempo}",
            "-ar",
            "24000",
            "-c:a",
            "pcm_s16le",
            str(target),
        ]
        try:
            result = subprocess.run(command, capture_output=True)
        except FileNotFoundError:
            print("ffmpeg not found; skipping slow audio variants.")
            return variants
        if result.returncode != 0:
            detail = result.stderr.decode("utf-8", "replace").strip()[-300:]
            print(f"ffmpeg failed for {target.name}: {detail}")
            continue
        variants[atempo] = target.name
    return variants


def publish_project_to_flutter(project: dict[str, Any]) -> dict[str, Any]:
    package = project.get("package")
    if not isinstance(package, dict):
        raise WorkshopError("Create the Mandarin package before publishing.")

    source_folder = project_path(project["id"])
    manifest = read_json(source_folder / "audio_manifest.json", None)
    if not isinstance(manifest, dict) or not manifest.get("generatedAt"):
        raise WorkshopError("Generate the Qwen audio before publishing.")

    target_story = FLUTTER_CONTENT_ROOT / "stories" / f"{project['id']}.json"
    target_audio = FLUTTER_CONTENT_ROOT / "audio"
    target_audio.mkdir(parents=True, exist_ok=True)
    published_audio_files: dict[str, str] = {}
    published_audio_variants: dict[str, dict[str, str]] = {}
    for item in manifest.get("items") or []:
        relative_output = str(item.get("output") or "")
        source_audio = source_folder / relative_output
        if not source_audio.is_file():
            raise WorkshopError(f"Audio file is missing: {relative_output}")
        published_name = f"{project['id']}_{source_audio.name}"
        published_path = target_audio / published_name
        shutil.copy2(source_audio, published_path)
        item_id = str(item.get("id") or "")
        published_audio_files[item_id] = (
            f"assets/content/audio/{published_name}"
        )
        variants = generate_slow_variants(published_path)
        if variants:
            published_audio_variants[item_id] = {
                speed: f"assets/content/audio/{name}"
                for speed, name in variants.items()
            }

    published_package = json.loads(json.dumps(package))
    for segment in published_package.get("segments") or []:
        segment_id = str(segment.get("id") or "")
        published_audio = published_audio_files.get(segment_id)
        if published_audio:
            segment["audioFile"] = published_audio
        variants = published_audio_variants.get(segment_id)
        if variants:
            segment["audioVariants"] = variants
    published_package["publishedAt"] = utc_now()
    published_package["audio"]["durationSeconds"] = manifest.get(
        "durationSeconds",
        0,
    )
    atomic_write_json(target_story, published_package)

    index_path = FLUTTER_CONTENT_ROOT / "index.json"
    library = read_json(index_path, {"schemaVersion": 1, "stories": []})
    if not isinstance(library, dict):
        library = {"schemaVersion": 1, "stories": []}
    stories = library.get("stories")
    if not isinstance(stories, list):
        stories = []

    title = published_package.get("title") or {}
    summary = published_package.get("summary") or {}
    entry = {
        "id": project["id"],
        "path": f"assets/content/stories/{project['id']}.json",
        "titleEnglish": (
            title.get("english") or project.get("title") or "Untitled Story"
        ),
        "titleChinese": title.get("chinese") or "",
        "titlePinyin": title.get("pinyin") or "",
        "summaryEnglish": summary.get("english") or "",
        "summaryChinese": summary.get("chinese") or "",
        "level": (
            published_package.get("level")
            or project.get("level")
            or "HSK 1–2"
        ),
        "segmentCount": len(published_package.get("segments") or []),
        "durationSeconds": round(float(manifest.get("durationSeconds") or 0)),
        "publishedAt": published_package["publishedAt"],
    }
    stories = [story for story in stories if story.get("id") != project["id"]]
    stories.insert(0, entry)
    library["schemaVersion"] = 1
    library["stories"] = stories
    atomic_write_json(index_path, library)

    project["package"] = published_package
    project["status"] = "published"
    project["publishedAt"] = published_package["publishedAt"]
    project["flutterAssetPath"] = str(target_story)
    project["updatedAt"] = utc_now()
    save_project(project)
    return project


def open_project_folder(project_id: str) -> None:
    folder = project_path(project_id)
    folder.mkdir(parents=True, exist_ok=True)
    if os.name == "nt":
        os.startfile(folder)  # type: ignore[attr-defined]
    elif sys.platform == "darwin":
        subprocess.Popen(["open", str(folder)])
    else:
        subprocess.Popen(["xdg-open", str(folder)])


class WorkshopHandler(BaseHTTPRequestHandler):
    server_version = "StoryWorkshop/1.0"

    def log_message(self, format: str, *args: Any) -> None:
        print(f"[{self.log_date_time_string()}] {format % args}")

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, value: Any, status: int = 200) -> None:
        data = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def read_json_body(self) -> dict[str, Any]:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise WorkshopError("Invalid request length.") from error
        if length <= 0 or length > 2_000_000:
            raise WorkshopError("Invalid request body.")
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise WorkshopError("Request body must be valid JSON.") from error
        if not isinstance(payload, dict):
            raise WorkshopError("Request body must be an object.")
        return payload

    def route_parts(self) -> list[str]:
        return [part for part in urlparse(self.path).path.split("/") if part]

    def handle_error(self, error: Exception) -> None:
        if isinstance(error, WorkshopError):
            self.send_json({"error": str(error)}, error.status)
            return
        print(f"Unexpected error: {error!r}")
        self.send_json({"error": "The local workshop hit an unexpected error."}, 500)

    def do_GET(self) -> None:
        try:
            parts = self.route_parts()
            if parts and parts[0] == "api":
                self.handle_api_get(parts)
            else:
                self.serve_static()
        except Exception as error:
            self.handle_error(error)

    def do_POST(self) -> None:
        try:
            self.handle_api_post(self.route_parts(), self.read_json_body())
        except Exception as error:
            self.handle_error(error)

    def do_PUT(self) -> None:
        try:
            self.handle_api_put(self.route_parts(), self.read_json_body())
        except Exception as error:
            self.handle_error(error)

    def do_DELETE(self) -> None:
        try:
            parts = self.route_parts()
            if len(parts) == 3 and parts[:2] == ["api", "projects"]:
                delete_project(parts[2])
                self.send_json({"ok": True, "projects": list_projects()})
                return
            raise WorkshopError("API route not found.", 404)
        except Exception as error:
            self.handle_error(error)

    def handle_api_get(self, parts: list[str]) -> None:
        if parts == ["api", "bootstrap"]:
            projects = list_projects()
            active = load_project(projects[0]["id"]) if projects else None
            self.send_json(
                {
                    "settings": get_settings(),
                    "api": {
                        "configured": bool(load_dotenv_value("DEEPSEEK_API_KEY")),
                        "model": get_deepseek_model(),
                    },
                    "qwen": detect_qwen_models(),
                    "projects": projects,
                    "activeProject": active,
                }
            )
            return
        if len(parts) == 3 and parts[:2] == ["api", "projects"]:
            self.send_json({"project": load_project(parts[2])})
            return
        if (
            len(parts) == 5
            and parts[:2] == ["api", "projects"]
            and parts[3] == "export"
        ):
            filename = {
                "story": "story.json",
                "audio": "audio_manifest.json",
                "english": "english.txt",
            }.get(parts[4])
            if not filename:
                raise WorkshopError("Unknown export type.", 404)
            path = project_path(parts[2]) / filename
            if not path.exists():
                raise WorkshopError("Generate the Mandarin package before exporting.", 404)
            data = path.read_bytes()
            content_type = "application/json; charset=utf-8" if path.suffix == ".json" else "text/plain; charset=utf-8"
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        raise WorkshopError("API route not found.", 404)

    def handle_api_post(self, parts: list[str], payload: dict[str, Any]) -> None:
        if parts == ["api", "projects"]:
            project = save_project(normalize_project(payload))
            self.send_json({"project": project}, 201)
            return
        if len(parts) == 4 and parts[:2] == ["api", "projects"]:
            project = load_project(parts[2])
            action = parts[3]
            if action == "generate":
                project = normalize_project(payload, project)
                project, usage = create_story(project)
                self.send_json({"project": project, "usage": usage})
                return
            if action == "revise":
                project = normalize_project(payload, project)
                project, usage = revise_story(project, str(payload.get("instructions") or ""))
                self.send_json({"project": project, "usage": usage})
                return
            if action == "approve":
                project = normalize_project(payload, project)
                if not project.get("englishStory", "").strip():
                    raise WorkshopError("Write or generate the English story first.")
                project["approved"] = True
                project["status"] = "approved"
                project["updatedAt"] = utc_now()
                save_project(project)
                self.send_json({"project": project})
                return
            if action == "localize":
                project = normalize_project(payload, project)
                project, usage = localize_story(project)
                self.send_json({"project": project, "usage": usage})
                return
            if action == "checkpoint":
                project = normalize_project(payload, project)
                project = checkpoint_project_files(project)
                self.send_json({"project": project})
                return
            if action == "synthesize":
                project = normalize_project(payload, project)
                project = synthesize_project_audio(project)
                self.send_json({"project": project})
                return
            if action == "publish":
                project = normalize_project(payload, project)
                project = publish_project_to_flutter(project)
                self.send_json({"project": project})
                return
            if action == "open-folder":
                open_project_folder(project["id"])
                self.send_json({"ok": True})
                return
        raise WorkshopError("API route not found.", 404)

    def handle_api_put(self, parts: list[str], payload: dict[str, Any]) -> None:
        if parts == ["api", "settings"]:
            self.send_json({"settings": save_settings(payload)})
            return
        if len(parts) == 3 and parts[:2] == ["api", "projects"]:
            project = normalize_project(payload, load_project(parts[2]))
            save_project(project)
            self.send_json({"project": project})
            return
        raise WorkshopError("API route not found.", 404)

    def serve_static(self) -> None:
        request_path = unquote(urlparse(self.path).path)
        relative = request_path.lstrip("/") or "index.html"
        target = (STATIC_ROOT / relative).resolve()
        try:
            target.relative_to(STATIC_ROOT.resolve())
        except ValueError as error:
            raise WorkshopError("File not found.", 404) from error
        if not target.is_file():
            target = STATIC_ROOT / "index.html"
        data = target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", MIME_TYPES.get(target.suffix, "application/octet-stream"))
        if target.suffix == ".html":
            self.send_header(
                "Content-Security-Policy",
                "default-src 'self'; script-src 'self'; style-src 'self'; "
                "img-src 'self' data:; connect-src 'self'; base-uri 'none'; "
                "frame-ancestors 'none'; form-action 'self'",
            )
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the local Story Workshop.")
    parser.add_argument("--open", action="store_true", help="Open the workshop in a browser.")
    parser.add_argument("--port", type=int, default=PORT)
    args = parser.parse_args()

    missing_modules = missing_runtime_modules()
    if missing_modules:
        print()
        print("Story Workshop cannot start with this Python installation.")
        print(f"Missing TTS modules: {', '.join(missing_modules)}")
        print(f"Python executable: {sys.executable}")
        print("Run launch_workshop.bat so it can select the configured Python 3.10 runtime.")
        print()
        raise SystemExit(1)

    ensure_data_dirs()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), WorkshopHandler)
    url = f"http://127.0.0.1:{args.port}"
    if args.open:
        threading.Timer(0.7, lambda: webbrowser.open(url)).start()

    print()
    print("Story Workshop is running locally.")
    print(f"Open: {url}")
    print("Close this window or press Ctrl+C to stop it.")
    print()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        print("Story Workshop stopped.")


if __name__ == "__main__":
    main()
