from __future__ import annotations

import unittest

from workshop.build_launch_set import _normalize, _specs
from workshop.tests.fixtures import valid_story


class LaunchSetTests(unittest.TestCase):
    def test_launch_set_has_twelve_stable_unique_ids(self) -> None:
        specs = _specs()

        self.assertEqual(len(specs), 12)
        self.assertEqual(len({spec["id"] for spec in specs}), 12)
        self.assertEqual(specs[0]["id"], "red-umbrella")
        self.assertEqual(specs[-1]["id"], "map-beneath-the-courtyard")

    def test_normalize_preserves_the_planned_catalog_identity(self) -> None:
        story = valid_story()
        story["minutes"] = 12
        spec = {
            "id": "breakfast-for-two",
            "englishTitle": "Breakfast for Two",
            "level": "newbie",
            "topic": "Ordering breakfast",
        }

        normalized = _normalize(story, spec)

        self.assertEqual(normalized["id"], "breakfast-for-two")
        self.assertEqual(normalized["englishTitle"], "Breakfast for Two")
        self.assertEqual(normalized["minutes"], 8)


if __name__ == "__main__":
    unittest.main()
