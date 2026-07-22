from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from workshop import server
from workshop.draft_store import DraftStore
from workshop.tests.fixtures import valid_story


class ServerTests(unittest.TestCase):
    def test_generation_keeps_the_planned_story_identity(self) -> None:
        generated = valid_story()
        generated["minutes"] = 12
        with tempfile.TemporaryDirectory() as temp_name:
            draft_store = DraftStore(Path(temp_name))
            with patch.object(server, "store", draft_store), patch.object(
                server.deepseek, "generate_story", return_value=generated
            ):
                response = server.app.test_client().post(
                    "/api/stories/drafts",
                    json={
                        "id": "new-neighbor",
                        "englishTitle": "The New Neighbor",
                        "level": "elementary",
                        "topic": "Meeting a neighbor",
                    },
                )

        self.assertEqual(response.status_code, 201)
        story = response.get_json()["story"]
        self.assertEqual(story["id"], "new-neighbor")
        self.assertEqual(story["englishTitle"], "The New Neighbor")
        self.assertEqual(story["minutes"], 3)
        self.assertIn("report", response.get_json())

    def test_individual_annotation_route_returns_the_updated_block(self) -> None:
        story = valid_story()
        updated = dict(story["blocks"][0], translation="It is raining.")
        with tempfile.TemporaryDirectory() as temp_name:
            draft_store = DraftStore(Path(temp_name))
            draft_store.save(story)
            with patch.object(server, "store", draft_store), patch.object(
                server.deepseek, "annotate_block", return_value=updated
            ) as annotate:
                response = server.app.test_client().post(
                    "/api/stories/drafts/red-umbrella/annotate/b001"
                )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["block"]["translation"], "It is raining.")
        self.assertIn("context", annotate.call_args.kwargs)

    def test_bulk_annotation_route_saves_the_returned_story(self) -> None:
        story = valid_story()
        updated = valid_story()
        updated["summary"] = "Updated learner data."
        with tempfile.TemporaryDirectory() as temp_name:
            draft_store = DraftStore(Path(temp_name))
            draft_store.save(story)
            with patch.object(server, "store", draft_store), patch.object(
                server.deepseek, "annotate_story", return_value=updated
            ):
                response = server.app.test_client().post(
                    "/api/stories/drafts/red-umbrella/annotate",
                    json={"force": False},
                )
                saved = draft_store.get("red-umbrella")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(saved["summary"], "Updated learner data.")


if __name__ == "__main__":
    unittest.main()
