import json
import sys
import tempfile
import threading
import unittest
import urllib.request
from pathlib import Path
from unittest.mock import patch


WORKSHOP_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(WORKSHOP_ROOT))

import server  # noqa: E402


class WorkshopTestCase(unittest.TestCase):
    """Redirects the workshop's on-disk roots into a temporary folder."""

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        data_root = Path(self.temporary.name)
        self.original_paths = (
            server.DATA_ROOT,
            server.PROJECTS_ROOT,
            server.BOOKS_ROOT,
            server.SETTINGS_FILE,
            server.FLUTTER_CONTENT_ROOT,
        )
        server.DATA_ROOT = data_root
        server.PROJECTS_ROOT = data_root / "projects"
        server.BOOKS_ROOT = data_root / "books"
        server.SETTINGS_FILE = data_root / "settings.json"
        server.FLUTTER_CONTENT_ROOT = data_root / "flutter_content"
        server.ensure_data_dirs()

    def tearDown(self):
        (
            server.DATA_ROOT,
            server.PROJECTS_ROOT,
            server.BOOKS_ROOT,
            server.SETTINGS_FILE,
            server.FLUTTER_CONTENT_ROOT,
        ) = self.original_paths
        self.temporary.cleanup()

    def plan_a_book(self, chapter_count=4, level="HSK 1"):
        plan = {
            "titleEnglish": "I'm a Cat",
            "titleChinese": "我是猫",
            "titlePinyin": "Wǒ shì māo",
            "summaryEnglish": "A stray cat looks for a home.",
            "characters": [
                {
                    "name": "Fanfan",
                    "chinese": "饭饭",
                    "pinyin": "Fànfan",
                    "about": "A stray cat.",
                }
            ],
            "newWords": [
                {"simplified": "苹果", "pinyin": "píngguǒ", "english": "apple"}
            ],
            "chapters": [
                {
                    "number": index,
                    "titleEnglish": f"Chapter {index}",
                    "titleChinese": f"第{index}章",
                    "outline": f"The cat eats and sleeps in place {index}.",
                }
                for index in range(1, chapter_count + 1)
            ],
        }
        with patch.object(
            server,
            "deepseek_chat",
            return_value=(json.dumps(plan, ensure_ascii=False), {}),
        ):
            return server.plan_book(
                {
                    "title": "I'm a Cat",
                    "idea": "A stray cat looks for a home.",
                    "level": level,
                    "chapterCount": chapter_count,
                }
            )["book"]


class WorkshopTests(WorkshopTestCase):
    def test_prompt_settings_are_saved(self):
        settings = server.save_settings({"storyPrompt": "Write a gentle English story."})

        self.assertEqual(settings["storyPrompt"], "Write a gentle English story.")
        self.assertEqual(server.get_settings()["storyPrompt"], settings["storyPrompt"])
        self.assertIn("localizationPrompt", settings)

    def test_project_round_trip(self):
        project = server.normalize_project(
            {
                "title": "The Red Kite",
                "idea": "A kite disappears.",
                "level": "HSK 1",
            }
        )
        server.save_project(project)

        loaded = server.load_project(project["id"])
        self.assertEqual(loaded["title"], "The Red Kite")
        self.assertEqual(loaded["status"], "draft")
        self.assertEqual(server.list_projects()[0]["id"], project["id"])

    def test_localization_creates_story_and_audio_files(self):
        project = server.normalize_project(
            {
                "title": "Tea for Two",
                "idea": "Friends share tea.",
                "level": "HSK 1",
                "englishStory": "Lin shared tea with her friend.",
                "approved": True,
            }
        )
        server.save_project(project)
        response = {
            "schemaVersion": 1,
            "title": {
                "english": "Tea for Two",
                "chinese": "两个人的茶",
                "pinyin": "Liǎng ge rén de chá",
            },
            "level": "HSK 1",
            "summary": {
                "english": "Two friends share tea.",
                "chinese": "两个朋友一起喝茶。",
                "pinyin": "Liǎng ge péngyou yìqǐ hē chá.",
            },
            "segments": [
                {
                    "id": "9",
                    "english": "Lin shared tea with her friend.",
                    "chinese": "林和朋友一起喝茶。",
                    "pinyin": "Lín hé péngyou yìqǐ hē chá.",
                    "audioText": "林和朋友一起喝茶。",
                    "words": [
                        {"text": "林", "pinyin": "Lín", "english": "Lin"},
                        {"text": "和", "pinyin": "hé", "english": "with"},
                        {
                            "text": "朋友",
                            "pinyin": "péngyou",
                            "english": "friend",
                        },
                        {
                            "text": "一起",
                            "pinyin": "yìqǐ",
                            "english": "together",
                        },
                        {"text": "喝", "pinyin": "hē", "english": "to drink"},
                        {"text": "茶", "pinyin": "chá", "english": "tea"},
                        {"text": "。", "pinyin": "", "english": ""},
                    ],
                }
            ],
            "vocabulary": [
                {"simplified": "茶", "pinyin": "chá", "english": "tea"}
            ],
        }

        with patch.object(
            server,
            "deepseek_chat",
            return_value=(json.dumps(response, ensure_ascii=False), {"total_tokens": 10}),
        ):
            localized, usage = server.localize_story(project)

        folder = server.project_path(project["id"])
        self.assertEqual(localized["status"], "files_ready")
        self.assertEqual(usage["total_tokens"], 10)
        self.assertEqual(
            localized["package"]["segments"][0]["words"][2]["english"],
            "friend",
        )
        self.assertTrue((folder / "story.json").is_file())
        self.assertTrue((folder / "audio_manifest.json").is_file())
        manifest = json.loads((folder / "audio_manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["items"][0]["output"], "audio/001.wav")
        self.assertEqual(manifest["items"][0]["text"], "林和朋友一起喝茶。")

    def test_audio_publish_copies_assets_into_flutter_library(self):
        project = server.normalize_project(
            {
                "title": "Tea for Two",
                "idea": "Friends share tea.",
                "level": "HSK 1",
                "englishStory": "Lin shared tea with her friend.",
                "approved": True,
            }
        )
        package = {
            "schemaVersion": 1,
            "storyId": project["id"],
            "title": {
                "english": "Tea for Two",
                "chinese": "两个人的茶",
                "pinyin": "Liǎng ge rén de chá",
            },
            "summary": {
                "english": "Friends share tea.",
                "chinese": "朋友一起喝茶。",
                "pinyin": "Péngyou yìqǐ hē chá.",
            },
            "level": "HSK 1",
            "segments": [
                {
                    "id": "001",
                    "english": "Lin shared tea with her friend.",
                    "chinese": "林和朋友一起喝茶。",
                    "pinyin": "Lín hé péngyou yìqǐ hē chá.",
                    "audioText": "林和朋友一起喝茶。",
                    "audioFile": "audio/001.wav",
                }
            ],
            "vocabulary": [],
            "audio": {
                "engine": "Qwen3-TTS",
                "voice": "Vivian",
                "language": "Chinese",
            },
        }
        project["package"] = package
        project["status"] = "files_ready"
        server.save_project(project)
        folder = server.project_path(project["id"])
        server.atomic_write_json(folder / "story.json", package)
        server.atomic_write_json(
            folder / "audio_manifest.json",
            {
                "storyId": project["id"],
                "voice": "Vivian",
                "items": [
                    {
                        "id": "001",
                        "text": "林和朋友一起喝茶。",
                        "output": "audio/001.wav",
                    }
                ],
            },
        )

        def fake_synthesize(**kwargs):
            output_dir = kwargs["output_dir"]
            output_dir.mkdir(parents=True, exist_ok=True)
            (output_dir / "001.wav").write_bytes(b"RIFF-test")
            return [
                {
                    "id": "001",
                    "text": "林和朋友一起喝茶。",
                    "output": "audio/001.wav",
                    "durationSeconds": 1.25,
                    "sampleRate": 24000,
                }
            ]

        checkpointed = server.checkpoint_project_files(project)
        self.assertEqual(checkpointed["status"], "checkpointed")
        self.assertTrue((folder / "checkpoint.json").is_file())

        with patch.object(server, "synthesize_items", side_effect=fake_synthesize):
            audio_ready = server.synthesize_project_audio(checkpointed)
        self.assertEqual(audio_ready["status"], "audio_ready")
        published = server.publish_project_to_flutter(audio_ready)

        target_story = (
            server.FLUTTER_CONTENT_ROOT / "stories" / f"{project['id']}.json"
        )
        target_audio = (
            server.FLUTTER_CONTENT_ROOT / "audio" / f"{project['id']}_001.wav"
        )
        self.assertEqual(published["status"], "published")
        self.assertTrue(target_story.is_file())
        self.assertTrue(target_audio.is_file())
        published_story = json.loads(target_story.read_text(encoding="utf-8"))
        self.assertEqual(
            published_story["segments"][0]["audioFile"],
            f"assets/content/audio/{project['id']}_001.wav",
        )
        library = json.loads(
            (server.FLUTTER_CONTENT_ROOT / "index.json").read_text(encoding="utf-8")
        )
        self.assertEqual(library["stories"][0]["id"], project["id"])

    def test_local_server_serves_interface_and_bootstrap(self):
        httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.WorkshopHandler)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        base_url = f"http://127.0.0.1:{httpd.server_port}"
        try:
            with urllib.request.urlopen(base_url, timeout=5) as response:
                page = response.read().decode("utf-8")
            with urllib.request.urlopen(f"{base_url}/api/bootstrap", timeout=5) as response:
                bootstrap = json.loads(response.read().decode("utf-8"))
        finally:
            httpd.shutdown()
            httpd.server_close()
            thread.join(timeout=5)

        self.assertIn("Story Workshop", page)
        self.assertIn("100–200 words", page)
        self.assertIn("Save checkpoint", page)
        self.assertIn("Generate Qwen audio", page)
        self.assertIn("settings", bootstrap)
        self.assertIn("qwen", bootstrap)
        self.assertEqual(bootstrap["projects"], [])

    def test_http_three_step_workflow(self):
        package_response = {
            "title": {
                "english": "The Kite",
                "chinese": "风筝",
                "pinyin": "Fēngzheng",
            },
            "summary": {
                "english": "Mina finds a kite.",
                "chinese": "米娜找到风筝。",
                "pinyin": "Mǐnà zhǎodào fēngzheng.",
            },
            "segments": [
                {
                    "english": "Mina found the kite.",
                    "chinese": "米娜找到了风筝。",
                    "pinyin": "Mǐnà zhǎodào le fēngzheng.",
                    "audioText": "米娜找到了风筝。",
                    "words": [
                        {"text": "米娜", "pinyin": "Mǐnà", "english": "Mina"},
                        {
                            "text": "找到",
                            "pinyin": "zhǎodào",
                            "english": "to find",
                        },
                        {
                            "text": "了",
                            "pinyin": "le",
                            "english": "completion particle",
                        },
                        {
                            "text": "风筝",
                            "pinyin": "fēngzheng",
                            "english": "kite",
                        },
                        {"text": "。", "pinyin": "", "english": ""},
                    ],
                }
            ],
            "vocabulary": [],
        }

        def fake_deepseek(_messages, *, json_output=False, max_tokens=12000):
            del max_tokens
            if json_output:
                return json.dumps(package_response, ensure_ascii=False), {}
            return "Mina found the kite.", {}

        def fake_synthesize(**kwargs):
            output_dir = kwargs["output_dir"]
            output_dir.mkdir(parents=True, exist_ok=True)
            (output_dir / "001.wav").write_bytes(b"RIFF-test")
            return [
                {
                    "id": "001",
                    "text": "米娜找到了风筝。",
                    "output": "audio/001.wav",
                    "durationSeconds": 1.0,
                    "sampleRate": 24000,
                }
            ]

        def post_json(url, payload):
            request = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=5) as response:
                return json.loads(response.read().decode("utf-8"))

        httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.WorkshopHandler)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        base_url = f"http://127.0.0.1:{httpd.server_port}"
        try:
            with (
                patch.object(server, "deepseek_chat", side_effect=fake_deepseek),
                patch.object(server, "synthesize_items", side_effect=fake_synthesize),
            ):
                created = post_json(
                    f"{base_url}/api/projects",
                    {
                        "title": "The Kite",
                        "idea": "Mina finds a kite.",
                        "level": "HSK 1",
                    },
                )["project"]
                project_id = created["id"]
                generated = post_json(
                    f"{base_url}/api/projects/{project_id}/generate",
                    created,
                )["project"]
                approved = post_json(
                    f"{base_url}/api/projects/{project_id}/approve",
                    generated,
                )["project"]
                localized = post_json(
                    f"{base_url}/api/projects/{project_id}/localize",
                    approved,
                )["project"]
                checkpointed = post_json(
                    f"{base_url}/api/projects/{project_id}/checkpoint",
                    localized,
                )["project"]
                audio_ready = post_json(
                    f"{base_url}/api/projects/{project_id}/synthesize",
                    checkpointed,
                )["project"]
                published = post_json(
                    f"{base_url}/api/projects/{project_id}/publish",
                    audio_ready,
                )["project"]
        finally:
            httpd.shutdown()
            httpd.server_close()
            thread.join(timeout=5)

        self.assertEqual(generated["status"], "review")
        self.assertTrue(approved["approved"])
        self.assertEqual(localized["status"], "files_ready")
        self.assertEqual(checkpointed["status"], "checkpointed")
        self.assertEqual(audio_ready["status"], "audio_ready")
        self.assertEqual(published["status"], "published")
        self.assertEqual(localized["package"]["segments"][0]["audioFile"], "audio/001.wav")


class NewbieLevelTests(WorkshopTestCase):
    def test_newbie_requests_carry_the_hsk1_word_budget(self):
        localization = server.localization_level_rules("HSK 1")

        # A sample of the list itself, not just a description of it.
        self.assertIn("睡觉", localization)
        self.assertIn("商店", localization)
        self.assertIn("at least three times", localization)
        self.assertNotIn("睡觉", server.localization_level_rules("HSK 3"))

    def test_newbie_story_rules_ask_for_repetition(self):
        rules = server.story_level_rules("HSK 1")

        self.assertIn("three times", rules)
        self.assertIn("150–260 Chinese characters", rules)
        self.assertNotIn("150–260", server.story_level_rules("HSK 3"))

    def test_newbie_detection_accepts_the_level_names_in_use(self):
        self.assertTrue(server.is_newbie("HSK 1"))
        self.assertTrue(server.is_newbie("Newbie"))
        self.assertFalse(server.is_newbie("HSK 1–2"))
        self.assertFalse(server.is_newbie(""))


class BookTests(WorkshopTestCase):
    def test_planning_a_book_creates_one_project_per_chapter(self):
        book = self.plan_a_book(chapter_count=4)

        self.assertEqual(len(book["chapters"]), 4)
        self.assertEqual(server.load_book(book["id"])["titleChinese"], "我是猫")
        projects = server.list_projects()
        self.assertEqual(len(projects), 4)
        for chapter in book["chapters"]:
            project = server.load_project(chapter["projectId"])
            self.assertEqual(project["level"], "HSK 1")
            self.assertEqual(project["idea"], chapter["outline"])
            self.assertEqual(project["book"]["chapterNumber"], chapter["number"])
            self.assertEqual(project["book"]["chapterCount"], 4)
            self.assertEqual(project["book"]["id"], book["id"])

    def test_a_short_plan_is_rejected_rather_than_published(self):
        plan = {
            "titleEnglish": "Half a Book",
            "chapters": [
                {"number": 1, "titleEnglish": "One", "outline": "Something happens."}
            ],
        }
        with patch.object(
            server,
            "deepseek_chat",
            return_value=(json.dumps(plan, ensure_ascii=False), {}),
        ):
            with self.assertRaises(server.WorkshopError):
                server.plan_book({"idea": "A book.", "chapterCount": 6})

    def test_chapter_brief_carries_the_book_so_far(self):
        book = self.plan_a_book(chapter_count=4)
        project = server.load_project(book["chapters"][2]["projectId"])

        context = server.book_context_text(project)

        self.assertIn("chapter 3 of 4", context)
        self.assertIn("A stray cat looks for a home.", context)
        self.assertIn("饭饭", context)
        self.assertIn("苹果", context)
        # The outlines of chapters 1 and 2 are history; chapter 4 is not.
        self.assertIn("place 1.", context)
        self.assertIn("place 2.", context)
        self.assertNotIn("place 4.", context)
        self.assertIn("This chapter must cover: The cat eats and sleeps in place 3.", context)

    def test_a_standalone_story_gets_no_book_briefing(self):
        project = server.normalize_project({"title": "Solo", "idea": "One story."})

        self.assertEqual(server.book_context_text(project), "")

    def test_editing_a_chapter_keeps_its_book_reference(self):
        book = self.plan_a_book(chapter_count=4)
        project = server.load_project(book["chapters"][0]["projectId"])

        # The editing form never sends the book reference back.
        updated = server.normalize_project(
            {"title": "Renamed", "idea": "Changed.", "level": "HSK 1"},
            project,
        )

        self.assertEqual(updated["book"]["id"], book["id"])

    def test_deleting_a_chapter_leaves_the_book_openable(self):
        book = self.plan_a_book(chapter_count=4)
        removed = book["chapters"][1]["projectId"]

        server.delete_project(removed)

        reloaded = server.load_book(book["id"])
        self.assertEqual(reloaded["chapters"][1]["projectId"], "")
        self.assertEqual(len(reloaded["chapters"]), 4)

    def test_deleting_a_book_removes_its_chapter_projects(self):
        book = self.plan_a_book(chapter_count=4)

        server.delete_book(book["id"])

        self.assertEqual(server.list_projects(), [])
        self.assertEqual(server.list_books(), [])

    def test_publishing_a_chapter_records_the_book_in_the_library(self):
        book = self.plan_a_book(chapter_count=4)
        project = server.load_project(book["chapters"][0]["projectId"])
        package = {
            "schemaVersion": 1,
            "storyId": project["id"],
            "title": {"english": "Chapter 1", "chinese": "第一章", "pinyin": "Dì yī zhāng"},
            "summary": {"english": "The cat eats.", "chinese": "猫吃饭。", "pinyin": "Māo chī fàn."},
            "level": "HSK 1",
            "segments": [
                {
                    "id": "001",
                    "english": "The cat eats.",
                    "chinese": "猫吃饭。",
                    "pinyin": "Māo chī fàn.",
                    "audioText": "猫吃饭。",
                    "audioFile": "audio/001.wav",
                }
            ],
            "vocabulary": [],
            "audio": {"engine": "Qwen3-TTS", "voice": "Vivian", "language": "Chinese"},
        }
        project["package"] = package
        server.save_project(project)
        folder = server.project_path(project["id"])
        (folder / "audio").mkdir(parents=True, exist_ok=True)
        (folder / "audio" / "001.wav").write_bytes(b"RIFF-test")
        server.atomic_write_json(
            folder / "audio_manifest.json",
            {
                "storyId": project["id"],
                "generatedAt": server.utc_now(),
                "durationSeconds": 2.0,
                "items": [{"id": "001", "text": "猫吃饭。", "output": "audio/001.wav"}],
            },
        )

        with patch.object(server, "generate_slow_variants", return_value={}):
            server.publish_project_to_flutter(project)

        library = json.loads(
            (server.FLUTTER_CONTENT_ROOT / "index.json").read_text(encoding="utf-8")
        )
        entry = library["stories"][0]
        self.assertEqual(entry["book"]["id"], book["id"])
        self.assertEqual(entry["book"]["chapterNumber"], 1)
        self.assertEqual(entry["book"]["chapterCount"], 4)
        self.assertEqual(entry["book"]["titleEnglish"], "I'm a Cat")


if __name__ == "__main__":
    unittest.main()
