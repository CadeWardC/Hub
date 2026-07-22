from __future__ import annotations

import copy
import unittest
from unittest.mock import Mock, patch

from workshop.deepseek_client import DeepSeekClient, DeepSeekError
from workshop.tests.fixtures import valid_story


class DeepSeekTests(unittest.TestCase):
    def test_missing_key_has_clear_error(self) -> None:
        with self.assertRaisesRegex(DeepSeekError, "DEEPSEEK_API_KEY"):
            DeepSeekClient(api_key="").generate_story({"level": "newbie"})

    @patch("workshop.deepseek_client.requests.post")
    def test_valid_json_story_is_returned(self, post: Mock) -> None:
        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = {
            "choices": [{"message": {"content": __import__("json").dumps(valid_story(), ensure_ascii=False)}}]
        }
        post.return_value = response
        story = DeepSeekClient(api_key="test").generate_story(
            {"level": "newbie", "topic": "rain"}
        )
        self.assertEqual(story["id"], "red-umbrella")
        self.assertEqual(post.call_args.kwargs["json"]["response_format"]["type"], "json_object")
        self.assertEqual(
            post.call_args.kwargs["json"]["thinking"], {"type": "disabled"}
        )

    @patch("workshop.deepseek_client.requests.post")
    def test_story_structure_is_annotated_in_a_second_phase(self, post: Mock) -> None:
        complete = valid_story()
        skeleton = copy.deepcopy(complete)
        for block in skeleton["blocks"]:
            block.pop("pinyin", None)
            block.pop("tokens", None)
            block.pop("audio", None)
        structure_response = Mock()
        structure_response.raise_for_status.return_value = None
        structure_response.json.return_value = {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "content": __import__("json").dumps(
                            skeleton, ensure_ascii=False
                        )
                    },
                }
            ]
        }
        annotation_response = Mock()
        annotation_response.raise_for_status.return_value = None
        block = complete["blocks"][0]
        annotation_response.json.return_value = {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "content": __import__("json").dumps(
                            {
                                "pinyin": block["pinyin"],
                                "translation": block["translation"],
                                "tokens": block["tokens"],
                            },
                            ensure_ascii=False,
                        )
                    },
                }
            ]
        }
        post.side_effect = [structure_response, annotation_response]

        story = DeepSeekClient(api_key="test").generate_story({"level": "newbie"})

        self.assertEqual(story["blocks"][0]["tokens"], block["tokens"])
        self.assertEqual(post.call_count, 2)

    @patch("workshop.deepseek_client.requests.post")
    def test_empty_response_is_retried(self, post: Mock) -> None:
        empty = Mock()
        empty.raise_for_status.return_value = None
        empty.json.return_value = {
            "choices": [
                {
                    "finish_reason": "length",
                    "message": {"content": "", "reasoning_content": "thinking"},
                }
            ]
        }
        valid = Mock()
        valid.raise_for_status.return_value = None
        valid.json.return_value = {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "content": __import__("json").dumps(
                            valid_story(), ensure_ascii=False
                        )
                    },
                }
            ]
        }
        post.side_effect = [empty, valid]

        story = DeepSeekClient(api_key="test").generate_story({"level": "newbie"})

        self.assertEqual(story["id"], "red-umbrella")
        self.assertEqual(post.call_count, 2)
        self.assertEqual(post.call_args.kwargs["json"]["max_tokens"], 16384)

    @patch("workshop.deepseek_client.requests.post")
    def test_non_object_story_response_is_retried(self, post: Mock) -> None:
        wrong_root = Mock()
        wrong_root.raise_for_status.return_value = None
        wrong_root.json.return_value = {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {"content": '["not a story object"]'},
                }
            ]
        }
        valid = Mock()
        valid.raise_for_status.return_value = None
        valid.json.return_value = {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "content": __import__("json").dumps(
                            valid_story(), ensure_ascii=False
                        )
                    },
                }
            ]
        }
        post.side_effect = [wrong_root, valid]

        story = DeepSeekClient(api_key="test").generate_story({"level": "newbie"})

        self.assertEqual(story["id"], "red-umbrella")
        self.assertEqual(post.call_count, 2)

    @patch("workshop.deepseek_client.requests.post")
    def test_invalid_block_annotation_is_repaired(self, post: Mock) -> None:
        invalid = Mock()
        invalid.raise_for_status.return_value = None
        invalid.json.return_value = {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "content": __import__("json").dumps(
                            {"pinyin": "jīntiān", "translation": "Today", "tokens": []}
                        )
                    },
                }
            ]
        }
        valid = Mock()
        valid.raise_for_status.return_value = None
        block = valid_story()["blocks"][0]
        valid.json.return_value = {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "content": __import__("json").dumps(
                            {
                                "pinyin": block["pinyin"],
                                "translation": block["translation"],
                                "tokens": block["tokens"],
                            },
                            ensure_ascii=False,
                        )
                    },
                }
            ]
        }
        post.side_effect = [invalid, valid]

        annotated = DeepSeekClient(api_key="test").annotate_block(
            block, level="newbie"
        )

        self.assertEqual(annotated["tokens"], block["tokens"])
        self.assertEqual(post.call_count, 2)


if __name__ == "__main__":
    unittest.main()
