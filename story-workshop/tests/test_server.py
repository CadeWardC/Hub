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

import script_convert  # noqa: E402
import server  # noqa: E402
import tocfl  # noqa: E402


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

    def plan_a_book(self, chapter_count=4, level="TOCFL Novice 2"):
        plan = {
            "titleEnglish": "I'm a Cat",
            "titleChinese": "我是貓",
            "titlePinyin": "Wǒ shì māo",
            "summaryEnglish": "A stray cat looks for a home.",
            "characters": [
                {
                    "name": "Fanfan",
                    "chinese": "飯飯",
                    "pinyin": "Fànfan",
                    "about": "A stray cat.",
                }
            ],
            "newWords": [
                {"traditional": "蘋果", "pinyin": "píngguǒ", "english": "apple"}
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
                "level": "TOCFL Novice 2",
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
                "level": "TOCFL Novice 2",
                "englishStory": "Lin shared tea with her friend.",
                "approved": True,
            }
        )
        server.save_project(project)
        response = {
            "schemaVersion": 2,
            "title": {
                "english": "Tea for Two",
                "chinese": "兩個人的茶",
                "pinyin": "Liǎng ge rén de chá",
            },
            "level": "TOCFL Novice 2",
            "summary": {
                "english": "Two friends share tea.",
                "chinese": "兩個朋友一起喝茶。",
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
                {"traditional": "茶", "pinyin": "chá", "english": "tea"}
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

    def test_localization_retries_an_incomplete_word_definition(self):
        project = server.normalize_project(
            {
                "title": "A New Friend",
                "idea": "A child meets a friend.",
                "level": "TOCFL Novice 1",
                "englishStory": "Ami meets a friend.",
                "approved": True,
            }
        )
        server.save_project(project)
        incomplete = {
            "segments": [
                {
                    "english": "Ami meets a friend.",
                    "chinese": "測試名看見朋友。",
                    "pinyin": "Cèshìmíng kànjiàn péngyou.",
                    "audioText": "測試名看見朋友。",
                    "words": [
                        {"text": "測試名", "pinyin": "", "english": ""},
                        {"text": "看見", "pinyin": "kànjiàn", "english": "to see"},
                        {"text": "朋友", "pinyin": "péngyou", "english": "friend"},
                        {"text": "。", "pinyin": "", "english": ""},
                    ],
                }
            ],
            "vocabulary": [],
        }
        repairs = {
            "repairs": [
                {
                    "segment": 1,
                    "word": 1,
                    "text": "測試名",
                    "pinyin": "Cèshìmíng",
                    "english": "Ami (a name)",
                }
            ]
        }

        with patch.object(
            server,
            "deepseek_chat",
            side_effect=[
                (json.dumps(incomplete, ensure_ascii=False), {"total_tokens": 4}),
                (json.dumps(repairs, ensure_ascii=False), {"total_tokens": 6}),
            ],
        ) as chat:
            localized, usage = server.localize_story(project)

        self.assertEqual(chat.call_count, 2)
        self.assertEqual(usage["total_tokens"], 10)
        self.assertEqual(localized["status"], "files_ready")
        repair_prompt = chat.call_args_list[1].args[0][-1]["content"]
        self.assertIn('"word": 1', repair_prompt)
        self.assertIn('"text": "測試名"', repair_prompt)

    def test_audio_publish_copies_assets_into_flutter_library(self):
        project = server.normalize_project(
            {
                "title": "Tea for Two",
                "idea": "Friends share tea.",
                "level": "TOCFL Novice 2",
                "englishStory": "Lin shared tea with her friend.",
                "approved": True,
            }
        )
        package = {
            "schemaVersion": 2,
            "storyId": project["id"],
            "title": {
                "english": "Tea for Two",
                "chinese": "兩個人的茶",
                "pinyin": "Liǎng ge rén de chá",
            },
            "summary": {
                "english": "Friends share tea.",
                "chinese": "朋友一起喝茶。",
                "pinyin": "Péngyou yìqǐ hē chá.",
            },
            "level": "TOCFL Novice 2",
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
                "chinese": "風箏",
                "pinyin": "Fēngzheng",
            },
            "summary": {
                "english": "Mina finds a kite.",
                "chinese": "米娜找到風箏。",
                "pinyin": "Mǐnà zhǎodào fēngzheng.",
            },
            "segments": [
                {
                    "english": "Mina found the kite.",
                    "chinese": "米娜找到了風箏。",
                    "pinyin": "Mǐnà zhǎodào le fēngzheng.",
                    "audioText": "米娜找到了風箏。",
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
                            "text": "風箏",
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
                    "text": "米娜找到了風箏。",
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
                        "level": "TOCFL Novice 2",
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


class TocflLevelTests(WorkshopTestCase):
    def test_budgeted_requests_carry_the_tocfl_word_list(self):
        localization = server.localization_level_rules("TOCFL Novice 2")

        # A sample of the list itself, not just a description of it.
        self.assertIn("睡覺", localization)
        self.assertIn("朋友", localization)
        self.assertIn("at least three times", localization)
        # Level 3 ships no vendored list, so the words must not appear.
        self.assertNotIn("睡覺", server.localization_level_rules("TOCFL Level 3"))

    def test_budgeted_story_rules_ask_for_repetition(self):
        rules = server.story_level_rules("TOCFL Novice 2")

        self.assertIn("three times", rules)
        self.assertIn("150–260 Chinese characters", rules)
        self.assertNotIn("150–260", server.story_level_rules("TOCFL Level 3"))

    def test_every_localization_carries_the_taiwan_rules(self):
        for level in ("TOCFL Novice 1", "TOCFL Level 1", "TOCFL Level 3"):
            rules = server.localization_level_rules(level)
            with self.subTest(level=level):
                self.assertIn("正體字", rules)
                self.assertIn("兒化", rules)
                self.assertIn("lèsè", rules)
                self.assertIn("腳踏車", rules)

    def test_level_names_resolve_including_legacy_hsk_labels(self):
        self.assertEqual(tocfl.normalize("TOCFL Novice 1"), "NOVICE1")
        self.assertEqual(tocfl.normalize("準備級二級"), "NOVICE2")
        self.assertEqual(tocfl.normalize("TOCFL Level 2"), "LEVEL2")
        # Projects saved before the move to TOCFL still open.
        self.assertEqual(tocfl.normalize("HSK 1"), "NOVICE2")
        self.assertEqual(tocfl.normalize("HSK 3"), "LEVEL3")
        # Anything unrecognised falls back to the gentlest level.
        self.assertEqual(tocfl.normalize(""), "NOVICE1")
        self.assertEqual(tocfl.normalize("nonsense"), "NOVICE1")

    def test_only_low_levels_ship_a_word_budget(self):
        self.assertTrue(tocfl.has_word_budget("TOCFL Novice 1"))
        self.assertTrue(tocfl.has_word_budget("TOCFL Level 1"))
        self.assertFalse(tocfl.has_word_budget("TOCFL Level 2"))

    def test_budgets_are_cumulative(self):
        novice1 = {word for word, _, _ in tocfl.NOVICE1_BUDGET}
        novice2 = {word for word, _, _ in tocfl.NOVICE2_BUDGET}
        level1 = {word for word, _, _ in tocfl.LEVEL1_BUDGET}

        self.assertTrue(novice1 < novice2)
        self.assertTrue(novice2 < level1)

    def test_word_budget_uses_taiwan_readings(self):
        budget = dict(
            (word, pinyin) for word, pinyin, _ in tocfl.LEVEL1_BUDGET
        )
        # Taiwan says xīngqí and gives 喜歡 and 眼睛 their full second tone.
        self.assertEqual(budget["星期"], "xīngqí")
        self.assertEqual(budget["喜歡"], "xǐhuān")
        self.assertEqual(budget["眼睛"], "yǎnjīng")


class BookTests(WorkshopTestCase):
    def test_planning_a_book_creates_one_project_per_chapter(self):
        book = self.plan_a_book(chapter_count=4)

        self.assertEqual(len(book["chapters"]), 4)
        self.assertEqual(server.load_book(book["id"])["titleChinese"], "我是貓")
        projects = server.list_projects()
        self.assertEqual(len(projects), 4)
        for chapter in book["chapters"]:
            project = server.load_project(chapter["projectId"])
            self.assertEqual(project["level"], "TOCFL Novice 2")
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
        self.assertIn("飯飯", context)
        self.assertIn("蘋果", context)
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
            {"title": "Renamed", "idea": "Changed.", "level": "TOCFL Novice 2"},
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
            "schemaVersion": 2,
            "storyId": project["id"],
            "title": {"english": "Chapter 1", "chinese": "第一章", "pinyin": "Dì yī zhāng"},
            "summary": {"english": "The cat eats.", "chinese": "貓吃飯。", "pinyin": "Māo chī fàn."},
            "level": "TOCFL Novice 2",
            "segments": [
                {
                    "id": "001",
                    "english": "The cat eats.",
                    "chinese": "貓吃飯。",
                    "pinyin": "Māo chī fàn.",
                    "audioText": "貓吃飯。",
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
                "items": [{"id": "001", "text": "貓吃飯。", "output": "audio/001.wav"}],
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


class ScriptConversionTests(unittest.TestCase):
    """The Traditional-to-Simplified table read out of the reader's dictionary."""

    def test_converts_words_not_just_characters(self):
        self.assertEqual(script_convert.to_simplified("頭髮很長"), "头发很长")
        self.assertEqual(script_convert.to_simplified("學習中文"), "学习中文")
        self.assertEqual(script_convert.to_simplified("臺灣"), "台湾")

    def test_leaves_shared_characters_and_punctuation_alone(self):
        self.assertEqual(script_convert.to_simplified("我是男孩。"), "我是男孩。")
        self.assertEqual(script_convert.to_simplified("A cat 說："), "A cat 说：")
        self.assertEqual(script_convert.to_simplified(""), "")

    def test_converts_script_without_translating_vocabulary(self):
        # 軟體 is the Taiwan word; converting script must not turn it into the
        # mainland's 软件. The Simplified view is Taiwan Mandarin, just written
        # in the other script.
        self.assertEqual(script_convert.to_simplified("軟體"), "软体")

    def test_detects_simplified_characters(self):
        self.assertEqual(script_convert.simplified_only_characters("學習"), [])
        self.assertEqual(script_convert.simplified_only_characters("中文"), [])
        self.assertEqual(
            script_convert.simplified_only_characters("这里有学习"),
            ["这", "学", "习"],
        )


class TraditionalPackageTests(WorkshopTestCase):
    def segment(self, chinese, words):
        return {
            "id": "001",
            "english": "A line.",
            "chinese": chinese,
            "pinyin": "Pīnyīn.",
            "audioText": chinese,
            "words": words,
        }

    def test_validate_derives_simplified_alongside_traditional(self):
        package = server.validate_package(
            {
                "segments": [
                    self.segment(
                        "他學習中文。",
                        [
                            {"text": "他", "pinyin": "tā", "english": "he"},
                            {
                                "text": "學習",
                                "pinyin": "xuéxí",
                                "english": "to study",
                            },
                            {
                                "text": "中文",
                                "pinyin": "Zhōngwén",
                                "english": "Chinese",
                            },
                            {"text": "。", "pinyin": "", "english": ""},
                        ],
                    )
                ],
                "vocabulary": [
                    {"traditional": "學習", "pinyin": "xuéxí", "english": "to study"}
                ],
            }
        )

        segment = package["segments"][0]
        self.assertEqual(segment["chinese"], "他學習中文。")
        self.assertEqual(segment["chineseSimplified"], "他学习中文。")
        # Audio text stays Traditional: 干 would be ambiguous for the synthesiser.
        self.assertEqual(segment["audioText"], "他學習中文。")
        self.assertEqual(segment["words"][1]["textSimplified"], "学习")
        # Characters the scripts share carry no derived form at all.
        self.assertEqual(segment["words"][0]["textSimplified"], "")
        self.assertEqual(package["vocabulary"][0]["simplified"], "学习")
        self.assertEqual(package["schemaVersion"], 2)
        self.assertEqual(package["script"], "traditional")

    def test_validate_rejects_simplified_segments(self):
        with self.assertRaises(server.WorkshopError) as caught:
            server.validate_package(
                {
                    "segments": [
                        self.segment(
                            "他学习中文。",
                            [
                                {"text": "他", "pinyin": "tā", "english": "he"},
                                {
                                    "text": "学习",
                                    "pinyin": "xuéxí",
                                    "english": "to study",
                                },
                                {
                                    "text": "中文",
                                    "pinyin": "Zhōngwén",
                                    "english": "Chinese",
                                },
                                {"text": "。", "pinyin": "", "english": ""},
                            ],
                        )
                    ]
                }
            )

        self.assertIn("Simplified", str(caught.exception))
        self.assertEqual(caught.exception.status, 502)

    def test_dictionary_repairs_isolated_missing_word_metadata(self):
        package = {
            "segments": [
                self.segment(
                    "阿米喝茶。",
                    [
                        {"text": "阿米", "pinyin": "", "english": ""},
                        {"text": "喝", "pinyin": "hē", "english": "to drink"},
                        {"text": "茶", "pinyin": "chá", "english": "tea"},
                        {"text": "。", "pinyin": "", "english": ""},
                    ],
                )
            ],
            "vocabulary": [],
        }

        with patch.object(
            script_convert,
            "word_metadata",
            return_value=("Āmǐ", "Ami (a name)"),
        ):
            repaired = server.validate_package(
                server.repair_package_word_metadata(package)
            )

        word = repaired["segments"][0]["words"][0]
        self.assertEqual(word["pinyin"], "Āmǐ")
        self.assertEqual(word["english"], "Ami (a name)")

    def test_vocabulary_accepts_the_pre_traditional_key(self):
        package = server.validate_package(
            {
                "segments": [
                    self.segment(
                        "茶。",
                        [
                            {"text": "茶", "pinyin": "chá", "english": "tea"},
                            {"text": "。", "pinyin": "", "english": ""},
                        ],
                    )
                ],
                # A checkpoint written before the move to Traditional.
                "vocabulary": [
                    {"simplified": "茶", "pinyin": "chá", "english": "tea"}
                ],
            }
        )

        self.assertEqual(package["vocabulary"][0]["traditional"], "茶")

    def test_published_index_carries_both_scripts(self):
        project = server.normalize_project(
            {
                "title": "Studying",
                "idea": "A student studies.",
                "level": "TOCFL Novice 2",
                "englishStory": "A student studies Chinese.",
                "approved": True,
            }
        )
        package = {
            "schemaVersion": 2,
            "storyId": project["id"],
            "title": {"english": "Studying", "chinese": "學習", "pinyin": "Xuéxí"},
            "summary": {
                "english": "A student studies.",
                "chinese": "他學習中文。",
                "pinyin": "Tā xuéxí Zhōngwén.",
            },
            "level": "TOCFL Novice 2",
            "segments": [
                {
                    "id": "001",
                    "english": "He studies Chinese.",
                    "chinese": "他學習中文。",
                    "chineseSimplified": "他学习中文。",
                    "pinyin": "Tā xuéxí Zhōngwén.",
                    "audioText": "他學習中文。",
                    "audioFile": "audio/001.wav",
                }
            ],
            "vocabulary": [],
            "audio": {"engine": "Qwen3-TTS", "voice": "Vivian"},
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
                "generatedAt": server.utc_now(),
                "durationSeconds": 2.0,
                "items": [
                    {"id": "001", "text": "他學習中文。", "output": "audio/001.wav"}
                ],
            },
        )
        (folder / "audio").mkdir(exist_ok=True)
        (folder / "audio" / "001.wav").write_bytes(b"RIFF0000WAVE")

        with patch.object(server, "generate_slow_variants", return_value={}):
            server.publish_project_to_flutter(project)

        library = json.loads(
            (server.FLUTTER_CONTENT_ROOT / "index.json").read_text(encoding="utf-8")
        )
        entry = library["stories"][0]
        self.assertEqual(entry["titleChinese"], "學習")
        self.assertEqual(entry["titleChineseSimplified"], "学习")
        self.assertEqual(entry["summaryChineseSimplified"], "他学习中文。")
        self.assertEqual(entry["level"], "TOCFL Novice 2")


if __name__ == "__main__":
    unittest.main()
