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

import script_convert
import tocfl
from tts_engine import missing_runtime_modules, synthesize_items


ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent
STATIC_ROOT = ROOT / "static"
DATA_ROOT = ROOT / ".workshop"
PROJECTS_ROOT = DATA_ROOT / "projects"
BOOKS_ROOT = DATA_ROOT / "books"
SETTINGS_FILE = DATA_ROOT / "settings.json"
MANDARIN_ROOT = REPO_ROOT / "mandarin"
FLUTTER_CONTENT_ROOT = MANDARIN_ROOT / "assets" / "content"
PORT = 8766
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

DEFAULT_STORY_PROMPT = """You are an expert writer of graded readers for learners of Taiwan Mandarin.

Write a complete story in natural English that will be translated into Taiwan Mandarin at the requested learner level. The story must be genuinely engaging, not a flat list of actions:
- Give the main character one small, concrete want or problem in the first few lines, an attempt that does not immediately work, and a warm resolution that feels earned.
- Include at least two short dialogue exchanges (characters saying or asking something), written so they translate into simple spoken Mandarin.
- Vary sentence length: mostly short sentences, with an occasional slightly longer one for rhythm.
- Use concrete, sensory details a beginner can picture (warm sun, cold water, a red door) instead of abstract description.
- Repeat the story's key words and actions in NEW sentences so learners meet them several times, but never repeat a whole sentence verbatim.
- Use simple, common vocabulary and grammar: everyday objects, family, food, animals, home, weather. Avoid idioms, wordplay, and anything culturally untranslatable. Keep names and places consistent.
- Where the story needs a setting, prefer everyday Taiwan: a night market, a convenience store, a bus or the MRT, a lunchbox, rain in the afternoon, a scooter, a temple, a bubble tea shop. Keep it ordinary rather than touristic, and never require a word the level cannot afford.

The brief carries level rules. Those rules are binding and override anything above them when the two disagree.

Return only the finished English story. Do not include planning notes, headings such as "Story:", Markdown fences, or commentary."""

DEFAULT_LOCALIZATION_PROMPT = """You are a meticulous Taiwan Mandarin graded-reader editor and pronunciation specialist.

Convert the approved English story into natural Taiwan Mandarin, written in Traditional characters (正體字), for the requested learner level. Divide it into short, narratable segments. For every segment provide:
- faithful, natural English;
- Traditional Chinese with appropriate punctuation;
- Hanyu Pinyin with tone marks, matching the Chinese exactly and using Taiwan-standard readings;
- an ordered words array that reconstructs the Chinese exactly, with contextual pinyin and English definitions for every lexical word;
- clean Chinese audio text for speech synthesis.

The request carries a vocabulary budget for the level. Treat it as a hard limit rather than a suggestion: it is what makes the story readable at that level. Prefer rewriting a sentence with words you are allowed to use over reaching for a word outside the budget.

Write the Mandarin of Taiwan, not of the mainland. The request lists the specific readings, words, and grammar rules this requires; they are binding. Writing mainland vocabulary in Traditional characters is the most common way this task goes wrong, so check each word against the Taiwan usage list before using it.

Use consistent names and vocabulary. Do not add facts or plot events. Pinyin must use tone marks rather than tone numbers. Audio text must contain Chinese only, with punctuation and no pinyin, labels, stage directions, or Markdown.
Split the Chinese into real words rather than individual characters. Include punctuation as separate word items with blank pinyin and English fields. Every definition must describe what the word means in that particular sentence.

Return one valid json object matching the supplied schema exactly."""

# Superseded default prompts. A saved settings.json that still carries one of
# these verbatim is not a real customization, so get_settings drops it and
# the current default applies.
LEGACY_DEFAULT_PROMPTS = {
    "storyPrompt": [
        # The Simplified/HSK era, before the move to Taiwan Mandarin and TOCFL.
        """You are an expert writer of graded readers for Mandarin learners, in the style of Du Chinese.

Write a complete story in natural English that will be translated into Chinese at the requested learner level. The story must be genuinely engaging, not a flat list of actions:
- Give the main character one small, concrete want or problem in the first few lines, an attempt that does not immediately work, and a warm resolution that feels earned.
- Include at least two short dialogue exchanges (characters saying or asking something), written so they translate into simple spoken Mandarin.
- Vary sentence length: mostly short sentences, with an occasional slightly longer one for rhythm.
- Use concrete, sensory details a beginner can picture (warm sun, cold water, a red door) instead of abstract description.
- Repeat the story's key words and actions in NEW sentences so learners meet them several times, but never repeat a whole sentence verbatim.
- Use simple, common vocabulary and grammar: everyday objects, family, food, animals, home, weather. Avoid idioms, wordplay, and anything culturally untranslatable. Keep names and places consistent.

The brief carries level rules. Those rules are binding and override anything above them when the two disagree.

Return only the finished English story. Do not include planning notes, headings such as "Story:", Markdown fences, or commentary.""",
        """You are an expert writer of graded readers for absolute beginners in Mandarin, in the style of Du Chinese Newbie stories.

Write a complete story in natural English that will be translated into HSK 1 level Chinese. The story must be genuinely engaging, not a flat list of actions:
- Give the main character one small, concrete want or problem in the first few lines, an attempt that does not immediately work, and a warm resolution that feels earned.
- Include at least two short dialogue exchanges (characters saying or asking something), written so they translate into simple spoken Mandarin.
- Vary how sentences begin. Never write more than two sentences in a row that start with the same subject. Mix in time words (then, later, at night), places, and reactions as openers.
- Vary sentence length: mostly short sentences, with an occasional slightly longer one for rhythm.
- Use concrete, sensory details a beginner can picture (warm sun, cold water, a red door) instead of abstract description.
- Repeat the story's key words naturally in NEW sentences so learners meet them several times, but never repeat a whole sentence verbatim.
- Use simple, common vocabulary and grammar that maps cleanly onto HSK 1 Mandarin: everyday objects, family, food, animals, home, weather. Avoid idioms, wordplay, and anything culturally untranslatable. Keep names and places consistent.

Return only the finished English story. Do not include planning notes, headings such as "Story:", Markdown fences, or commentary.""",
        """You are an expert children's fiction writer creating engaging source stories for a graded Mandarin reader.

Write a complete story in natural English. Use a clear narrative arc, concrete actions, warm character details, and an ending that feels earned. Keep the language easy to translate into beginner-friendly Mandarin: prefer direct sentences, avoid wordplay that depends on English, and keep names and locations consistent.

Return only the finished English story. Do not include planning notes, headings such as "Story:", Markdown fences, or commentary."""
    ],
    "localizationPrompt": [
        # The Simplified/HSK era, before the move to Taiwan Mandarin and TOCFL.
        """You are a meticulous Mandarin graded-reader editor and pronunciation specialist.

Convert the approved English story into natural Simplified Chinese for the requested learner level. Divide it into short, narratable segments. For every segment provide:
- faithful, natural English;
- Simplified Chinese with appropriate punctuation;
- Hanyu Pinyin with tone marks, matching the Chinese exactly;
- an ordered words array that reconstructs the Chinese exactly, with contextual pinyin and English definitions for every lexical word;
- clean Chinese audio text for speech synthesis.

The request carries a vocabulary budget for the level. Treat it as a hard limit rather than a suggestion: it is what makes the story readable at that level. Prefer rewriting a sentence with words you are allowed to use over reaching for a word outside the budget.

Use consistent names and vocabulary. Prefer spoken, standard Mainland Mandarin. Do not add facts or plot events. Pinyin must use tone marks rather than tone numbers. Audio text must contain Chinese only, with punctuation and no pinyin, labels, stage directions, or Markdown.
Split the Chinese into real words rather than individual characters. Include punctuation as separate word items with blank pinyin and English fields. Every definition must describe what the word means in that particular sentence.

Return one valid json object matching the supplied schema exactly.""",
        """You are a meticulous Mandarin graded-reader editor and pronunciation specialist preparing Newbie (HSK 1) content.

Convert the approved English story into natural Simplified Chinese for the requested learner level. Divide it into short, narratable segments. For every segment provide:
- faithful, natural English;
- Simplified Chinese with appropriate punctuation;
- Hanyu Pinyin with tone marks, matching the Chinese exactly;
- an ordered words array that reconstructs the Chinese exactly, with contextual pinyin and English definitions for every lexical word;
- clean Chinese audio text for speech synthesis.

Level discipline for HSK 1: stay inside the HSK 1 vocabulary (~150 core words) plus at most 3-5 extra topic words that the story reuses several times; those extra words must appear in the vocabulary list. Keep sentences roughly 4-10 characters. Prefer 说 and 问 for dialogue and keep each spoken line inside its own segment. Use connectives the level allows (然后, 可是, 因为, 所以) instead of starting every sentence the same way. Never produce two segments whose Chinese is identical.

Use consistent names and vocabulary. Prefer spoken, standard Mainland Mandarin. Do not add facts or plot events. Pinyin must use tone marks rather than tone numbers. Audio text must contain Chinese only, with punctuation and no pinyin, labels, stage directions, or Markdown.
Split the Chinese into real words rather than individual characters. Include punctuation as separate word items with blank pinyin and English fields. Every definition must describe what the word means in that particular sentence.

Return one valid json object matching the supplied schema exactly.""",
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

MIN_CHAPTERS = 4
MAX_CHAPTERS = 12
DEFAULT_CHAPTERS = 12

# How long the English draft should run, per TOCFL level key. The English is
# always longer than the Chinese it becomes.
DRAFT_LENGTHS = {
    "NOVICE1": "100–180 words",
    "NOVICE2": "120–220 words",
    "LEVEL1": "200–330 words",
    "LEVEL2": "300–460 words",
    "LEVEL3": "400–620 words",
}

# Plain-English names for the TOCFL core verbs, used to steer the English draft
# before any Chinese exists.
TOCFL_ACTION_GLOSSES = (
    "be",
    "have",
    "not have",
    "be at a place",
    "go",
    "come",
    "eat",
    "drink",
    "look at",
    "say",
    "ask",
    "be called",
    "think",
    "want",
    "like",
    "know how to",
    "be able to",
    "may",
    "buy",
    "do",
    "sit",
    "stand",
    "live",
    "sleep",
    "return",
    "open",
    "listen",
    "study",
    "write",
    "walk",
    "look for",
    "give",
    "know",
    "wait",
    "take",
)


def draft_length(level: Any) -> str:
    return DRAFT_LENGTHS.get(tocfl.normalize(level), "300–500 words")


def budgeted_story_rules(level: tocfl.Level) -> str:
    """English-draft rules for a level that ships a full word budget."""
    return f"""This is a {level.label} ({level.chinese}) story. It will be translated using a budget of about {level.vocabulary} Taiwan Mandarin words, so the English has to be written to survive that translation.

- Write 12–20 short sentences, landing at roughly {level.characters} Chinese characters once translated. One idea per sentence; almost every sentence is a subject, a verb, and an object.
- Choose 5–8 actions for the whole story and use each of them at least three times, in different sentences. These are the only actions the story needs: {", ".join(TOCFL_ACTION_GLOSSES)}.
- Aim for about three uses of every word you introduce. A chapter at this level runs its running text over only {level.distinct_words} different words, and its commonest verb appears five or more times.
- Repetition with one thing changed is the point of this level, not a flaw. Reuse a sentence shape across a list of days, places, or people ("On Monday I ate at the shop. On Tuesday the shop had no food.") so the learner meets the same words in a new place.
- Introduce at most 3–5 new topic words beyond the level's everyday vocabulary, and use each of them at least three times.
- Keep throwaway words down: no more than about a third of the different words in the story may appear only once.
- Stay concrete and physical: eat, drink, sleep, look, go, come, buy, sit, want, like, have. No metaphor, no inner monologue, no abstract nouns (freedom, memory, courage).
- Keep the cast to two or three characters with short names, and refer to them the same way every time.
- Dialogue must be plain spoken lines: "I want to eat." "Can I eat here?" "Yes." Nothing indirect.
- Do not repeat a whole sentence word for word; change at least one word each time."""


def budgeted_localization_rules(level: tocfl.Level) -> str:
    """Localization rules for a level that ships a full word budget."""
    return f"""Vocabulary budget for {level.label} ({level.chinese}, {level.cefr}). Use these words, with exactly the readings given:
{tocfl.word_budget_text(level.key)}

- Anything outside that list counts as a new word. Allow at most 5 new words in the whole story, each used at least three times, and list every one of them in the vocabulary array.
- The pinyin above is Taiwan-standard. Where it differs from the mainland reading you may know, the list wins.
- Target the density of a graded chapter at this level: {level.characters} Chinese characters, {level.distinct_words} different words, and at least 2.5 uses per different word. Fewer than a third of the different words may appear only once.
- Lean hard on these core verbs and reuse them across the story rather than reaching for synonyms: {tocfl.core_verbs_text()}
- Recycle these sentence patterns: {tocfl.patterns_text()}
- Keep segments to roughly 4–12 characters. Split long sentences instead of adding conjunctions.
- Prefer 說 and 問 for dialogue and keep each spoken line in its own segment.
- Never produce two segments whose Chinese is identical.
- Numbers, days of the week, and family words are all inside the budget; use them freely for repetition."""


def open_level_rules(level: tocfl.Level) -> str:
    """Localization rules for a band too large to paste a word list for."""
    return f"""Level: {level.label} ({level.chinese}, {level.cefr}), which assumes about {level.vocabulary} words.

- Stay inside the vocabulary a learner at this level knows, plus a handful of topic words that the story reuses several times; those extra words must appear in the vocabulary array.
- Target roughly {level.characters} Chinese characters over {level.distinct_words} different words.
- Use connectives the level allows instead of starting every sentence the same way.
- Never produce two segments whose Chinese is identical."""


def taiwan_rules() -> str:
    """The Taiwan-versus-mainland rules that every localization must follow."""
    return f"""Taiwan Mandarin rules (binding):
{tocfl.taiwan_style_text()}

Use the Taiwan word, not the mainland one: {tocfl.taiwan_lexicon_text()}"""


def story_level_rules(level: Any) -> str:
    resolved = tocfl.level_for(level)
    if resolved.words is not None:
        return budgeted_story_rules(resolved)
    return (
        f"This is a {resolved.label} ({resolved.chinese}, {resolved.cefr}) "
        f"story, translated with about {resolved.vocabulary} words available. "
        "Keep the grammar and vocabulary within reach of a learner at this "
        "level, and reuse the story's key words in new sentences."
    )


def localization_level_rules(level: Any) -> str:
    resolved = tocfl.level_for(level)
    if resolved.words is not None:
        body = budgeted_localization_rules(resolved)
    else:
        body = open_level_rules(resolved)
    return f"{body}\n\n{taiwan_rules()}"


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
    BOOKS_ROOT.mkdir(parents=True, exist_ok=True)


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

    # Chapter projects carry their book reference for the whole pipeline; the
    # editing form never sends it, so an absent key must not clear it.
    if isinstance(payload.get("book"), dict):
        project["book"] = payload["book"]

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
        book = project.get("book") if isinstance(project.get("book"), dict) else None
        projects.append(
            {
                "id": project.get("id"),
                "title": project.get("title") or "Untitled Story",
                "status": project.get("status") or "draft",
                "updatedAt": project.get("updatedAt"),
                "book": book,
            }
        )
    return sorted(projects, key=lambda item: item.get("updatedAt") or "", reverse=True)


def book_path(book_id: str) -> Path:
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,79}", book_id):
        raise WorkshopError("Invalid book id.")
    return BOOKS_ROOT / book_id


def book_file(book_id: str) -> Path:
    return book_path(book_id) / "book.json"


def load_book(book_id: str) -> dict[str, Any]:
    book = read_json(book_file(book_id), None)
    if not isinstance(book, dict):
        raise WorkshopError("Book not found.", 404)
    return book


def save_book(book: dict[str, Any]) -> dict[str, Any]:
    book["updatedAt"] = utc_now()
    atomic_write_json(book_file(str(book.get("id", ""))), book)
    return book


def list_books() -> list[dict[str, Any]]:
    BOOKS_ROOT.mkdir(parents=True, exist_ok=True)
    books: list[dict[str, Any]] = []
    for path in BOOKS_ROOT.glob("*/book.json"):
        book = read_json(path, None)
        if not isinstance(book, dict):
            continue
        chapters = book.get("chapters") or []
        books.append(
            {
                "id": book.get("id"),
                "titleEnglish": book.get("titleEnglish") or "Untitled Book",
                "titleChinese": book.get("titleChinese") or "",
                "level": book.get("level") or "",
                "chapterCount": len(chapters),
                "updatedAt": book.get("updatedAt"),
            }
        )
    return sorted(books, key=lambda item: item.get("updatedAt") or "", reverse=True)


def book_reference(book: dict[str, Any], chapter: dict[str, Any]) -> dict[str, Any]:
    """The slice of a book that travels with one chapter's project and, later,
    into the published library entry."""
    return {
        "id": book.get("id"),
        "titleEnglish": book.get("titleEnglish") or "",
        "titleChinese": book.get("titleChinese") or "",
        "titlePinyin": book.get("titlePinyin") or "",
        "summaryEnglish": book.get("summaryEnglish") or "",
        "chapterNumber": int(chapter.get("number") or 0),
        "chapterCount": int(book.get("chapterCount") or len(book.get("chapters") or [])),
        "chapterTitleEnglish": chapter.get("titleEnglish") or "",
        "chapterTitleChinese": chapter.get("titleChinese") or "",
    }


def book_context_text(project: dict[str, Any]) -> str:
    """Continuity briefing for one chapter: the book's cast, its shared word
    budget, what already happened, and what this chapter has to cover."""
    reference = project.get("book")
    if not isinstance(reference, dict) or not reference.get("id"):
        return ""
    try:
        book = load_book(str(reference["id"]))
    except WorkshopError:
        return ""

    number = int(reference.get("chapterNumber") or 0)
    chapters = [
        chapter
        for chapter in (book.get("chapters") or [])
        if isinstance(chapter, dict)
    ]
    current = next(
        (chapter for chapter in chapters if int(chapter.get("number") or 0) == number),
        None,
    )
    previous = [
        f"  {chapter.get('number')}. {chapter.get('titleEnglish')} — {chapter.get('outline')}"
        for chapter in chapters
        if 0 < int(chapter.get("number") or 0) < number
    ]
    upcoming = [
        f"  {chapter.get('number')}. {chapter.get('titleEnglish')}"
        for chapter in chapters
        if int(chapter.get("number") or 0) > number
    ]
    characters = "; ".join(
        f"{person.get('name')} ({person.get('chinese')}) — {person.get('about')}"
        for person in (book.get("characters") or [])
        if isinstance(person, dict)
    )
    shared_words = "、".join(
        f"{word.get('traditional') or word.get('simplified')}"
        f"({word.get('pinyin')}) {word.get('english')}"
        for word in (book.get("newWords") or [])
        if isinstance(word, dict)
    )

    lines = [
        "",
        f"""This is chapter {number} of {reference.get("chapterCount")} of the book "{book.get("titleEnglish")}" ({book.get("titleChinese")}).""",
        f"Book premise: {book.get('summaryEnglish') or book.get('theme') or ''}",
    ]
    if characters:
        lines.append(f"Recurring characters (never rename them): {characters}")
    if shared_words:
        lines.append(
            "Words this book teaches across every chapter — reuse them here rather "
            f"than inventing synonyms: {shared_words}"
        )
    if current:
        lines.append(f"This chapter must cover: {current.get('outline')}")
    if previous:
        lines.append("Already told in earlier chapters (do not retell):")
        lines.extend(previous)
    if upcoming:
        lines.append("Saved for later chapters (do not use them up here):")
        lines.extend(upcoming)
    lines.append(
        "Write this chapter so it stands on its own for a reader who opens it "
        "first, while still following on from the earlier ones."
    )
    lines.append("")
    return "\n".join(lines)


def plan_book(payload: dict[str, Any]) -> dict[str, Any]:
    """Ask DeepSeek for a book plan, then create one chapter project per
    chapter so each chapter runs through the normal story pipeline."""
    title = str(payload.get("title") or "").strip()
    idea = str(payload.get("idea") or "").strip()
    if not idea:
        raise WorkshopError("Add a book idea before planning.")
    level = str(payload.get("level") or tocfl.DEFAULT_LEVEL).strip() or (
        tocfl.DEFAULT_LEVEL
    )
    try:
        chapter_count = int(payload.get("chapterCount") or DEFAULT_CHAPTERS)
    except (TypeError, ValueError) as error:
        raise WorkshopError("Chapter count must be a number.") from error
    if not MIN_CHAPTERS <= chapter_count <= MAX_CHAPTERS:
        raise WorkshopError(
            f"Choose between {MIN_CHAPTERS} and {MAX_CHAPTERS} chapters."
        )
    constraints = str(payload.get("constraints") or "").strip()

    schema = {
        "titleEnglish": "I'm a Cat",
        "titleChinese": "我是貓",
        "titlePinyin": "Wǒ shì māo",
        "summaryEnglish": "One or two sentences describing the whole book.",
        "summaryChinese": "一兩句話的介紹。",
        "characters": [
            {
                "name": "Fanfan",
                "chinese": "飯飯",
                "pinyin": "Fànfàn",
                "about": "A young stray cat looking for a home.",
            }
        ],
        "newWords": [
            {"traditional": "蘋果", "pinyin": "píngguǒ", "english": "apple"}
        ],
        "chapters": [
            {
                "number": 1,
                "titleEnglish": "What is Home?",
                "titleChinese": "家是什么？",
                "outline": "Two or three sentences describing exactly what happens in this chapter.",
            }
        ],
    }

    request = f"""Plan a {chapter_count}-chapter graded reader.

Working title: {title or "Choose a fitting title"}
Book idea: {idea}
Mandarin learner level: {level}
Additional constraints: {constraints or "None"}

Level rules (binding for every chapter):
{story_level_rules(level)}

Requirements:
- Give the book one running premise and a cast of two or three characters who appear again and again.
- Plan exactly {chapter_count} chapters, numbered 1 to {chapter_count}, each a self-contained episode of 12–20 short sentences that also moves the book forward.
- Chapter 1 introduces the character and the want. The last chapter resolves it.
- Each chapter outline must be concrete: who is there, what they do, what changes.
- Choose 4–8 shared new words the whole book teaches by repeating them across chapters, and list them in newWords. These are the only words outside the level's budget that any chapter may use.
- Chinese titles must be writable at this level.

Use this exact JSON shape and key names:
{json.dumps(schema, ensure_ascii=False, indent=2)}

Return one valid json object."""

    content, usage = deepseek_chat(
        [
            {"role": "system", "content": get_settings()["storyPrompt"]},
            {"role": "user", "content": request},
        ],
        json_output=True,
        max_tokens=8_000,
    )
    try:
        plan = json.loads(strip_json_fence(content))
    except json.JSONDecodeError as error:
        raise WorkshopError("DeepSeek returned malformed JSON. Please try again.", 502) from error
    if not isinstance(plan, dict):
        raise WorkshopError("DeepSeek did not return a book plan.", 502)

    chapters_raw = plan.get("chapters")
    if not isinstance(chapters_raw, list) or not chapters_raw:
        raise WorkshopError("The generated book plan has no chapters.", 502)
    chapters = []
    for index, chapter in enumerate(chapters_raw[:chapter_count], start=1):
        if not isinstance(chapter, dict):
            raise WorkshopError("A generated chapter is invalid.", 502)
        outline = str(chapter.get("outline") or "").strip()
        if not outline:
            raise WorkshopError(f"Chapter {index} of the plan has no outline.", 502)
        chapters.append(
            {
                "number": index,
                "titleEnglish": str(chapter.get("titleEnglish") or f"Chapter {index}").strip(),
                "titleChinese": str(chapter.get("titleChinese") or "").strip(),
                "outline": outline,
                "projectId": "",
            }
        )
    if len(chapters) != chapter_count:
        raise WorkshopError(
            f"The plan came back with {len(chapters)} chapters instead of {chapter_count}. Please try again.",
            502,
        )

    book_title = str(plan.get("titleEnglish") or title or "Untitled Book").strip()
    book = {
        "schemaVersion": 1,
        "id": f"{slugify(book_title)}-{int(time.time())}",
        "createdAt": utc_now(),
        "level": level,
        "theme": idea,
        "constraints": constraints,
        "titleEnglish": book_title,
        "titleChinese": str(plan.get("titleChinese") or "").strip(),
        "titlePinyin": str(plan.get("titlePinyin") or "").strip(),
        "summaryEnglish": str(plan.get("summaryEnglish") or "").strip(),
        "summaryChinese": str(plan.get("summaryChinese") or "").strip(),
        "characters": [
            person for person in (plan.get("characters") or []) if isinstance(person, dict)
        ],
        "newWords": [
            word for word in (plan.get("newWords") or []) if isinstance(word, dict)
        ],
        "chapterCount": chapter_count,
        "chapters": chapters,
        "model": get_deepseek_model(),
    }

    length = draft_length(level)
    for chapter in book["chapters"]:
        project = normalize_project(
            {
                "title": f"{book['titleEnglish']} {chapter['number']}: {chapter['titleEnglish']}",
                "idea": chapter["outline"],
                "level": level,
                "length": length,
                "constraints": constraints,
                "book": book_reference(book, chapter),
            }
        )
        save_project(project)
        chapter["projectId"] = project["id"]

    save_book(book)
    return {"book": book, "usage": usage}


def forget_book_chapter(project_id: str) -> None:
    """Drop a deleted chapter project from its book so the book still opens."""
    BOOKS_ROOT.mkdir(parents=True, exist_ok=True)
    for path in BOOKS_ROOT.glob("*/book.json"):
        book = read_json(path, None)
        if not isinstance(book, dict):
            continue
        changed = False
        for chapter in book.get("chapters") or []:
            if isinstance(chapter, dict) and chapter.get("projectId") == project_id:
                chapter["projectId"] = ""
                changed = True
        if changed:
            book["updatedAt"] = utc_now()
            atomic_write_json(path, book)


def delete_book(book_id: str) -> None:
    book = load_book(book_id)
    for chapter in book.get("chapters") or []:
        if not isinstance(chapter, dict):
            continue
        chapter_project = str(chapter.get("projectId") or "")
        if not chapter_project:
            continue
        folder = project_path(chapter_project)
        if (folder / "project.json").exists():
            unpublish_story_assets(chapter_project)
            shutil.rmtree(folder, ignore_errors=True)
    shutil.rmtree(book_path(book_id), ignore_errors=True)


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
    forget_book_chapter(project_id)


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
    level = project.get("level") or tocfl.DEFAULT_LEVEL
    request = f"""Create the English story using this brief:

Working title: {project.get("title") or "Choose a fitting title"}
Story idea: {project.get("idea")}
Mandarin learner level after translation: {level}
Target length: {project.get("length") or "600–900 words"}
Additional constraints: {project.get("constraints") or "None"}
{book_context_text(project)}
Level rules (binding):
{story_level_rules(level)}

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
    level = project.get("level") or tocfl.DEFAULT_LEVEL
    request = f"""Revise the English story below.

Revision instructions:
{instructions.strip()}
{book_context_text(project)}
Level rules (binding, they still apply after the revision):
{story_level_rules(level)}

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


def derive_simplified(traditional: str) -> str:
    """The Simplified rendering of *traditional*, or "" when unavailable.

    Conversion is best effort: a missing or stale dictionary must not stop a
    story being published, it just means the reader has nothing to toggle to.
    """
    if not traditional:
        return ""
    try:
        simplified = script_convert.to_simplified(traditional)
    except script_convert.ConversionUnavailable:
        return ""
    return "" if simplified == traditional else simplified


def repair_package_word_metadata(package: Any) -> Any:
    """Fill isolated model omissions without weakening package validation.

    Prefer the package's contextual vocabulary, then fall back to the first
    CC-CEDICT reading.  Anything that still lacks metadata is left untouched so
    validation can describe it precisely and the model gets one repair pass.
    """
    if not isinstance(package, dict):
        return package
    vocabulary: dict[str, tuple[str, str]] = {}
    for item in package.get("vocabulary") or []:
        if not isinstance(item, dict):
            continue
        traditional = str(
            item.get("traditional") or item.get("simplified") or ""
        ).strip()
        if traditional:
            vocabulary[traditional] = (
                str(item.get("pinyin") or "").strip(),
                str(item.get("english") or "").strip(),
            )

    for segment in package.get("segments") or []:
        if not isinstance(segment, dict):
            continue
        for word in segment.get("words") or []:
            if not isinstance(word, dict):
                continue
            text = str(word.get("text") or "").strip()
            if not text or re.fullmatch(
                r"[\s，。！？；：“”‘’、,.!?;:—…（）()]+",
                text,
            ):
                continue
            pinyin = str(word.get("pinyin") or "").strip()
            english = str(word.get("english") or "").strip()
            if pinyin and english:
                continue
            fallback_pinyin, fallback_english = vocabulary.get(text, ("", ""))
            if not (fallback_pinyin and fallback_english):
                try:
                    dictionary_pinyin, dictionary_english = (
                        script_convert.word_metadata(text)
                    )
                except script_convert.ConversionUnavailable:
                    dictionary_pinyin, dictionary_english = "", ""
                fallback_pinyin = fallback_pinyin or dictionary_pinyin
                fallback_english = fallback_english or dictionary_english
            if not pinyin and fallback_pinyin:
                word["pinyin"] = fallback_pinyin
            if not english and fallback_english:
                word["english"] = fallback_english
    return package


def missing_package_word_metadata(package: Any) -> list[dict[str, Any]]:
    """Describe every lexical word that still needs generated metadata."""
    missing: list[dict[str, Any]] = []
    if not isinstance(package, dict):
        return missing
    for segment_index, segment in enumerate(package.get("segments") or [], start=1):
        if not isinstance(segment, dict):
            continue
        for word_index, word in enumerate(segment.get("words") or [], start=1):
            if not isinstance(word, dict):
                continue
            text = str(word.get("text") or "").strip()
            if not text or re.fullmatch(
                r"[\s，。！？；：“”‘’、,.!?;:—…（）()]+",
                text,
            ):
                continue
            if str(word.get("pinyin") or "").strip() and str(
                word.get("english") or ""
            ).strip():
                continue
            missing.append(
                {
                    "segment": segment_index,
                    "word": word_index,
                    "text": text,
                    "segmentChinese": str(segment.get("chinese") or "").strip(),
                    "segmentEnglish": str(segment.get("english") or "").strip(),
                }
            )
    return missing


def apply_word_metadata_repairs(package: Any, content: str) -> Any:
    """Merge a small DeepSeek repair response without regenerating the package."""
    try:
        response = json.loads(strip_json_fence(content))
    except json.JSONDecodeError as error:
        raise WorkshopError(
            "DeepSeek returned malformed word metadata JSON. Please try again.", 502
        ) from error
    repairs = response.get("repairs") if isinstance(response, dict) else None
    if not isinstance(repairs, list):
        raise WorkshopError("DeepSeek did not return the requested word repairs.", 502)

    segments = package.get("segments") if isinstance(package, dict) else None
    if not isinstance(segments, list):
        return package
    for repair in repairs:
        if not isinstance(repair, dict):
            continue
        segment_index = repair.get("segment")
        word_index = repair.get("word")
        if not isinstance(segment_index, int) or not isinstance(word_index, int):
            continue
        if not (1 <= segment_index <= len(segments)):
            continue
        segment = segments[segment_index - 1]
        words = segment.get("words") if isinstance(segment, dict) else None
        if not isinstance(words, list) or not (1 <= word_index <= len(words)):
            continue
        word = words[word_index - 1]
        if not isinstance(word, dict):
            continue
        # Indices are authoritative, but matching text prevents an accidental
        # off-by-one repair from silently annotating the wrong learner token.
        expected_text = str(word.get("text") or "").strip()
        returned_text = str(repair.get("text") or "").strip()
        if returned_text and returned_text != expected_text:
            continue
        pinyin = str(repair.get("pinyin") or "").strip()
        english = str(repair.get("english") or "").strip()
        if pinyin:
            word["pinyin"] = pinyin
        if english:
            word["english"] = english
    return package


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
        # The whole point of this reader is Traditional characters, so a segment
        # written in Simplified is a failed generation, not something to fix up
        # silently — the pinyin and word splits were reasoned about in the wrong
        # script too.
        try:
            intruders = script_convert.simplified_only_characters(chinese)
        except script_convert.ConversionUnavailable:
            intruders = []
        if intruders:
            raise WorkshopError(
                f"Generated segment {index} is written in Simplified characters "
                f"({''.join(intruders)}). Regenerate: this story must be "
                "Traditional throughout.",
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
                    "textSimplified": derive_simplified(text),
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
                "chineseSimplified": derive_simplified(chinese),
                "pinyin": pinyin,
                # Traditional, deliberately: converting the audio text down to
                # Simplified would hand the synthesiser 干 for both 乾 and 幹 and
                # let it pick the wrong reading.
                "audioText": audio_text,
                "audioFile": f"audio/{segment_id}.wav",
                "words": normalized_words,
            }
        )
    package["segments"] = normalized_segments
    package["vocabulary"] = normalize_vocabulary(package.get("vocabulary"))
    package["schemaVersion"] = 2
    package["script"] = "traditional"
    return package


def decode_and_validate_package(content: str) -> dict[str, Any]:
    try:
        package = json.loads(strip_json_fence(content))
    except json.JSONDecodeError as error:
        raise WorkshopError(
            "DeepSeek returned malformed JSON. Please try again.", 502
        ) from error
    return validate_package(repair_package_word_metadata(package))


def decode_package(content: str) -> dict[str, Any]:
    try:
        package = json.loads(strip_json_fence(content))
    except json.JSONDecodeError as error:
        raise WorkshopError(
            "DeepSeek returned malformed JSON. Please try again.", 502
        ) from error
    if not isinstance(package, dict):
        raise WorkshopError("DeepSeek did not return a story package object.", 502)
    return package


def combine_usage(*values: dict[str, Any]) -> dict[str, Any]:
    combined: dict[str, Any] = {}
    for usage in values:
        for key, value in usage.items():
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                previous = combined.get(key)
                combined[key] = (
                    previous + value
                    if isinstance(previous, (int, float))
                    else value
                )
            else:
                combined[key] = value
    return combined


def request_missing_word_metadata(
    package: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Ask only for unresolved word fields and merge them without regeneration."""
    missing_metadata = missing_package_word_metadata(package)
    if not missing_metadata:
        return package, {}
    metadata_request = f"""Fill the missing Mandarin word metadata below.

Return only this JSON shape:
{{"repairs":[{{"segment":1,"word":1,"text":"詞","pinyin":"cí","english":"contextual meaning"}}]}}

Return every requested item exactly once, keeping its segment, word, and text
values unchanged. Pinyin must use tone marks and English must define the word in
the supplied sentence context.

Missing items:
{json.dumps(missing_metadata, ensure_ascii=False, indent=2)}"""
    metadata_content, metadata_usage = deepseek_chat(
        [
            {
                "role": "system",
                "content": "Return valid JSON only. Complete every requested repair.",
            },
            {"role": "user", "content": metadata_request},
        ],
        json_output=True,
        max_tokens=4_000,
    )
    return apply_word_metadata_repairs(package, metadata_content), metadata_usage


def normalize_vocabulary(vocabulary: Any) -> list[dict[str, Any]]:
    """Key vocabulary by traditional headword, with the simplified form beside."""
    if not isinstance(vocabulary, list):
        return []
    normalized = []
    for item in vocabulary:
        if not isinstance(item, dict):
            continue
        # Accept the old "simplified" key so a checkpoint written before the
        # move to Traditional still loads.
        traditional = str(
            item.get("traditional") or item.get("simplified") or ""
        ).strip()
        if not traditional:
            continue
        normalized.append(
            {
                "traditional": traditional,
                "simplified": derive_simplified(traditional),
                "pinyin": str(item.get("pinyin") or "").strip(),
                "english": str(item.get("english") or "").strip(),
            }
        )
    return normalized


def localize_story(project: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    story = str(project.get("englishStory") or "").strip()
    if not story:
        raise WorkshopError("Generate or write the English story first.")
    if not project.get("approved"):
        raise WorkshopError("Approve the English story before preparing Mandarin.")

    settings = get_settings()
    schema = {
        "schemaVersion": 2,
        "title": {
            "english": "Story title",
            "chinese": "中文標題",
            "pinyin": "Zhōngwén biāotí",
        },
        "level": project.get("level") or tocfl.DEFAULT_LEVEL,
        "summary": {
            "english": "One sentence summary",
            "chinese": "一句話摘要。",
            "pinyin": "Yí jù huà zhāiyào.",
        },
        "segments": [
            {
                "id": "001",
                "english": "Natural English translation.",
                "chinese": "適合學習者的中文。",
                "pinyin": "Shìhé xuéxízhě de Zhōngwén.",
                "audioText": "適合學習者的中文。",
                "words": [
                    {
                        "text": "適合",
                        "pinyin": "shìhé",
                        "english": "suitable for",
                    },
                    {
                        "text": "學習者",
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
                "traditional": "故事",
                "pinyin": "gùshì",
                "english": "story",
            }
        ],
    }
    level = project.get("level") or tocfl.DEFAULT_LEVEL
    request = f"""Return a valid json object for this approved story.

Learner level: {level}

Level rules (binding):
{localization_level_rules(level)}

Use this exact JSON shape and key names:
{json.dumps(schema, ensure_ascii=False, indent=2)}

Requirements:
- Write Traditional characters (正體字) only. A single Simplified character rejects the whole story.
- Preserve the full story without skipping events.
- Make each segment short enough for one audio clip, usually 1–3 Chinese sentences.
- Use sequential three-digit segment ids.
- Include 8–20 useful vocabulary items, keyed by "traditional".
- The English field in every segment is a natural translation of that Chinese segment.
- In every words array, use real lexical words in exact reading order. The text values, including punctuation, must concatenate to the segment's Chinese field exactly.
- Give every non-punctuation word tone-mark pinyin and its context-specific English meaning. Punctuation items must have blank pinyin and English.

Approved English story:
{story}"""
    messages = [
        {"role": "system", "content": settings["localizationPrompt"]},
        {"role": "user", "content": request},
    ]
    content, usage = deepseek_chat(
        messages,
        json_output=True,
        max_tokens=16_000,
    )
    try:
        package = repair_package_word_metadata(decode_package(content))
        package, metadata_usage = request_missing_word_metadata(package)
        usage = combine_usage(usage, metadata_usage)
        package = validate_package(package)
    except WorkshopError as first_error:
        repair_request = f"""Your JSON package failed validation:

{first_error}

Return the complete corrected JSON object again. Preserve the approved story,
Traditional characters, segment order, and schema. Check every lexical word:
each one needs tone-mark pinyin and a contextual English definition, and every
words array must reconstruct its segment's Chinese text exactly."""
        corrected, repair_usage = deepseek_chat(
            [
                *messages,
                {"role": "assistant", "content": content},
                {"role": "user", "content": repair_request},
            ],
            json_output=True,
            max_tokens=16_000,
        )
        usage = combine_usage(usage, repair_usage)
        try:
            package = repair_package_word_metadata(decode_package(corrected))
            package, metadata_usage = request_missing_word_metadata(package)
            usage = combine_usage(usage, metadata_usage)
            package = validate_package(package)
        except WorkshopError as second_error:
            raise WorkshopError(
                f"DeepSeek could not repair the Mandarin package: {second_error}",
                502,
            ) from second_error

    # validate_package stamps schemaVersion 2 and derives the Simplified
    # segment text; the title and summary live outside it, so derive those here.
    for block in ("title", "summary"):
        value = package.get(block)
        if isinstance(value, dict):
            value["chineseSimplified"] = derive_simplified(
                str(value.get("chinese") or "")
            )
    package["storyId"] = project["id"]
    package["level"] = (
        project.get("level") or package.get("level") or tocfl.DEFAULT_LEVEL
    )
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
    if isinstance(project.get("book"), dict):
        published_package["book"] = project["book"]
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
        "titleChineseSimplified": title.get("chineseSimplified")
        or derive_simplified(str(title.get("chinese") or "")),
        "titlePinyin": title.get("pinyin") or "",
        "summaryEnglish": summary.get("english") or "",
        "summaryChinese": summary.get("chinese") or "",
        "summaryChineseSimplified": summary.get("chineseSimplified")
        or derive_simplified(str(summary.get("chinese") or "")),
        "level": (
            published_package.get("level")
            or project.get("level")
            or tocfl.DEFAULT_LEVEL
        ),
        "segmentCount": len(published_package.get("segments") or []),
        "durationSeconds": round(float(manifest.get("durationSeconds") or 0)),
        "publishedAt": published_package["publishedAt"],
    }
    if isinstance(project.get("book"), dict):
        entry["book"] = project["book"]
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
            print(f"Workshop error ({error.status}): {error}")
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
                self.send_json(
                    {"ok": True, "projects": list_projects(), "books": list_books()}
                )
                return
            if len(parts) == 3 and parts[:2] == ["api", "books"]:
                delete_book(parts[2])
                self.send_json(
                    {"ok": True, "projects": list_projects(), "books": list_books()}
                )
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
                    "books": list_books(),
                    "levels": {
                        "options": [
                            {
                                "value": level.label,
                                "label": f"{level.label} ({level.chinese})",
                                "cefr": level.cefr,
                                "wordCount": level.vocabulary,
                                "budgeted": level.words is not None,
                            }
                            for level in tocfl.LEVELS
                        ],
                        "default": tocfl.DEFAULT_LEVEL,
                        "minChapters": MIN_CHAPTERS,
                        "maxChapters": MAX_CHAPTERS,
                        "defaultChapters": DEFAULT_CHAPTERS,
                    },
                }
            )
            return
        if parts == ["api", "books"]:
            self.send_json({"books": list_books()})
            return
        if len(parts) == 3 and parts[:2] == ["api", "books"]:
            self.send_json({"book": load_book(parts[2])})
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
        if parts == ["api", "books"]:
            result = plan_book(payload)
            self.send_json(
                {
                    "book": result["book"],
                    "usage": result["usage"],
                    "books": list_books(),
                    "projects": list_projects(),
                },
                201,
            )
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
