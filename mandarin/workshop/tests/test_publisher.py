from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from workshop.draft_store import DraftStore
from workshop.publisher import Publisher
from workshop.schema import read_json
from workshop.tests.fixtures import valid_story


class PublisherTests(unittest.TestCase):
    def test_publish_copies_audio_and_updates_catalog(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            root = Path(temp_name)
            store = DraftStore(root / "drafts")
            story = store.save(valid_story())
            (store.audio_root(story["id"]) / "b001.mp3").write_bytes(b"mp3")
            content = root / "content"
            story_root = content / "stories"
            story_root.mkdir(parents=True)
            catalog = content / "catalog.json"
            pubspec = root / "pubspec.yaml"
            pubspec.write_text(
                "flutter:\n  assets:\n    - assets/content/catalog.json\n"
                "    # BEGIN PUBLISHED STORY ASSETS\n"
                "    # END PUBLISHED STORY ASSETS\n",
                encoding="utf-8",
            )
            with patch("workshop.publisher.STORY_ROOT", story_root), patch(
                "workshop.publisher.CATALOG_PATH", catalog
            ), patch(
                "workshop.publisher.PUBSPEC_PATH", pubspec
            ):
                entry = Publisher(store, enforce_grading=False).publish(story["id"])
            self.assertEqual(entry["id"], "red-umbrella")
            self.assertTrue((story_root / "red-umbrella" / "audio" / "b001.mp3").is_file())
            self.assertEqual(read_json(catalog)["stories"][0]["id"], "red-umbrella")
            self.assertIn("stories/red-umbrella/audio/", pubspec.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
