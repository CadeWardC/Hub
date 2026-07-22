from __future__ import annotations

import copy
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Callable

import requests

from .config import (
    DEEPSEEK_ANNOTATION_WORKERS,
    DEEPSEEK_API_KEY,
    DEEPSEEK_BASE_URL,
    DEEPSEEK_MODEL,
    LEVELS,
)
from .schema import (
    HAN_RE,
    hydrate_story,
    normalize_story_for_spec,
    validate_story,
)


class DeepSeekError(RuntimeError):
    pass


class DeepSeekClient:
    def __init__(self, *, api_key: str | None = None, model: str | None = None) -> None:
        self.api_key = (api_key if api_key is not None else DEEPSEEK_API_KEY).strip()
        self.model = model or DEEPSEEK_MODEL

    @property
    def ready(self) -> bool:
        return bool(self.api_key)

    def _completion(self, system: str, user: str, *, max_tokens: int = 8192) -> dict[str, Any]:
        if not self.ready:
            raise DeepSeekError(
                "DEEPSEEK_API_KEY is missing. Add it to the gitignored repo-root .env file."
            )
        try:
            response = requests.post(
                f"{DEEPSEEK_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "response_format": {"type": "json_object"},
                    # Structured story data benefits from deterministic JSON, not
                    # a long hidden reasoning trace that can consume the entire
                    # completion budget before any content is returned.
                    "thinking": {"type": "disabled"},
                    "temperature": 0.65,
                    "max_tokens": max_tokens,
                },
                timeout=180,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            detail = getattr(exc.response, "text", "")[:1000] or str(exc)
            raise DeepSeekError(f"DeepSeek request failed: {detail}") from exc

        try:
            choice = response.json()["choices"][0]
            message = choice["message"]
            content = message.get("content", "")
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise DeepSeekError(
                f"DeepSeek returned an unexpected response: {response.text[:1000]}"
            ) from exc
        if not content or not content.strip():
            finish_reason = choice.get("finish_reason", "unknown")
            reasoning_size = len(message.get("reasoning_content") or "")
            raise DeepSeekError(
                "DeepSeek returned an empty JSON response "
                f"(finish_reason={finish_reason}, reasoning_chars={reasoning_size})."
            )
        try:
            return json.loads(content)
        except (TypeError, ValueError) as exc:
            raise DeepSeekError(
                f"DeepSeek returned malformed JSON: {content[:1000]}"
            ) from exc

    def generate_story(
        self,
        spec: dict[str, Any],
        *,
        on_annotation_progress: Callable[[int, int], None] | None = None,
    ) -> dict[str, Any]:
        level_id = spec.get("level", "newbie")
        if level_id not in LEVELS:
            raise DeepSeekError(f"Unknown story level: {level_id}")
        level = LEVELS[level_id]
        system = _story_system_prompt()
        user = f"""
Return JSON for one original, family-safe Mandarin graded-reader story.

Level: {level['label']} (HSK-style rank {level['rank']}, primarily a {level['vocabulary']}-character vocabulary base)
Target Chinese length: {level['chars'][0]}–{level['chars'][1]} Han characters
Topic: {spec.get('topic', 'everyday life')}
English title hint: {spec.get('englishTitle', '')}
Genre/tone: {spec.get('genre', 'everyday life with light fiction')}
Special vocabulary or plot notes: {spec.get('notes', '')}

Use simplified Chinese. Split the story into complete sentence or dialogue-turn blocks. Include a narrator and at most three dialogue characters. Use natural, level-appropriate Mandarin, a satisfying ending, and fully contextual English translations. Do not adapt copyrighted stories. Output JSON only.
""".strip()
        last_error = ""
        for attempt in range(3):
            request = user
            if attempt:
                request += (
                    "\nThe previous response was empty, malformed, or invalid. "
                    "Return a complete JSON object and fix these problems: "
                    f"{last_error}"
                )
            try:
                payload = self._completion(
                    system,
                    request,
                    max_tokens=8192 if attempt == 0 else 16384,
                )
            except DeepSeekError as exc:
                last_error = str(exc)
                continue
            if isinstance(payload, list) and len(payload) == 1:
                payload = payload[0]
            if not isinstance(payload, dict):
                last_error = "The JSON root must be an object"
                continue
            story = normalize_story_for_spec(
                hydrate_story(payload.get("story", payload)), spec
            )
            errors = _preannotation_errors(story)
            if not errors:
                total_blocks = len(story["blocks"])
                pending = [
                    (index, block)
                    for index, block in enumerate(story["blocks"])
                    if _annotation_errors(block)
                ]
                completed = total_blocks - len(pending)
                if on_annotation_progress:
                    on_annotation_progress(completed, total_blocks)
                with ThreadPoolExecutor(
                    max_workers=min(DEEPSEEK_ANNOTATION_WORKERS, len(pending) or 1)
                ) as executor:
                    futures = {
                        executor.submit(self.annotate_block, block, level=story["level"]): (
                            index,
                            block,
                        )
                        for index, block in pending
                    }
                    for future in as_completed(futures):
                        index, block = futures[future]
                        try:
                            story["blocks"][index] = future.result()
                        except DeepSeekError as exc:
                            raise DeepSeekError(
                                f"{block['id']} annotation failed: {exc}"
                            ) from exc
                        completed += 1
                        if on_annotation_progress:
                            on_annotation_progress(completed, total_blocks)
                final_errors = validate_story(story)
                if not final_errors:
                    return story
                last_error = "; ".join(final_errors[:20])
                continue
            last_error = "; ".join(errors[:20])
        raise DeepSeekError(f"DeepSeek output did not pass validation: {last_error}")

    def annotate_block(self, block: dict[str, Any], *, level: str) -> dict[str, Any]:
        rank = LEVELS[level]["rank"]
        system = """
You annotate simplified Chinese for a graded reader. Return valid JSON only with keys pinyin, translation, and tokens. tokens must preserve every character and punctuation mark in order so concatenating token.text exactly reproduces the input. Every Chinese lexical token needs tone-mark pinyin, a short contextual English gloss, integer difficulty 1-6, and boolean focus. Punctuation tokens use empty pinyin/gloss, difficulty 0, focus false.
""".strip()
        request = json.dumps(
            {"hanzi": block.get("hanzi", ""), "levelRank": rank},
            ensure_ascii=False,
        )
        last_error = ""
        for attempt in range(3):
            prompt = request
            if attempt:
                prompt += (
                    "\nThe previous annotation was empty, malformed, or invalid. "
                    f"Fix these problems: {last_error}"
                )
            try:
                payload = self._completion(
                    system,
                    prompt,
                    max_tokens=4096 if attempt == 0 else 8192,
                )
            except DeepSeekError as exc:
                last_error = str(exc)
                continue
            if isinstance(payload, list) and len(payload) == 1:
                payload = payload[0]
            if not isinstance(payload, dict):
                last_error = "The annotation JSON root must be an object"
                continue
            updated = dict(block)
            updated.update(
                {
                    "pinyin": payload.get("pinyin", ""),
                    "translation": payload.get(
                        "translation", block.get("translation", "")
                    ),
                    "tokens": payload.get("tokens", []),
                }
            )
            errors = _annotation_errors(updated)
            if not errors:
                return updated
            last_error = "; ".join(errors)
        raise DeepSeekError(f"DeepSeek annotation did not pass validation: {last_error}")


def _annotation_errors(block: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not block.get("pinyin"):
        errors.append("block pinyin is required")
    if not block.get("translation"):
        errors.append("translation is required")
    tokens = block.get("tokens") or []
    if "".join(token.get("text", "") for token in tokens) != block.get("hanzi", ""):
        errors.append("token text must reconstruct the Chinese block")
    for index, token in enumerate(tokens, start=1):
        if HAN_RE.search(token.get("text", "")):
            if not token.get("pinyin"):
                errors.append(f"token {index} pinyin is required")
            if not token.get("gloss"):
                errors.append(f"token {index} contextual gloss is required")
    return errors


def _preannotation_errors(story: dict[str, Any]) -> list[str]:
    """Validate story structure while allowing contextual glosses to be pending."""

    candidate = copy.deepcopy(story)
    for block in candidate.get("blocks", []):
        for token in block.get("tokens", []):
            if HAN_RE.search(token.get("text", "")) and not token.get("gloss"):
                token["gloss"] = "pending annotation"
    return validate_story(candidate)


def _story_system_prompt() -> str:
    return """
You are an expert Mandarin graded-reader editor. Return valid JSON only. The root may be the story object or {"story": STORY}. Use this exact story shape:
{
  "schemaVersion": 1,
  "id": "lowercase-latin-slug",
  "title": "simplified Chinese title",
  "pinyinTitle": "tone-mark pinyin",
  "englishTitle": "English title",
  "summary": "short English teaser",
  "level": "newbie|elementary|intermediate|upper-intermediate|advanced|master",
  "topic": "short category",
  "minutes": 4,
  "glyph": "one Chinese character",
  "colors": ["#D7482F", "#8E2F21"],
  "voices": [
    {"id":"narrator","name":"Narrator","speaker":"Vivian"},
    {"id":"xiaoyu","name":"小雨","speaker":"Serena"},
    {"id":"daming","name":"大明","speaker":"Dylan"}
  ],
  "blocks": [{
    "id": "b001",
    "kind": "narration|dialogue",
    "speakerId": "an id from voices",
    "hanzi": "complete Chinese block",
    "traditional": null,
    "translation": "natural contextual English"
  }]
}
Do not include tokens, block pinyin, or audio metadata; those are added in a separate annotation stage. Keep each narration block to one or two related sentences and each dialogue block to one character's complete turn. Use only these Qwen speakers: Vivian, Serena, Dylan, Uncle_Fu, Eric. Vivian and Serena are female voices; Dylan, Uncle_Fu, and Eric are male voices. Reserve Uncle_Fu and Eric for suitable adult or older male characters.
Use one voice entry for each speaking character, plus the narrator, and no more than three speaking characters. A dialogue block's speakerId must identify the character actually speaking; never reuse another named character's id just because the vocal speaker is the same.
""".strip()
