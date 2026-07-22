from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np

from workshop.draft_store import DraftStore
from workshop.tests.fixtures import valid_story
from workshop.tts_service import AudioJobManager, _split_tts_text


class _FakeTTS:
    def __init__(self) -> None:
        self.texts: list[str] = []
        self.unloads = 0

    def custom_voice(self, *, text: str, speaker: str, instruction: str):
        self.texts.append(text)
        return np.zeros(240, dtype=np.float32), 24000

    def unload(self) -> None:
        self.unloads += 1


class TTSServiceTests(unittest.TestCase):
    def test_long_text_is_split_without_changing_it(self) -> None:
        text = "院子里的人们一起整理旧照片，寻找被遗忘的名字。" * 4
        chunks = _split_tts_text(text)

        self.assertGreater(len(chunks), 1)
        self.assertEqual("".join(chunks), text)
        self.assertTrue(all(len(chunk) <= 16 for chunk in chunks))

    def test_render_block_joins_chunked_qwen_audio_and_caches_it(self) -> None:
        fake = _FakeTTS()
        manager = AudioJobManager(fake)
        text = "这是一段需要分段生成的较长旁白。" * 6

        with tempfile.TemporaryDirectory() as temp_name:
            root = Path(temp_name)
            destination = root / "block.mp3"
            with (
                patch("workshop.tts_service.CACHE_ROOT", root / "cache"),
                patch("workshop.tts_service._encode_mp3") as encode,
                patch("workshop.tts_service._duration_ms", return_value=4321),
            ):
                encode.side_effect = lambda source, target: (
                    target.parent.mkdir(parents=True, exist_ok=True),
                    target.write_bytes(b"mp3"),
                )
                duration = manager._render_block(
                    text=text,
                    speaker="Vivian",
                    instruction="clear",
                    destination=destination,
                )

        self.assertEqual(duration, 4321)
        self.assertEqual("".join(fake.texts), text)
        self.assertGreater(len(fake.texts), 1)
        self.assertEqual(fake.unloads, 0)

    def test_audio_job_unloads_qwen_after_each_completed_block(self) -> None:
        fake = _FakeTTS()
        with tempfile.TemporaryDirectory() as temp_name:
            store = DraftStore(Path(temp_name))
            story = store.save(valid_story())
            manager = AudioJobManager(fake, store)
            manager.jobs["job"] = {
                "id": "job",
                "draftId": story["id"],
                "status": "queued",
                "completed": 0,
                "total": 1,
                "currentBlock": None,
                "error": None,
            }
            with patch.object(manager, "_render_block", return_value=1200):
                manager._run("job", story)

        self.assertEqual(manager.get("job")["status"], "complete")
        self.assertEqual(fake.unloads, 1)


if __name__ == "__main__":
    unittest.main()
