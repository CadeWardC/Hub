from __future__ import annotations

import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import CATALOG_PATH, LEVELS, PUBSPEC_PATH, STORY_ROOT
from .draft_store import DraftStore
from .schema import read_json, validate_story, write_json


class PublishError(RuntimeError):
    pass


class Publisher:
    def __init__(
        self, store: DraftStore | None = None, *, enforce_grading: bool = True
    ) -> None:
        self.store = store or DraftStore()
        self.enforce_grading = enforce_grading

    def publish(self, draft_id: str) -> dict[str, Any]:
        story = self.store.get(draft_id)
        audio_root = self.store.audio_root(draft_id)
        errors = validate_story(
            story,
            require_audio=True,
            audio_root=audio_root,
            enforce_grading=self.enforce_grading,
        )
        if errors:
            raise PublishError("; ".join(errors))

        destination = STORY_ROOT / story["id"]
        with tempfile.TemporaryDirectory(prefix=f".{story['id']}-", dir=STORY_ROOT) as temp_name:
            stage = Path(temp_name)
            (stage / "audio").mkdir()
            for block in story["blocks"]:
                filename = Path(block["audio"]["path"]).name
                block["audio"]["path"] = f"audio/{filename}"
                shutil.copy2(audio_root / filename, stage / "audio" / filename)
            write_json(stage / "story.json", story)
            backup = destination.with_name(destination.name + ".previous")
            if backup.exists():
                shutil.rmtree(backup)
            if destination.exists():
                destination.replace(backup)
            try:
                stage.replace(destination)
                if backup.exists():
                    shutil.rmtree(backup)
            except Exception:
                if destination.exists():
                    shutil.rmtree(destination)
                if backup.exists():
                    backup.replace(destination)
                raise

        catalog = read_json(CATALOG_PATH, {"schemaVersion": 1, "stories": []})
        entry = {
            "id": story["id"],
            "title": story["title"],
            "englishTitle": story["englishTitle"],
            "summary": story.get("summary", ""),
            "level": story["level"],
            "topic": story.get("topic", "Story"),
            "minutes": story.get("minutes", 4),
            "blockCount": len(story["blocks"]),
            "path": f"assets/content/stories/{story['id']}/story.json",
            "glyph": story.get("glyph", story["title"][:1]),
            "colors": story.get("colors", ["#D7482F", "#8E2F21"]),
        }
        entries = [item for item in catalog.get("stories", []) if item.get("id") != story["id"]]
        entries.append(entry)
        entries.sort(key=lambda item: (LEVELS[item["level"]]["rank"], item["englishTitle"]))
        catalog.update(
            {
                "schemaVersion": 1,
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "stories": entries,
            }
        )
        write_json(CATALOG_PATH, catalog)
        _update_flutter_assets(entries)
        return entry


def _update_flutter_assets(entries: list[dict[str, Any]]) -> None:
    begin = "    # BEGIN PUBLISHED STORY ASSETS"
    end = "    # END PUBLISHED STORY ASSETS"
    source = PUBSPEC_PATH.read_text(encoding="utf-8")
    if begin not in source or end not in source:
        raise PublishError("pubspec.yaml is missing the published-story asset markers.")
    lines = [begin]
    for entry in entries:
        story_id = entry["id"]
        lines.extend(
            [
                f"    - assets/content/stories/{story_id}/",
                f"    - assets/content/stories/{story_id}/audio/",
            ]
        )
    lines.append(end)
    before, remainder = source.split(begin, 1)
    _, after = remainder.split(end, 1)
    temp = PUBSPEC_PATH.with_suffix(".yaml.tmp")
    temp.write_text(before + "\n".join(lines) + after, encoding="utf-8")
    temp.replace(PUBSPEC_PATH)
