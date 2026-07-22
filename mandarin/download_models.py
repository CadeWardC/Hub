"""Download the local Qwen3-TTS models used by Mandarin Studio.

The snapshots are intentionally stored under ``mandarin/models``. That folder
is ignored by Git because the complete three-snapshot stack totals about 9 GiB.
Run this file again at any time; Hugging Face resumes and verifies downloads.
"""

from pathlib import Path

from huggingface_hub import snapshot_download


MODELS = (
    "Qwen/Qwen3-TTS-Tokenizer-12Hz",
    "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
)


def main() -> None:
    model_root = Path(__file__).resolve().parent / "models"
    model_root.mkdir(parents=True, exist_ok=True)

    for repo_id in MODELS:
        destination = model_root / repo_id.rsplit("/", 1)[-1]
        print(f"Downloading {repo_id} -> {destination}", flush=True)
        snapshot_download(
            repo_id=repo_id,
            local_dir=destination,
            max_workers=4,
        )
        print(f"Finished {repo_id}", flush=True)

    print("All Qwen3-TTS models are ready.", flush=True)


if __name__ == "__main__":
    main()
