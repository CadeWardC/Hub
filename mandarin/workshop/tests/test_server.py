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
        self.assertEqual(story["minutes"], 8)


if __name__ == "__main__":
    unittest.main()
