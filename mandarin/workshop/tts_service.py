from __future__ import annotations

import gc
import hashlib
import json
import shutil
import subprocess
import tempfile
import threading
import uuid
from pathlib import Path
from typing import Any

from .config import CACHE_ROOT, LEVELS, MODEL_PATHS, SUPPORTED_SPEAKERS
from .draft_store import DraftStore
from .schema import validate_story, write_json


class TTSService:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._loaded_kind: str | None = None
        self._model = None
        self.device = "not loaded"

    def model_ready(self, kind: str) -> bool:
        path = MODEL_PATHS[kind]
        return path.is_dir() and (path / "config.json").is_file()

    def unload(self) -> None:
        """Release model and CUDA allocator state between independent jobs."""

        with self._lock:
            if self._model is None:
                return
            del self._model
            self._model = None
            self._loaded_kind = None
            self.device = "not loaded"
            gc.collect()
            import torch

            if torch.cuda.is_available():
                try:
                    torch.cuda.empty_cache()
                except RuntimeError:
                    # Preserve the original generation error if CUDA has already
                    # entered an error state after an out-of-memory condition.
                    pass

    def _load(self, kind: str):
        if kind not in ("custom", "base"):
            raise ValueError(f"Unknown Qwen model kind: {kind}")
        if not self.model_ready(kind):
            raise FileNotFoundError(
                f"{MODEL_PATHS[kind].name} is missing. Run download_models.py first."
            )
        if self._model is not None and self._loaded_kind == kind:
            return self._model

        import torch
        from qwen_tts import Qwen3TTSModel

        if self._model is not None:
            self.unload()

        using_cuda = torch.cuda.is_available()
        self.device = "cuda" if using_cuda else "cpu"
        self._model = Qwen3TTSModel.from_pretrained(
            str(MODEL_PATHS[kind]),
            device_map="cuda:0" if using_cuda else "cpu",
            dtype=torch.bfloat16 if using_cuda else torch.float32,
        )
        self._loaded_kind = kind
        return self._model

    def custom_voice(self, *, text: str, speaker: str, instruction: str) -> tuple[Any, int]:
        if speaker not in SUPPORTED_SPEAKERS:
            raise ValueError(f"Unsupported Qwen speaker: {speaker}")
        with self._lock:
            model = self._load("custom")
            try:
                wavs, sample_rate = model.generate_custom_voice(
                    text=text,
                    language="Chinese",
                    speaker=speaker,
                    instruct=instruction or None,
                )
                waveform = wavs[0]
                del wavs
            finally:
                # The 1.7B model fits an 8 GB card, but generation scratch space
                # from one call should not accumulate into the next block.
                gc.collect()
                import torch

                if torch.cuda.is_available():
                    try:
                        torch.cuda.empty_cache()
                    except RuntimeError:
                        pass
        return waveform, sample_rate

    def voice_clone(
        self, *, text: str, reference_path: Path, reference_text: str
    ) -> tuple[Any, int]:
        with self._lock:
            model = self._load("base")
            wavs, sample_rate = model.generate_voice_clone(
                text=text,
                language="Chinese",
                ref_audio=str(reference_path),
                ref_text=reference_text,
            )
        return wavs[0], sample_rate


class AudioJobManager:
    def __init__(self, service: TTSService, store: DraftStore | None = None) -> None:
        self.service = service
        self.store = store or DraftStore()
        self.jobs: dict[str, dict[str, Any]] = {}
        self._jobs_lock = threading.Lock()

    def start(self, draft_id: str) -> str:
        story = self.store.get(draft_id)
        errors = validate_story(story, enforce_grading=True)
        if errors:
            raise ValueError(
                "Fix the story before rendering audio: " + "; ".join(errors)
            )
        job_id = uuid.uuid4().hex
        self.jobs[job_id] = {
            "id": job_id,
            "draftId": draft_id,
            "status": "queued",
            "completed": 0,
            "total": len(story.get("blocks", [])),
            "currentBlock": None,
            "error": None,
        }
        thread = threading.Thread(
            target=self._run,
            args=(job_id, story),
            name=f"mandarin-audio-{job_id[:8]}",
            daemon=True,
        )
        thread.start()
        return job_id

    def get(self, job_id: str) -> dict[str, Any]:
        if job_id not in self.jobs:
            raise KeyError(job_id)
        return dict(self.jobs[job_id])

    def _update(self, job_id: str, **values: Any) -> None:
        with self._jobs_lock:
            self.jobs[job_id].update(values)

    def _run(self, job_id: str, story: dict[str, Any]) -> None:
        try:
            self._update(job_id, status="running")
            voices = {voice["id"]: voice for voice in story["voices"]}
            audio_root = self.store.audio_root(story["id"])
            rank = LEVELS[story["level"]]["rank"]
            instruction = _instruction_for_level(rank)
            for index, block in enumerate(story["blocks"], start=1):
                self._update(job_id, currentBlock=block["id"])
                speaker = voices[block["speakerId"]]["speaker"]
                duration = self._render_block(
                    text=block["hanzi"],
                    speaker=speaker,
                    instruction=instruction,
                    destination=audio_root / f"{block['id']}.mp3",
                )
                block["audio"] = {
                    "path": f"audio/{block['id']}.mp3",
                    "durationMs": duration,
                }
                write_json(self.store._path(story["id"]) / "story.json", story)
                self._update(job_id, completed=index)
                release = getattr(self.service, "unload", None)
                if callable(release):
                    release()
            self._update(job_id, status="complete", currentBlock=None)
        except Exception as exc:
            self._update(job_id, status="failed", error=str(exc), currentBlock=None)

    def _render_block(
        self, *, text: str, speaker: str, instruction: str, destination: Path
    ) -> int:
        digest = hashlib.sha256(
            json.dumps(
                {"text": text, "speaker": speaker, "instruction": instruction},
                ensure_ascii=False,
                sort_keys=True,
            ).encode("utf-8")
        ).hexdigest()
        cache_mp3 = CACHE_ROOT / f"{digest}.mp3"
        cache_meta = CACHE_ROOT / f"{digest}.json"
        if cache_mp3.is_file() and cache_meta.is_file():
            shutil.copy2(cache_mp3, destination)
            return int(json.loads(cache_meta.read_text(encoding="utf-8"))["durationMs"])

        import soundfile as sf

        import numpy as np

        waveforms = []
        sample_rate: int | None = None
        for chunk in _split_tts_text(text):
            waveform, chunk_rate = self.service.custom_voice(
                text=chunk, speaker=speaker, instruction=instruction
            )
            if sample_rate is None:
                sample_rate = chunk_rate
            elif chunk_rate != sample_rate:
                raise RuntimeError("Qwen returned inconsistent sample rates")
            waveforms.append(np.asarray(waveform))
        if not waveforms or sample_rate is None:
            raise ValueError("Cannot render an empty story block")
        waveform = waveforms[0] if len(waveforms) == 1 else np.concatenate(waveforms)
        with tempfile.TemporaryDirectory(prefix="qwen-tts-") as temp_name:
            wav_path = Path(temp_name) / "source.wav"
            sf.write(wav_path, waveform, sample_rate)
            _encode_mp3(wav_path, cache_mp3)
        duration = _duration_ms(cache_mp3)
        cache_meta.write_text(json.dumps({"durationMs": duration}), encoding="utf-8")
        shutil.copy2(cache_mp3, destination)
        return duration


def _instruction_for_level(rank: int) -> str:
    if rank <= 2:
        return "清晰、自然、稍慢地朗读，停顿明确，适合初学中文的人跟读。"
    if rank <= 4:
        return "用清晰自然的普通话朗读，语气生动，速度适中，适合中文学习者。"
    return "用自然、有表现力的普通话朗读，保持清楚的发音和舒适的节奏。"


def _split_tts_text(text: str, max_chars: int = 16) -> list[str]:
    """Split long reader blocks for bounded GPU generation, preserving text."""

    if not text:
        return []
    hard_boundaries = set("。！？!?；;")
    soft_boundaries = set("，、,：:")
    chunks: list[str] = []
    start = 0
    while start < len(text):
        limit = min(start + max_chars, len(text))
        if limit == len(text):
            chunks.append(text[start:])
            break

        minimum = start + max(1, max_chars // 2)
        end = next(
            (
                index
                for index in range(limit, minimum - 1, -1)
                if text[index - 1] in hard_boundaries
            ),
            0,
        )
        if not end:
            end = next(
                (
                    index
                    for index in range(limit, minimum - 1, -1)
                    if text[index - 1] in soft_boundaries
                ),
                limit,
            )
        chunks.append(text[start:end])
        start = end
    return chunks


def _encode_mp3(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    command = [
        "ffmpeg",
        "-y",
        "-loglevel",
        "error",
        "-i",
        str(source),
        "-af",
        "loudnorm=I=-18:TP=-1.5:LRA=11",
        "-ac",
        "1",
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "96k",
        str(destination),
    ]
    subprocess.run(command, check=True, capture_output=True, text=True)


def _duration_ms(path: Path) -> int:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return round(float(result.stdout.strip()) * 1000)
