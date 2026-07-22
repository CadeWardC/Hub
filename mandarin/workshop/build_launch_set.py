"""Batch helpers for the reviewed 12-story launch set.

Generation, audio rendering, and publishing remain separate commands so an
editor can inspect the ignored drafts between each irreversible content step.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path
from typing import Any

from .config import STORY_ROOT
from .deepseek_client import DeepSeekClient
from .draft_store import DraftStore
from .publisher import Publisher
from .schema import (
    HAN_RE,
    normalize_story_for_spec,
    read_json,
    slugify,
    validate_story,
)
from .tts_service import AudioJobManager, TTSService


PROMPTS_PATH = Path(__file__).with_name("starter_prompts.json")


def _specs(only: list[str] | None = None) -> list[dict[str, Any]]:
    stories = read_json(PROMPTS_PATH, {"stories": []})["stories"]
    if not only:
        return stories
    requested = {slugify(value) for value in only}
    selected = [
        story
        for story in stories
        if story["id"] in requested or slugify(story["englishTitle"]) in requested
    ]
    matched = {
        value
        for story in selected
        for value in (story["id"], slugify(story["englishTitle"]))
    }
    missing = requested - matched
    if missing:
        raise ValueError(f"Unknown launch story: {', '.join(sorted(missing))}")
    return selected


def _normalize(story: dict[str, Any], spec: dict[str, Any]) -> dict[str, Any]:
    return normalize_story_for_spec(story, spec)


def generate(specs: list[dict[str, Any]], *, force: bool) -> None:
    client = DeepSeekClient()
    store = DraftStore()
    failures: list[str] = []
    for index, spec in enumerate(specs, start=1):
        story_id = spec["id"]
        draft_path = store._path(story_id) / "story.json"
        if draft_path.is_file() and not force:
            print(f"[{index}/{len(specs)}] {story_id}: existing draft kept", flush=True)
            continue
        print(f"[{index}/{len(specs)}] {story_id}: asking DeepSeek", flush=True)
        try:
            def report_annotation(completed: int, total: int) -> None:
                print(
                    f"[{index}/{len(specs)}] {story_id}: "
                    f"annotated {completed}/{total} blocks",
                    flush=True,
                )

            story = store.save(
                _normalize(
                    client.generate_story(
                        spec, on_annotation_progress=report_annotation
                    ),
                    spec,
                )
            )
            errors = validate_story(story)
            if errors:
                raise ValueError("; ".join(errors))
            characters = sum(len(HAN_RE.findall(block["hanzi"])) for block in story["blocks"])
            print(
                f"[{index}/{len(specs)}] {story_id}: saved "
                f"{len(story['blocks'])} blocks, {characters} Han characters",
                flush=True,
            )
        except Exception as exc:
            failures.append(f"{story_id}: {exc}")
            print(f"[{index}/{len(specs)}] {story_id}: FAILED: {exc}", flush=True)
    if failures:
        raise RuntimeError("\n".join(failures))


def render(specs: list[dict[str, Any]]) -> None:
    store = DraftStore()
    for index, spec in enumerate(specs, start=1):
        service = TTSService()
        manager = AudioJobManager(service, store)
        story_id = spec["id"]
        story = store.get(story_id)
        errors = validate_story(story)
        if errors:
            raise ValueError(f"{story_id}: {'; '.join(errors)}")
        print(f"[{index}/{len(specs)}] {story_id}: rendering audio", flush=True)
        try:
            job_id = manager.start(story_id)
            last_completed = -1
            while True:
                job = manager.get(job_id)
                if job["completed"] != last_completed:
                    last_completed = job["completed"]
                    print(
                        f"[{index}/{len(specs)}] {story_id}: "
                        f"{last_completed}/{job['total']} blocks",
                        flush=True,
                    )
                if job["status"] == "complete":
                    break
                if job["status"] == "failed":
                    raise RuntimeError(f"{story_id}: {job['error']}")
                time.sleep(1)
        finally:
            service.unload()


def publish(specs: list[dict[str, Any]]) -> None:
    publisher = Publisher()
    for index, spec in enumerate(specs, start=1):
        story_id = spec["id"]
        entry = publisher.publish(story_id)
        print(
            f"[{index}/{len(specs)}] {story_id}: published {entry['blockCount']} blocks",
            flush=True,
        )


def status(specs: list[dict[str, Any]]) -> None:
    store = DraftStore()
    for spec in specs:
        story_id = spec["id"]
        draft_path = store._path(story_id) / "story.json"
        if not draft_path.is_file():
            print(f"{story_id}: missing draft")
            continue
        story = store.get(story_id)
        draft_errors = validate_story(story)
        full_errors = validate_story(
            story,
            require_audio=True,
            audio_root=store.audio_root(story_id),
        )
        audio_errors = [
            error
            for error in full_errors
            if "rendered audio" in error or "audio duration" in error
        ]
        published = (STORY_ROOT / story_id / "story.json").is_file()
        han_counts = [len(HAN_RE.findall(block["hanzi"])) for block in story["blocks"]]
        draft_state = "valid" if not draft_errors else f"invalid ({len(draft_errors)} errors)"
        audio_state = "ready" if not audio_errors else f"missing ({len(audio_errors)} errors)"
        print(
            f"{story_id}: draft={draft_state}; audio={audio_state}; "
            f"blocks={len(story['blocks'])}; han={sum(han_counts)}; "
            f"max_block={max(han_counts, default=0)}; published={published}"
        )


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("status", "generate", "render", "publish"))
    parser.add_argument(
        "--only",
        action="append",
        help="Limit work to one planned English title or slug; repeat as needed.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Replace existing drafts during generation.",
    )
    args = parser.parse_args()
    selected = _specs(args.only)
    if args.command == "generate":
        generate(selected, force=args.force)
    elif args.command == "render":
        render(selected)
    elif args.command == "publish":
        publish(selected)
    else:
        status(selected)


if __name__ == "__main__":
    main()
