from __future__ import annotations

import importlib.util
import threading
from pathlib import Path
from typing import Any


_model = None
_model_path: Path | None = None
_model_lock = threading.Lock()


def missing_runtime_modules() -> list[str]:
    required = ("qwen_tts", "torch", "soundfile", "numpy")
    return [name for name in required if importlib.util.find_spec(name) is None]


def _load_model(model_path: Path):
    global _model, _model_path
    if _model is not None and _model_path == model_path:
        return _model

    import torch
    from qwen_tts import Qwen3TTSModel

    if not model_path.is_dir():
        raise FileNotFoundError(f"Qwen CustomVoice model not found: {model_path}")

    if torch.cuda.is_available():
        load_options = {
            "device_map": "cuda:0",
            "dtype": torch.bfloat16,
        }
    else:
        load_options = {
            "device_map": "cpu",
            "dtype": torch.float32,
        }

    print(f"Loading Qwen3-TTS from {model_path}...")
    _model = Qwen3TTSModel.from_pretrained(str(model_path), **load_options)
    _model_path = model_path
    print("Qwen3-TTS is ready.")
    return _model


def synthesize_items(
    *,
    model_path: Path,
    items: list[dict[str, Any]],
    output_dir: Path,
    speaker: str = "Vivian",
    instruct: str = "Speak naturally, clearly, and warmly for a Mandarin learner.",
) -> list[dict[str, Any]]:
    import soundfile as sf

    if not items:
        raise ValueError("The audio manifest contains no items.")

    output_dir.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, Any]] = []
    with _model_lock:
        model = _load_model(model_path)
        for index, item in enumerate(items, start=1):
            item_id = str(item.get("id") or f"{index:03d}")
            text = str(item.get("text") or "").strip()
            if not text:
                raise ValueError(f"Audio item {item_id} has no Chinese text.")

            filename = f"{item_id}.wav"
            output_path = output_dir / filename
            print(f"Synthesizing {index}/{len(items)}: {item_id}")
            wavs, sample_rate = model.generate_custom_voice(
                text=text,
                language="Chinese",
                speaker=speaker,
                instruct=instruct,
                do_sample=True,
            )
            waveform = wavs[0]
            sf.write(output_path, waveform, sample_rate)
            duration_seconds = round(len(waveform) / sample_rate, 3)
            results.append(
                {
                    "id": item_id,
                    "text": text,
                    "output": f"audio/{filename}",
                    "durationSeconds": duration_seconds,
                    "sampleRate": sample_rate,
                }
            )
    return results
