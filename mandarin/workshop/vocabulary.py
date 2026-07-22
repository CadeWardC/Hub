from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import jieba

from .config import LEVELS


HAN_RE = re.compile(r"[\u3400-\u9fff]")
HAN_RUN_RE = re.compile(r"[\u3400-\u9fff]+")
DATA_PATH = Path(__file__).resolve().parent / "data" / "hsk2.json"
CLASSIFIER_PREFIXES = frozenset("\u96f6\u4e00\u4e8c\u4e24\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u4e07\u51e0\u6bcf")


@dataclass(frozen=True)
class VocabularyReport:
    level: str
    hanzi_count: int
    lexical_uses: int
    unique_words: int
    known_uses: int
    coverage: float
    repetition: float
    new_words: tuple[str, ...]
    learning_words: tuple[str, ...]
    unplanned_words: tuple[str, ...]
    max_block_hanzi: int
    section_count: int

    def to_json(self) -> dict[str, Any]:
        value = asdict(self)
        value["coverage"] = round(self.coverage, 4)
        value["repetition"] = round(self.repetition, 2)
        return value


@lru_cache(maxsize=1)
def _levels() -> dict[int, frozenset[str]]:
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    return {
        int(level): frozenset(words)
        for level, words in payload["levels"].items()
    }


def hsk_level(word: str) -> int | None:
    if not word or not HAN_RE.search(word):
        return None
    for rank, words in _levels().items():
        if word in words:
            return rank
    return None


def allowed_words(rank: int) -> tuple[str, ...]:
    """Return the pinned cumulative vocabulary for a reader level."""

    return tuple(sorted(_levels()[max(1, min(6, rank))]))


@lru_cache(maxsize=1)
def _component_ranks() -> dict[str, int]:
    """Map productive single-character forms to their earliest HSK band.

    The classic list sometimes records only a base compound (for example,
    ``说话``) even though a graded story naturally uses the productive form
    ``说``.  Treating that character as a separate new lexical item inflated
    the teaching list with grammar fragments instead of useful vocabulary.
    Multi-character words must still appear in the fixed list or the story's
    explicit learning words.
    """

    ranks: dict[str, int] = {}
    for rank in range(1, 7):
        for word in _levels()[rank]:
            for character in word:
                ranks.setdefault(character, rank)
    return ranks


def _is_known(word: str, rank: int) -> bool:
    return word in _levels()[rank] or (
        len(word) == 1 and _component_ranks().get(word, 7) <= rank
    )


@lru_cache(maxsize=6)
def _ranked_words(rank: int) -> dict[str, int]:
    words: dict[str, int] = {}
    for level in range(1, 7):
        for word in _levels()[level]:
            words.setdefault(word, level)
    return words


def _segment_han(
    text: str,
    extras: set[str] | None = None,
    preferred: set[str] | None = None,
) -> list[str]:
    """Segment with the fixed HSK lexicon, preferring real longer entries.

    This avoids counting normal combinations such as 没 + 有 and 他 + 们 as
    mysterious new words merely because a general-purpose tokenizer joins them.
    """

    extras = {word for word in (extras or set()) if word}
    preferred_source = extras if preferred is None else preferred
    preferred = {word for word in preferred_source if word}
    ranked = _ranked_words(6)
    lexicon = set(ranked) | extras
    maximum = max((len(word) for word in lexicon), default=1)
    size = len(text)
    # Each item is (unknown character count, token count, negative known length,
    # tokens). The ordering favors full known terms, then fewer/longer tokens.
    best: list[tuple[int, int, int, list[str]] | None] = [None] * (size + 1)
    best[size] = (0, 0, 0, [])
    for start in range(size - 1, -1, -1):
        candidates: list[tuple[int, int, int, list[str]]] = []
        for length in range(1, min(maximum, size - start) + 1):
            word = text[start : start + length]
            if word not in lexicon:
                continue
            tail = best[start + length]
            if tail is not None:
                candidates.append(
                    (
                        tail[0],
                        tail[1] + 1,
                        tail[2] - length * length - (1000 if word in preferred else 0),
                        [word, *tail[3]],
                    )
                )
        tail = best[start + 1]
        if tail is not None:
            candidates.append((tail[0] + 1, tail[1] + 1, tail[2], [text[start], *tail[3]]))
        best[start] = min(candidates, key=lambda item: item[:3])
    return best[0][3] if best[0] else list(text)


def _normalize_classifier_tokens(tokens: list[str]) -> list[str]:
    """Avoid reading number + classifier + person as the word 'individual'."""

    output: list[str] = []
    for token in tokens:
        if (
            token == "\u4e2a\u4eba"
            and output
            and output[-1][-1] in CLASSIFIER_PREFIXES
        ):
            output.extend(("\u4e2a", "\u4eba"))
        else:
            output.append(token)
    return output


def lexical_words(story: dict[str, Any]) -> list[str]:
    words: list[str] = []
    learning = set(story.get("learningWords") or [])
    names = {
        voice.get("name", "")
        for voice in story.get("voices", [])
        if voice.get("id") != "narrator"
    }
    ranked = _ranked_words(6)
    extras = set(names)
    for word in learning:
        base_parts = _segment_han(word, names)
        if hsk_level(word) is not None or any(
            part not in ranked and part not in names for part in base_parts
        ):
            extras.add(word)
    for block in story.get("blocks", []):
        for run in HAN_RUN_RE.findall(block.get("hanzi", "")):
            run_extras = set(extras)
            # Preserve genuine unknown compounds found by jieba, while still
            # decomposing ordinary combinations such as 没有 and 他们 into
            # their fixed-list parts. Requiring two unknown characters keeps
            # phrases such as 雨很大 from being mislabeled as one new word.
            for candidate in jieba.lcut(run, HMM=False):
                parts = _segment_han(candidate, extras)
                unknown_characters = sum(
                    len(part)
                    for part in parts
                    if part not in ranked and part not in extras
                )
                if unknown_characters >= 2:
                    run_extras.add(candidate)
            words.extend(
                _normalize_classifier_tokens(_segment_han(run, run_extras, extras))
            )
    return words


def analyze_story(story: dict[str, Any]) -> VocabularyReport:
    level_id = story.get("level", "newbie")
    rank = LEVELS.get(level_id, LEVELS["newbie"])["rank"]
    words = lexical_words(story)
    names = {
        voice.get("name", "")
        for voice in story.get("voices", [])
        if voice.get("id") != "narrator"
    }
    learning = tuple(dict.fromkeys(story.get("learningWords") or []))
    known_uses = sum(
        1 for word in words if _is_known(word, rank) or word in names or word in learning
    )
    new_words = tuple(
        dict.fromkeys(
            word for word in words if not _is_known(word, rank) and word not in names
        )
    )
    unique = tuple(dict.fromkeys(words))
    block_lengths = [
        len(HAN_RE.findall(block.get("hanzi", "")))
        for block in story.get("blocks", [])
    ]
    sections = {
        int(block.get("section", 1)) for block in story.get("blocks", [])
    }
    return VocabularyReport(
        level=level_id,
        hanzi_count=sum(block_lengths),
        lexical_uses=len(words),
        unique_words=len(unique),
        known_uses=known_uses,
        coverage=known_uses / len(words) if words else 0,
        repetition=len(words) / len(unique) if unique else 0,
        new_words=new_words,
        learning_words=learning,
        unplanned_words=tuple(word for word in new_words if word not in learning),
        max_block_hanzi=max(block_lengths, default=0),
        section_count=len(sections),
    )


def vocabulary_errors(story: dict[str, Any]) -> list[str]:
    if story.get("level") not in LEVELS:
        return []
    rules = LEVELS[story["level"]]
    report = analyze_story(story)
    errors: list[str] = []
    minimum, maximum = rules["chars"]
    if not minimum <= report.hanzi_count <= maximum:
        errors.append(
            f"Chinese length is {report.hanzi_count}; target {minimum}-{maximum}"
        )
    if report.unique_words > rules["max_unique_words"]:
        errors.append(
            f"Uses {report.unique_words} distinct words; maximum "
            f"{rules['max_unique_words']}"
        )
    if len(report.new_words) > rules["max_new_words"]:
        errors.append(
            f"Uses {len(report.new_words)} words above the fixed level list; maximum "
            f"{rules['max_new_words']}: {', '.join(report.new_words)}"
        )
    if report.unplanned_words:
        errors.append(
            "Words outside the fixed level list must appear in learningWords: "
            + ", ".join(report.unplanned_words)
        )
    if report.coverage < rules["min_coverage"]:
        errors.append(
            f"Known-word coverage is {report.coverage:.0%}; minimum "
            f"{rules['min_coverage']:.0%}"
        )
    if report.repetition < rules["min_repetition"]:
        errors.append(
            f"Vocabulary repetition is {report.repetition:.2f} uses per word; minimum "
            f"{rules['min_repetition']:.2f}"
        )
    if report.max_block_hanzi > rules["max_block_hanzi"]:
        errors.append(
            f"Longest sentence block is {report.max_block_hanzi} characters; maximum "
            f"{rules['max_block_hanzi']}"
        )
    if not rules["sections"][0] <= report.section_count <= rules["sections"][1]:
        errors.append(
            f"Uses {report.section_count} sections; target "
            f"{rules['sections'][0]}-{rules['sections'][1]}"
        )
    return errors


def sync_learning_words(story: dict[str, Any]) -> VocabularyReport:
    """Make the teaching list match the above-level words actually in the text."""

    previous_learning_words = story.get("learningWords", [])
    # Existing teaching terms influence the preferred segmenter. Clear them
    # before measuring so deleted or reworded terms cannot keep themselves in
    # the list after an editorial change.
    story["learningWords"] = []
    report = analyze_story(story)
    maximum = LEVELS[story["level"]]["max_new_words"]
    if len(report.new_words) > maximum:
        story["learningWords"] = previous_learning_words
        raise ValueError(
            f"Simplify the story first: it uses {len(report.new_words)} "
            f"above-level words, but {story['level']} allows {maximum}."
        )
    story["learningWords"] = list(report.new_words)
    calibrate_token_difficulty(story)
    return analyze_story(story)


def calibrate_token_difficulty(story: dict[str, Any]) -> dict[str, Any]:
    story_rank = LEVELS.get(story.get("level", "newbie"), LEVELS["newbie"])["rank"]
    learning = set(story.get("learningWords") or [])
    names = {
        voice.get("name", "")
        for voice in story.get("voices", [])
        if voice.get("id") != "narrator"
    }
    for block in story.get("blocks", []):
        hanzi = block.get("hanzi", "")
        name_ranges: list[tuple[int, int]] = []
        for name in names:
            start = 0
            while name and (found := hanzi.find(name, start)) >= 0:
                name_ranges.append((found, found + len(name)))
                start = found + len(name)
        cursor = 0
        for token in block.get("tokens", []):
            text = token.get("text", "")
            token_start, token_end = cursor, cursor + len(text)
            cursor = token_end
            is_name_component = any(
                token_start >= name_start and token_end <= name_end
                for name_start, name_end in name_ranges
            )
            if not HAN_RE.search(text):
                token.update({"difficulty": 0, "focus": False})
                continue
            fixed_level = hsk_level(text)
            if fixed_level is None and HAN_RE.search(text):
                parts = _segment_han(text, learning | names)
                levels = [hsk_level(part) for part in parts if part not in learning and part not in names]
                if levels and all(level is not None for level in levels):
                    fixed_level = max(levels)
            token["difficulty"] = fixed_level or min(6, story_rank + 1)
            token["focus"] = text in learning and text not in names and not is_name_component
    return story
