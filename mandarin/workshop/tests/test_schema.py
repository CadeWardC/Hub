from __future__ import annotations

import unittest

from workshop.schema import baseline_tokens, hydrate_story, validate_story
from workshop.tests.fixtures import valid_story


class SchemaTests(unittest.TestCase):
    def test_valid_story_passes(self) -> None:
        self.assertEqual(validate_story(valid_story()), [])

    def test_token_reconstruction_is_enforced(self) -> None:
        story = valid_story()
        story["blocks"][0]["tokens"][0]["text"] = "明天"
        self.assertTrue(
            any("does not reconstruct" in error for error in validate_story(story))
        )

    def test_study_duration_and_token_difficulty_are_bounded(self) -> None:
        story = valid_story()
        story["minutes"] = 9
        story["blocks"][0]["tokens"][0]["difficulty"] = 0

        errors = validate_story(story)

        self.assertTrue(any("minutes" in error for error in errors))
        self.assertTrue(any("Chinese difficulty" in error for error in errors))

    def test_narration_and_dialogue_use_matching_voice_roles(self) -> None:
        story = valid_story()
        story["blocks"][0]["kind"] = "dialogue"
        story["blocks"][0]["speakerId"] = "narrator"

        errors = validate_story(story)

        self.assertTrue(any("character voice" in error for error in errors))

    def test_hydration_adds_block_contract(self) -> None:
        story = hydrate_story(
            {
                "id": "tiny-story",
                "title": "小故事",
                "englishTitle": "Tiny Story",
                "level": "newbie",
                "blocks": [{"hanzi": "你好。", "translation": "Hello."}],
            }
        )
        self.assertEqual(story["blocks"][0]["id"], "b001")
        self.assertEqual(
            "".join(token["text"] for token in story["blocks"][0]["tokens"]),
            "你好。",
        )

    def test_baseline_tokenizer_preserves_punctuation(self) -> None:
        tokens = baseline_tokens("你好，小林！")
        self.assertEqual("".join(token["text"] for token in tokens), "你好，小林！")


if __name__ == "__main__":
    unittest.main()
