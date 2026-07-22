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
    baseline_tokens,
    hydrate_story,
    normalize_story_for_spec,
    validate_story,
)
from .vocabulary import allowed_words, calibrate_token_difficulty


class DeepSeekError(RuntimeError):
    pass


class DeepSeekValidationError(DeepSeekError):
    """A usable generated draft that did not clear the deterministic gate."""

    def __init__(self, message: str, story: dict[str, Any]) -> None:
        super().__init__(message)
        self.story = story


_PARTICLE_GLOSSES = {
    "了": "completed-action particle",
    "的": "possessive or descriptive particle",
    "地": "adverb marker",
    "得": "complement marker",
    "着": "ongoing-state marker",
    "过": "experiential particle",
    "们": "plural marker",
    "吗": "question particle",
    "呢": "question or topic particle",
    "吧": "suggestion particle",
    "啊": "sentence-final particle",
    "呀": "sentence-final particle",
    "啦": "sentence-final particle",
    "哦": "sentence-final particle",
}


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
        fixed_vocabulary = "、".join(allowed_words(level["rank"]))
        system = _story_system_prompt()
        user = f"""
Return JSON for one original, family-safe Mandarin graded-reader story.

Level: {level['label']} (HSK-style rank {level['rank']}, primarily a {level['vocabulary']}-character vocabulary base)
Target Chinese length: {level['chars'][0]}–{level['chars'][1]} Han characters
Target sections: {level['sections'][0]}–{level['sections'][1]}
Maximum distinct lexical words: {level['max_unique_words']}
Maximum words outside the classic cumulative HSK {level['rank']} list: {level['max_new_words']}
Preferred distinct lexical words for this lesson: no more than {level.get('target_unique_words', level['max_unique_words'])}
Preferred intentionally taught words: no more than {level.get('target_new_words', level['max_new_words'])}
Ideal sentence length: {level.get('target_sentence_hanzi', (4, level['max_block_hanzi']))[0]}â€“{level.get('target_sentence_hanzi', (4, level['max_block_hanzi']))[1]} Han characters
Minimum known-word coverage: {level['min_coverage']:.0%}
Minimum vocabulary repetition: {level['min_repetition']:.2f} uses per distinct word
Maximum Chinese characters in one sentence/dialogue block: {level['max_block_hanzi']}
Topic: {spec.get('topic', 'everyday life')}
English title hint: {spec.get('englishTitle', '')}
Genre/tone: {spec.get('genre', 'everyday life with light fiction')}
Special vocabulary or plot notes: {spec.get('notes', '')}
Requested learning words (use only when natural, and include them in learningWords): {', '.join(spec.get('requestedWords') or [])}
Learning design: {level.get('pedagogy', 'Use one clear theme, repeat core vocabulary, and keep each section focused.')}
Fixed cumulative vocabulary for this level (write with these terms plus only the explicitly planned learningWords): {fixed_vocabulary}

Use simplified Chinese. Stay inside the fixed vocabulary above; do not assume a word is on the list. Write one connected story, divided into meaningful numbered sections. Each section must work as one readable lesson page with a clear mini-purpose, not as disconnected example sentences. Internally split the page into complete short sentences or dialogue turns only for synchronized audio; when joined, they must form one flowing paragraph. Deliberately repeat the same core words and sentence frames. Introduce a word only when the story truly needs it. Put every intentionally introduced above-level term in learningWords and use no other above-level terms. Include a narrator and at most three dialogue characters. Use natural, level-appropriate Mandarin, a satisfying ending, and fully contextual English translations. For Newbie and Elementary, prefer exactly three sections, one simple teaching idea, and a tiny cast. Do not adapt copyrighted stories. Output JSON only.
""".strip()
        last_error = ""
        previous_draft: dict[str, Any] | None = None
        for attempt in range(3):
            request = user
            if attempt:
                request += (
                    "\nRevise the previous draft below instead of starting over. "
                    "Return the entire corrected JSON object. Fix every listed "
                    "problem, keep only the fixed vocabulary and planned learning "
                    "words, and count the Chinese length before answering.\n"
                    f"Problems to fix: {last_error}\n"
                )
                if previous_draft is not None:
                    request += "Previous draft:\n" + json.dumps(
                        _generation_shape(previous_draft), ensure_ascii=False
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
            previous_draft = story
            errors = _preannotation_errors(story)
            if not errors:
                self.annotate_story(story, on_progress=on_annotation_progress)
                final_errors = validate_story(story, enforce_grading=True)
                if not final_errors:
                    return story
                last_error = "; ".join(final_errors[:20])
                continue
            last_error = "; ".join(errors[:20])
        if previous_draft is not None:
            raise DeepSeekValidationError(
                f"DeepSeek output did not pass validation: {last_error}",
                previous_draft,
            )
        raise DeepSeekError(f"DeepSeek output did not pass validation: {last_error}")

    def annotate_story(
        self,
        story: dict[str, Any],
        *,
        force: bool = False,
        on_progress: Callable[[int, int], None] | None = None,
    ) -> dict[str, Any]:
        """Annotate all changed blocks with bounded parallel API requests."""

        total_blocks = len(story.get("blocks", []))
        pending = [
            (index, block)
            for index, block in enumerate(story.get("blocks", []))
            if force or _annotation_errors(block)
        ]
        completed = total_blocks - len(pending)
        if on_progress:
            on_progress(completed, total_blocks)
        with ThreadPoolExecutor(
            max_workers=min(DEEPSEEK_ANNOTATION_WORKERS, len(pending) or 1)
        ) as executor:
            futures = {
                executor.submit(
                    self.annotate_block,
                    block,
                    level=story["level"],
                    context=_annotation_context(story, index),
                ): (
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
                    raise DeepSeekError(f"{block['id']} annotation failed: {exc}") from exc
                completed += 1
                if on_progress:
                    on_progress(completed, total_blocks)
        calibrate_token_difficulty(story)
        return story

    def annotate_block(
        self,
        block: dict[str, Any],
        *,
        level: str,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        rank = LEVELS[level]["rank"]
        system = """
You annotate simplified Chinese for a graded reader. Return valid JSON only with keys pinyin, translation, and tokens. The token.text sequence must exactly equal requiredTokenTexts, including punctuation; do not split, merge, omit, or add token entries. Every Chinese lexical token needs tone-mark pinyin, a short contextual English gloss, integer difficulty 1-6, and boolean focus. Punctuation tokens use empty pinyin/gloss, difficulty 0, focus false. Use the supplied story context to distinguish character names from ordinary words: transliterate a listed character name and never translate it literally (for example, 小雨 as the person Xiaoyu, not “light rain”).
""".strip()
        required_token_texts = _required_token_texts(
            block.get("hanzi", ""), rank, context or {}
        )
        request = json.dumps(
            {
                "hanzi": block.get("hanzi", ""),
                "levelRank": rank,
                "storyContext": context or {},
                "requiredTokenTexts": required_token_texts,
            },
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
            for token in updated["tokens"]:
                if not token.get("gloss") and token.get("text") in _PARTICLE_GLOSSES:
                    token["gloss"] = _PARTICLE_GLOSSES[token["text"]]
            errors = _annotation_errors(updated, required_token_texts)
            if not errors:
                return updated
            last_error = "; ".join(errors)
        raise DeepSeekError(f"DeepSeek annotation did not pass validation: {last_error}")


def _annotation_errors(
    block: dict[str, Any], expected_token_texts: list[str] | None = None
) -> list[str]:
    errors: list[str] = []
    if not block.get("pinyin"):
        errors.append("block pinyin is required")
    if not block.get("translation"):
        errors.append("translation is required")
    tokens = block.get("tokens") or []
    if expected_token_texts is not None and [
        token.get("text", "") for token in tokens
    ] != expected_token_texts:
        errors.append("token texts must exactly match requiredTokenTexts")
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
    return validate_story(candidate, enforce_grading=True)


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
  "gradingProfile": "hsk2-v1",
  "learningWords": ["at most the planned above-level terms"],
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
    "section": 1,
    "hanzi": "complete Chinese block",
    "traditional": null,
    "translation": "natural contextual English"
  }]
}
Do not include tokens, block pinyin, or audio metadata; those are added in a separate annotation stage. Each block must contain one short sentence or one character's short dialogue turn. Section numbers must begin at 1, remain in order, and group the blocks into coherent paragraphs. Reuse common words and sentence patterns instead of constantly introducing synonyms. Use only these Qwen speakers: Vivian, Serena, Dylan, Uncle_Fu, Eric. Vivian and Serena are female voices; Dylan, Uncle_Fu, and Eric are male voices. Reserve Uncle_Fu and Eric for suitable adult or older male characters.
Use one voice entry for each speaking character, plus the narrator, and no more than three speaking characters. A dialogue block's speakerId must identify the character actually speaking; never reuse another named character's id just because the vocal speaker is the same.
""".strip()


def _generation_shape(story: dict[str, Any]) -> dict[str, Any]:
    """Keep only author-facing fields when asking DeepSeek to repair a draft."""

    candidate = copy.deepcopy(story)
    for block in candidate.get("blocks", []):
        block.pop("tokens", None)
        block.pop("pinyin", None)
        block.pop("audio", None)
    return candidate


def _annotation_context(story: dict[str, Any], index: int) -> dict[str, Any]:
    blocks = story.get("blocks", [])
    voices = {voice.get("id"): voice for voice in story.get("voices", [])}
    block = blocks[index]
    return {
        "characterNames": [
            voice.get("name", "")
            for voice in story.get("voices", [])
            if voice.get("id") != "narrator"
        ],
        "speakerName": voices.get(block.get("speakerId"), {}).get("name", ""),
        "learningWords": list(story.get("learningWords") or []),
        "previousChinese": blocks[index - 1].get("hanzi", "") if index else "",
        "nextChinese": blocks[index + 1].get("hanzi", "") if index + 1 < len(blocks) else "",
    }


def _required_token_texts(
    hanzi: str, rank: int, context: dict[str, Any]
) -> list[str]:
    """Use deterministic lexical boundaries, preserving names/teaching words."""

    texts = [token["text"] for token in baseline_tokens(hanzi, rank)]
    preferred = sorted(
        {
            str(value).strip()
            for value in [
                *(context.get("characterNames") or []),
                *(context.get("learningWords") or []),
            ]
            if str(value).strip()
        },
        key=len,
        reverse=True,
    )
    output: list[str] = []
    index = 0
    while index < len(texts):
        matched: tuple[str, int] | None = None
        for phrase in preferred:
            combined = ""
            for end in range(index, len(texts)):
                combined += texts[end]
                if combined == phrase:
                    matched = (phrase, end + 1)
                    break
                if len(combined) >= len(phrase):
                    break
            if matched:
                break
        if matched:
            output.append(matched[0])
            index = matched[1]
        else:
            output.append(texts[index])
            index += 1
    return output
