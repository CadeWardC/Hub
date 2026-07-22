from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import DRAFT_ROOT
from .schema import hydrate_story, read_json, slugify, write_json


class DraftStore:
    def __init__(self, root: Path = DRAFT_ROOT) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, draft_id: str) -> Path:
        safe = slugify(draft_id)
        return self.root / safe

    def list(self) -> list[dict[str, Any]]:
        summaries = []
        for path in sorted(self.root.glob("*/story.json"), reverse=True):
            story = read_json(path, {})
            summaries.append(
                {
                    "id": story.get("id", path.parent.name),
                    "title": story.get("title", "Untitled"),
                    "englishTitle": story.get("englishTitle", "Untitled"),
                    "level": story.get("level", "newbie"),
                    "updatedAt": datetime.fromtimestamp(
                        path.stat().st_mtime, tz=timezone.utc
                    ).isoformat(),
                }
            )
        return summaries

    def save(self, story: dict[str, Any]) -> dict[str, Any]:
        story = hydrate_story(story)
        story["id"] = slugify(story.get("id") or story.get("englishTitle", ""))
        path = self._path(story["id"])
        path.mkdir(parents=True, exist_ok=True)
        (path / "audio").mkdir(exist_ok=True)
        write_json(path / "story.json", story)
        return story

    def get(self, draft_id: str) -> dict[str, Any]:
        path = self._path(draft_id) / "story.json"
        story = read_json(path)
        if story is None:
            raise FileNotFoundError(f"Draft {draft_id!r} does not exist.")
        return story

    def audio_root(self, draft_id: str) -> Path:
        path = self._path(draft_id) / "audio"
        path.mkdir(parents=True, exist_ok=True)
        return path
