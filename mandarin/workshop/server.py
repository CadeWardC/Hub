from __future__ import annotations

import io
import shutil
import tempfile
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request, send_file, send_from_directory

from .config import LEVELS, MODEL_PATHS, SUPPORTED_SPEAKERS
from .deepseek_client import DeepSeekClient, DeepSeekValidationError
from .draft_store import DraftStore
from .publisher import Publisher
from .schema import (
    hydrate_story,
    normalize_story_for_spec,
    read_json,
    validate_story,
)
from .tts_service import AudioJobManager, TTSService
from .vocabulary import analyze_story, calibrate_token_difficulty, sync_learning_words


HERE = Path(__file__).resolve().parent
app = Flask(__name__, static_folder=None)
store = DraftStore()
deepseek = DeepSeekClient()
tts = TTSService()
jobs = AudioJobManager(tts, store)
publisher = Publisher(store)


@app.get("/")
def index():
    return send_from_directory(HERE, "index.html")


@app.get("/<path:filename>")
def static_files(filename: str):
    if filename.startswith("api/") or filename.startswith("../"):
        return jsonify({"error": "Not found"}), 404
    return send_from_directory(HERE, filename)


@app.get("/api/status")
def status():
    return jsonify(
        {
            "server": True,
            "deepseek": {"ready": deepseek.ready, "model": deepseek.model},
            "qwen": {
                "device": tts.device,
                "models": {kind: tts.model_ready(kind) for kind in MODEL_PATHS},
                "speakers": SUPPORTED_SPEAKERS,
            },
            "ffmpeg": shutil.which("ffmpeg") is not None,
            "gradingProfile": "hsk2-v2",
            "levels": LEVELS,
        }
    )


@app.get("/api/stories/drafts")
def list_drafts():
    return jsonify({"drafts": store.list()})


@app.get("/api/starter-prompts")
def starter_prompts():
    return jsonify(read_json(HERE / "starter_prompts.json", {"stories": []}))


@app.post("/api/stories/drafts")
def create_draft():
    spec = request.get_json(silent=True) or {}
    try:
        story = normalize_story_for_spec(deepseek.generate_story(spec), spec)
        errors: list[str] = []
    except DeepSeekValidationError as error:
        story = normalize_story_for_spec(hydrate_story(error.story), spec)
        errors = validate_story(story, enforce_grading=True)
    story = store.save(story)
    return jsonify({**_story_payload(story), "errors": errors}), 201


@app.get("/api/stories/drafts/<draft_id>")
def get_draft(draft_id: str):
    return jsonify(_story_payload(store.get(draft_id)))


@app.put("/api/stories/drafts/<draft_id>")
def update_draft(draft_id: str):
    story = hydrate_story((request.get_json(silent=True) or {}).get("story", {}))
    if story.get("id") != draft_id:
        return jsonify({"error": "Draft id cannot be changed while editing."}), 400
    story = store.save(story)
    return jsonify(
        {
            **_story_payload(story),
            "errors": validate_story(story, enforce_grading=True),
        }
    )


@app.post("/api/stories/drafts/<draft_id>/annotate/<block_id>")
def annotate_block(draft_id: str, block_id: str):
    story = store.get(draft_id)
    index = next(
        (index for index, block in enumerate(story["blocks"]) if block["id"] == block_id),
        None,
    )


    if index is None:
        return jsonify({"error": f"Unknown block: {block_id}"}), 404
    story["blocks"][index] = deepseek.annotate_block(
        story["blocks"][index],
        level=story["level"],
        context={
            "characterNames": [
                voice.get("name", "")
                for voice in story.get("voices", [])
                if voice.get("id") != "narrator"
            ],
            "speakerName": next(
                (
                    voice.get("name", "")
                    for voice in story.get("voices", [])
                    if voice.get("id") == story["blocks"][index].get("speakerId")
                ),
                "",
            ),
            "previousChinese": story["blocks"][index - 1].get("hanzi", "")
            if index
            else "",
            "nextChinese": story["blocks"][index + 1].get("hanzi", "")
            if index + 1 < len(story["blocks"])
            else "",
        },
    )
    calibrate_token_difficulty(story)
    store.save(story)
    return jsonify(
        {
            "block": story["blocks"][index],
            "report": analyze_story(story).to_json(),
        }
    )


@app.post("/api/stories/drafts/<draft_id>/annotate")
def annotate_story(draft_id: str):
    story = store.get(draft_id)
    force = bool((request.get_json(silent=True) or {}).get("force"))
    story = deepseek.annotate_story(story, force=force)
    story = store.save(story)
    return jsonify(
        {
            **_story_payload(story),
            "errors": validate_story(story, enforce_grading=True),
        }
    )


@app.post("/api/stories/drafts/<draft_id>/vocabulary")
def sync_vocabulary(draft_id: str):
    story = store.get(draft_id)
    sync_learning_words(story)
    story = store.save(story)
    return jsonify(
        {
            **_story_payload(story),
            "errors": validate_story(story, enforce_grading=True),
        }
    )


@app.post("/api/stories/drafts/<draft_id>/validate")
def validate_draft(draft_id: str):
    story = store.get(draft_id)
    require_audio = bool((request.get_json(silent=True) or {}).get("requireAudio"))
    errors = validate_story(
        story,
        require_audio=require_audio,
        audio_root=store.audio_root(draft_id) if require_audio else None,
        enforce_grading=True,
    )
    return jsonify(
        {
            "valid": not errors,
            "errors": errors,
            "report": analyze_story(story).to_json(),
        }
    )


@app.post("/api/stories/drafts/<draft_id>/audio/jobs")
def start_audio_job(draft_id: str):
    job_id = jobs.start(draft_id)
    return jsonify({"job": jobs.get(job_id)}), 202


@app.get("/api/jobs/<job_id>")
def get_job(job_id: str):
    return jsonify({"job": jobs.get(job_id)})


@app.get("/api/stories/drafts/<draft_id>/audio/<filename>")
def draft_audio(draft_id: str, filename: str):
    return send_from_directory(store.audio_root(draft_id), Path(filename).name)


@app.post("/api/stories/drafts/<draft_id>/publish")
def publish_draft(draft_id: str):
    return jsonify({"entry": publisher.publish(draft_id)})


@app.post("/api/tts")
def tts_preview():
    if request.is_json:
        payload: Any = request.get_json(silent=True) or {}
        mode = payload.get("mode", "custom")
    else:
        payload = request.form
        mode = payload.get("mode", "base")
    text = str(payload.get("text", "")).strip()
    if not text:
        return jsonify({"error": "Text is required."}), 400
    if len(text) > 1200:
        return jsonify({"error": "Keep previews under 1,200 characters."}), 400

    if mode == "custom":
        waveform, sample_rate = tts.custom_voice(
            text=text,
            speaker=str(payload.get("speaker", "Vivian")),
            instruction=str(payload.get("instruction", "")).strip(),
        )
    elif mode == "base":
        reference = request.files.get("ref_audio")
        reference_text = str(payload.get("ref_text", "")).strip()
        if reference is None or not reference_text:
            return jsonify({"error": "Reference audio and its transcript are required."}), 400
        suffix = Path(reference.filename or "reference.wav").suffix or ".wav"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as handle:
            path = Path(handle.name)
            reference.save(handle)
        try:
            waveform, sample_rate = tts.voice_clone(
                text=text, reference_path=path, reference_text=reference_text
            )
        finally:
            path.unlink(missing_ok=True)
    else:
        return jsonify({"error": "Mode must be custom or base."}), 400

    import soundfile as sf

    buffer = io.BytesIO()
    sf.write(buffer, waveform, sample_rate, format="WAV")
    buffer.seek(0)
    return send_file(buffer, mimetype="audio/wav", download_name="preview.wav")


@app.errorhandler(Exception)
def handle_error(error: Exception):
    app.logger.exception("Workshop request failed")
    status_code = 404 if isinstance(error, (FileNotFoundError, KeyError)) else 400
    return jsonify({"error": str(error)}), status_code


def _story_payload(story: dict[str, Any]) -> dict[str, Any]:
    return {"story": story, "report": analyze_story(story).to_json()}


def main() -> None:
    app.run(host="127.0.0.1", port=8765, debug=False, threaded=True)


if __name__ == "__main__":
    main()
