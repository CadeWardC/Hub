"""Traditional-to-Simplified conversion, driven by the reader's own dictionary.

The reader ships CC-CEDICT keyed by traditional headword, and every entry whose
simplified form differs records it. That is already a complete conversion table,
so the workshop reads it rather than taking a dependency on OpenCC — one source
of truth, and nothing extra to install alongside the Qwen runtime.

Conversion runs longest-match over whole words before falling back to single
characters, which is what OpenCC does and what makes 頭髮 come out as 头发.

Only this direction is safe to automate. Simplified-to-Traditional is genuinely
ambiguous — 干 is 乾, 幹, or 干 depending on meaning — which is why stories are
authored in Traditional and converted downward, never the other way.
"""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DICTIONARY = REPO_ROOT / "mandarin" / "assets" / "dictionary" / "cedict.json"

_table: dict[str, str] | None = None
_entries: dict[str, list] | None = None
_longest = 1
_simplified_only: frozenset[str] = frozenset()


class ConversionUnavailable(RuntimeError):
    """The dictionary asset is missing or too old to convert with."""


def load_table(path: Path | None = None) -> dict[str, str]:
    """Build (and cache) the traditional-to-simplified map."""
    global _table, _entries, _longest
    if _table is not None and _entries is not None:
        return _table

    source = path or DICTIONARY
    try:
        raw = json.loads(source.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise ConversionUnavailable(
            f"{source} is missing. Run mandarin/tool/build_dictionary.py first."
        ) from error
    except json.JSONDecodeError as error:
        raise ConversionUnavailable(f"{source} is not valid JSON.") from error

    entries = raw.get("entries")
    if not isinstance(entries, dict) or not entries:
        raise ConversionUnavailable(f"{source} has no entries.")
    _entries = entries

    table: dict[str, str] = {}
    for traditional, readings in entries.items():
        if not isinstance(readings, list):
            continue
        for reading in readings:
            # [pinyin, [senses], simplified] — the third slot is only present
            # when the two scripts differ.
            if isinstance(reading, list) and len(reading) > 2:
                simplified = reading[2]
                if isinstance(simplified, str) and simplified:
                    table.setdefault(traditional, simplified)
                break

    if not table:
        raise ConversionUnavailable(
            f"{source} records no simplified forms. Rebuild it with the current "
            "mandarin/tool/build_dictionary.py."
        )

    _table = table
    _longest = max(len(word) for word in table)
    # A character is mainland-only when it is the simplified form of something
    # else and is not itself a traditional headword. 学 qualifies; 学 has no
    # traditional life of its own. 中 does not, because it is both.
    _simplified_only = frozenset(
        simplified
        for traditional, simplified in table.items()
        if len(traditional) == 1
        and len(simplified) == 1
        and simplified != traditional
        and simplified not in entries
    )
    globals()["_simplified_only"] = _simplified_only
    return table


def simplified_only_characters(text: str, path: Path | None = None) -> list[str]:
    """Characters in *text* that only exist in Simplified.

    Used to catch the commonest way a Traditional localization goes wrong: the
    model quietly writing mainland characters despite being told not to.
    """
    load_table(path)
    seen: list[str] = []
    for character in text:
        if character in _simplified_only and character not in seen:
            seen.append(character)
    return seen


def reset_for_test() -> None:
    global _table, _entries, _longest, _simplified_only
    _table = None
    _entries = None
    _longest = 1
    _simplified_only = frozenset()


def word_metadata(traditional: str, path: Path | None = None) -> tuple[str, str]:
    """Return the dictionary's first pinyin reading and English sense.

    This is a conservative fallback for otherwise-valid generated packages
    where the model omitted metadata for one lexical word.  The package's own
    vocabulary remains preferable because its definition is contextual.
    """
    load_table(path)
    readings = (_entries or {}).get(traditional)
    if not isinstance(readings, list):
        return "", ""
    for reading in readings:
        if not isinstance(reading, list) or len(reading) < 2:
            continue
        pinyin = reading[0] if isinstance(reading[0], str) else ""
        senses = reading[1] if isinstance(reading[1], list) else []
        english = next(
            (sense for sense in senses if isinstance(sense, str) and sense.strip()),
            "",
        )
        if pinyin or english:
            return pinyin.strip(), english.strip()
    return "", ""


def to_simplified(text: str, path: Path | None = None) -> str:
    """Convert Traditional *text* to Simplified, longest match first."""
    if not text:
        return text
    table = load_table(path)

    out: list[str] = []
    index = 0
    length = len(text)
    while index < length:
        end = min(index + _longest, length)
        while end > index:
            candidate = text[index:end]
            replacement = table.get(candidate)
            if replacement is not None:
                out.append(replacement)
                index = end
                break
            end -= 1
        else:
            # No entry at any length: punctuation, a digit, or a character the
            # two scripts share. Either way it passes through unchanged.
            out.append(text[index])
            index += 1
    return "".join(out)


def is_available(path: Path | None = None) -> bool:
    try:
        load_table(path)
    except ConversionUnavailable:
        return False
    return True
