from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


MANDARIN_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = MANDARIN_ROOT.parent
MODEL_ROOT = MANDARIN_ROOT / "models"
WORK_ROOT = MANDARIN_ROOT / ".workshop"
DRAFT_ROOT = WORK_ROOT / "drafts"
CACHE_ROOT = WORK_ROOT / "cache" / "tts"
CONTENT_ROOT = MANDARIN_ROOT / "assets" / "content"
STORY_ROOT = CONTENT_ROOT / "stories"
CATALOG_PATH = CONTENT_ROOT / "catalog.json"
PUBSPEC_PATH = MANDARIN_ROOT / "pubspec.yaml"

MODEL_PATHS = {
    "custom": MODEL_ROOT / "Qwen3-TTS-12Hz-1.7B-CustomVoice",
    "base": MODEL_ROOT / "Qwen3-TTS-12Hz-1.7B-Base",
    "tokenizer": MODEL_ROOT / "Qwen3-TTS-Tokenizer-12Hz",
}

load_dotenv(REPO_ROOT / ".env")

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "").strip()
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-pro").strip()
DEEPSEEK_BASE_URL = os.getenv(
    "DEEPSEEK_BASE_URL", "https://api.deepseek.com"
).rstrip("/")
DEEPSEEK_ANNOTATION_WORKERS = max(
    1, min(4, int(os.getenv("DEEPSEEK_ANNOTATION_WORKERS", "3")))
)

LEVELS = {
    "newbie": {
        "label": "Newbie",
        "rank": 1,
        "vocabulary": 150,
        "chars": (80, 140),
        "sections": (3, 4),
        "max_unique_words": 38,
        "max_new_words": 6,
        "target_unique_words": 24,
        "target_new_words": 3,
        "target_sentence_hanzi": (3, 10),
        "pedagogy": (
            "Build the whole story around one useful sentence pattern. Use "
            "only one or two people, ordinary HSK 1 words, playful repetition, "
            "and an easy concrete problem. Repeat the same nouns and verbs in "
            "every section. Avoid synonyms, description, backstory, and side plots."
        ),
        "min_coverage": 0.95,
        "min_repetition": 1.7,
        "max_block_hanzi": 18,
        "minutes": 2,
    },
    "elementary": {
        "label": "Elementary",
        "rank": 2,
        "vocabulary": 300,
        "chars": (140, 260),
        "sections": (3, 5),
        "max_unique_words": 78,
        "max_new_words": 10,
        "target_unique_words": 45,
        "target_new_words": 5,
        "target_sentence_hanzi": (5, 16),
        "pedagogy": (
            "Teach one practical contrast or grammar pattern through a short "
            "three-part situation. Keep the cast small, reuse the same core "
            "words heavily, and prefer direct dialogue over description. Avoid "
            "unnecessary synonyms, literary phrasing, and secondary plot lines."
        ),
        "min_coverage": 0.94,
        "min_repetition": 1.6,
        "max_block_hanzi": 26,
        "minutes": 3,
    },
    "intermediate": {
        "label": "Intermediate",
        "rank": 3,
        "vocabulary": 600,
        "chars": (260, 480),
        "sections": (4, 6),
        "max_unique_words": 128,
        "max_new_words": 14,
        "min_coverage": 0.93,
        "min_repetition": 1.5,
        "max_block_hanzi": 34,
        "minutes": 4,
    },
    "upper-intermediate": {
        "label": "Upper Intermediate",
        "rank": 4,
        "vocabulary": 1000,
        "chars": (300, 550),
        "sections": (4, 7),
        "max_unique_words": 185,
        "max_new_words": 18,
        "min_coverage": 0.92,
        "min_repetition": 1.45,
        "max_block_hanzi": 44,
        "minutes": 5,
    },
    "advanced": {
        "label": "Advanced",
        "rank": 5,
        "vocabulary": 1500,
        "chars": (400, 750),
        "sections": (5, 8),
        "max_unique_words": 265,
        "max_new_words": 24,
        "min_coverage": 0.91,
        "min_repetition": 1.4,
        "max_block_hanzi": 58,
        "minutes": 6,
    },
    "master": {
        "label": "Master",
        "rank": 6,
        "vocabulary": 2500,
        "chars": (400, 800),
        "sections": (5, 9),
        "max_unique_words": 345,
        "max_new_words": 32,
        "min_coverage": 0.90,
        "min_repetition": 1.35,
        "max_block_hanzi": 72,
        "minutes": 7,
    },
}

SUPPORTED_SPEAKERS = ("Vivian", "Serena", "Dylan", "Uncle_Fu", "Eric")

for directory in (DRAFT_ROOT, CACHE_ROOT, STORY_ROOT):
    directory.mkdir(parents=True, exist_ok=True)
