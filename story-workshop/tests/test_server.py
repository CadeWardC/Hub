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


class WorkshopTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        data_root = Path(self.temporary.name)
        self.original_paths = (
            server.DATA_ROOT,
            server.PROJECTS_ROOT,
            server.SETTINGS_FILE,
            server.FLUTTER_CONTENT_ROOT,
        )
        server.DATA_ROOT = data_root
        server.PROJECTS_ROOT = data_root / "projects"
        server.SETTINGS_FILE = data_root / "settings.json"
        server.FLUTTER_CONTENT_ROOT = data_root / "flutter_content"
        server.ensure_data_dirs()

    def tearDown(self):
        (
            server.DATA_ROOT,
            server.PROJECTS_ROOT,
            server.SETTINGS_FILE,
            server.FLUTTER_CONTENT_ROOT,
        ) = self.original_paths
        self.temporary.cleanup()

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


if __name__ == "__main__":
    unittest.main()
