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
    "newbie": {"label": "Newbie", "rank": 1, "vocabulary": 150, "chars": (300, 450)},
    "elementary": {"label": "Elementary", "rank": 2, "vocabulary": 300, "chars": (450, 650)},
    "intermediate": {"label": "Intermediate", "rank": 3, "vocabulary": 600, "chars": (650, 850)},
    "upper-intermediate": {"label": "Upper Intermediate", "rank": 4, "vocabulary": 1000, "chars": (800, 1050)},
    "advanced": {"label": "Advanced", "rank": 5, "vocabulary": 1500, "chars": (950, 1250)},
    "master": {"label": "Master", "rank": 6, "vocabulary": 2500, "chars": (1100, 1450)},
}

SUPPORTED_SPEAKERS = ("Vivian", "Serena", "Dylan", "Uncle_Fu", "Eric")

for directory in (DRAFT_ROOT, CACHE_ROOT, STORY_ROOT):
    directory.mkdir(parents=True, exist_ok=True)
