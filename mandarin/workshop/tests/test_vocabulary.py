from __future__ import annotations

import unittest

from workshop.schema import hydrate_story
from workshop.tests.fixtures import valid_story
from workshop.vocabulary import (
    analyze_story,
    hsk_level,
    sync_learning_words,
    vocabulary_errors,
)


class VocabularyTests(unittest.TestCase):
    def test_classic_hsk_levels_are_local_and_deterministic(self) -> None:
        self.assertEqual(hsk_level("今天"), 1)
        self.assertIsNotNone(hsk_level("邻居"))
        self.assertIsNone(hsk_level("锈迹斑斑"))

    def test_report_exposes_unplanned_words(self) -> None:
        story = hydrate_story(valid_story())
        story["learningWords"] = []
        story["blocks"][0]["tokens"][0]["text"] = "锈迹斑斑"
        story["blocks"][0]["hanzi"] = "锈迹斑斑下雨了。"
        report = analyze_story(story)
        self.assertIn("锈迹斑斑", report.unplanned_words)

    def test_basic_combinations_are_graded_by_their_known_parts(self) -> None:
        story = hydrate_story(valid_story())
        story["learningWords"] = []
        story["blocks"][0]["hanzi"] = "他没有回家。"
        report = analyze_story(story)
        self.assertEqual(report.new_words, ())
        self.assertEqual(report.coverage, 1)

    def test_productive_character_form_uses_its_base_word_band(self) -> None:
        story = hydrate_story(valid_story())
        story["learningWords"] = []
        story["blocks"][0]["hanzi"] = "他说。"
        report = analyze_story(story)
        self.assertNotIn("说", report.new_words)

    def test_learning_list_can_follow_the_words_in_the_final_text(self) -> None:
        story = hydrate_story(valid_story())
        story["learningWords"] = []
        story["blocks"][0]["hanzi"] = "锈迹斑斑下雨了。"
        report = sync_learning_words(story)
        self.assertEqual(story["learningWords"], ["锈迹斑斑"])
        self.assertEqual(report.unplanned_words, ())

    def test_learning_list_drops_a_stale_preferred_term(self) -> None:
        story = hydrate_story(valid_story())
        story["learningWords"] = ["\u4e2a\u4eba"]
        sync_learning_words(story)
        self.assertNotIn("\u4e2a\u4eba", story["learningWords"])

    def test_number_classifier_person_is_not_the_word_individual(self) -> None:
        story = hydrate_story(valid_story())
        story["learningWords"] = []
        story["blocks"][0]["hanzi"] = "\u4e24\u4e2a\u4eba\u56de\u5bb6\u3002"
        report = analyze_story(story)
        self.assertNotIn("\u4e2a\u4eba", report.new_words)

    def test_dense_newbie_story_is_rejected_before_audio(self) -> None:
        story = hydrate_story(valid_story())
        errors = vocabulary_errors(story)
        self.assertTrue(any("Chinese length" in error for error in errors))
        self.assertTrue(any("sections" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
