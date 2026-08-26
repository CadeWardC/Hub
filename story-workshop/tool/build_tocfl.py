"""Build the vendored TOCFL word budgets from the SC-TOP 華語八千詞 list.

TOCFL (華語文能力測驗) is Taiwan's Chinese proficiency test. Its published word
list is tiered 準備級 (Novice 1-2), 入門級 (Level 1), 基礎級 (Level 2) and upward.
This script converts the low tiers into `tocfl_words.py`, which `tocfl.py` wraps
with the curated verb and pattern guidance the story prompts actually use.

    python tool/build_tocfl.py                    # download and convert
    python tool/build_tocfl.py --source tocfl.csv

The source is the parsed SC-TOP 2023 list published at
https://github.com/ivankra/tocfl, with English glosses merged from CC-CEDICT.
Two properties make it the right source for a Taiwan reader:

* the headwords are Traditional; and
* the pinyin is the Taiwan-standard reading, so 垃圾 is lèsè, 星期 is xīngqí, and
  喜歡 is xǐhuān rather than the mainland readings a Hanyu Pinyin dictionary
  gives — while 東西 correctly stays dōngxi.

Only the tiers listed in TIERS are vendored. Higher bands run to thousands of
words, which is neither useful nor affordable to paste into a prompt; those
levels get count-based guidance from `tocfl.py` instead.
"""

from __future__ import annotations

import argparse
import csv
import io
import re
import sys
import urllib.request
from pathlib import Path

SOURCE_URL = (
    "https://raw.githubusercontent.com/ivankra/tocfl/master/tocfl-cedict.csv"
)
WORKSHOP_ROOT = Path(__file__).resolve().parents[1]
OUTPUT = WORKSHOP_ROOT / "tocfl_words.py"

# TOCFL ID prefix -> the constant name to emit. L0-1nnn is 準備級一級 and
# L0-2nnn is 準備級二級; L1-nnnn is 入門級.
TIERS = {
    "L0-1": "NOVICE1",
    "L0-2": "NOVICE2",
    "L1": "LEVEL1",
}

BRACKET_REF = re.compile(r"([一-鿿]+)\[[^\]]*\]")
HEAD_GLOSS = re.compile(r"^[一-鿿]+\s*\[[^\]]*\]\s*")
INLINE_PRON = re.compile(r"\[[^\]]*\]")
REGISTER = re.compile(
    r"\((?:coll\.|colloquial|informal|formal|respectful|polite|courteous|slang|"
    r"literary|old|fig\.|lit\.|dialect|Tw|Taiwan|PRC|abbr\.[^)]*|Note[^)]*|"
    r"as opposed[^)]*)\)\s*",
    re.IGNORECASE,
)
# Senses that are noise in a learner word budget. Classifiers are kept: 個, 輛,
# and 隻 are real Novice words whose only CC-CEDICT gloss is a classifier entry.
DROP_SENSE = re.compile(
    r"^(?:CL:|variant of|see |also written|abbr\b|surname\b|used in|"
    r"old variant|Baron\b)",
    re.IGNORECASE,
)
CLASSIFIER = re.compile(r"^classifier for\b", re.IGNORECASE)
# Archaic senses trail explanatory Chinese; a learner gloss never needs it.
HAN_DEBRIS = re.compile(r"\s*[一-鿿]{2,}\s*$")


def shorten(text: str, limit: int = 58) -> str:
    """Trim to *limit* on a word boundary, leaving no dangling open bracket.

    A gloss that is nothing but one parenthetical ("(classifier used before a
    noun ...)") is unwrapped rather than trimmed away; deleting it would
    silently lose words as common as 個.
    """
    if text.startswith("(") and text.endswith(")") and text.count("(") == 1:
        text = text[1:-1]
    if len(text) > limit:
        trimmed = text[:limit].rsplit(" ", 1)[0]
        text = trimmed or text[:limit]
    if text.count("(") > text.count(")"):
        head = text[: text.rindex("(")].strip(" ,;")
        text = head or text.replace("(", "")
    return text.strip(" ,;")


def clean_meaning(raw: str) -> str:
    """Reduce a merged CC-CEDICT gloss to one or two short learner senses."""
    text = raw.split("<br>")[0].strip()
    text = HEAD_GLOSS.sub("", text)
    text = BRACKET_REF.sub(r"\1", text)
    text = INLINE_PRON.sub("", text)
    text = REGISTER.sub("", text)
    # CC-CEDICT separates senses with '/', the merge step sometimes with ';'.
    senses = [s.strip(" ,") for s in re.split(r"[/;]", text)]
    senses = [HAN_DEBRIS.sub("", s).strip(" ,") for s in senses]
    senses = [s for s in senses if s and not DROP_SENSE.match(s)]
    if not senses:
        return ""

    # A classifier gloss is the whole meaning; pairing it with another sense
    # only muddies it.
    if CLASSIFIER.match(senses[0]):
        return shorten(re.sub(r"\s+", " ", senses[0]))

    out = senses[0]
    if len(senses) > 1 and len(senses[1]) <= 24 and len(out) + len(senses[1]) <= 52:
        out = f"{out}; {senses[1]}"
    return shorten(re.sub(r"\s+", " ", out))


def canonical(traditional: str) -> str:
    """'你/妳' -> '你'. The first listed form is the one to teach."""
    return traditional.split("/")[0].strip()


def tier_of(row_id: str) -> str | None:
    for prefix, name in TIERS.items():
        if row_id.startswith(prefix):
            return name
    return None


def read_source(source: Path | None) -> str:
    if source:
        return source.read_text(encoding="utf-8")
    print(f"Downloading {SOURCE_URL}")
    with urllib.request.urlopen(SOURCE_URL, timeout=120) as response:
        return response.read().decode("utf-8")


def build(text: str) -> dict[str, list[tuple[str, str, str]]]:
    buckets: dict[str, list[tuple[str, str, str]]] = {n: [] for n in TIERS.values()}
    seen: dict[str, set[tuple[str, str]]] = {n: set() for n in TIERS.values()}
    dropped = 0

    for row in csv.DictReader(io.StringIO(text)):
        tier = tier_of(row["ID"])
        if tier is None:
            continue
        word = canonical(row["Traditional"])
        pinyin = row["Pinyin"].split("/")[0].strip()
        meaning = clean_meaning(row["Meaning"])
        if not (word and pinyin and meaning):
            print(f"  dropped {row['ID']} {word!r}: no usable gloss", file=sys.stderr)
            dropped += 1
            continue
        # Keyed on word *and* reading: 地 is both dì "ground" and the adverbial
        # particle de, and 行 is both xíng and háng. Collapsing on the character
        # alone would silently lose a distinct grammatical item.
        if (word, pinyin) in seen[tier]:
            continue
        seen[tier].add((word, pinyin))
        buckets[tier].append((word, pinyin, meaning))

    for name, items in buckets.items():
        print(f"{name}: {len(items)} words")
    if dropped:
        print(f"{dropped} rows had no usable gloss", file=sys.stderr)
    return buckets


def render(buckets: dict[str, list[tuple[str, str, str]]]) -> str:
    lines = [
        '"""TOCFL word budgets, generated by tool/build_tocfl.py. Do not edit.',
        "",
        "Each entry is (traditional, taiwan_pinyin, english). Regenerate with:",
        "",
        "    python tool/build_tocfl.py",
        '"""',
        "",
        "from __future__ import annotations",
        "",
    ]
    for name, items in buckets.items():
        lines.append(f"TOCFL_{name}_WORDS: tuple[tuple[str, str, str], ...] = (")
        for word, pinyin, meaning in items:
            gloss = meaning.replace("\\", "\\\\").replace('"', '\\"')
            lines.append(f'    ("{word}", "{pinyin}", "{gloss}"),')
        lines.append(")")
        lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        help="A downloaded tocfl-cedict.csv. Downloads the latest when omitted.",
    )
    parser.add_argument("--output", type=Path, default=OUTPUT)
    arguments = parser.parse_args()

    buckets = build(read_source(arguments.source))
    arguments.output.write_text(render(buckets), encoding="utf-8")
    total = sum(len(items) for items in buckets.values())
    print(f"Wrote {arguments.output} ({total} words)")


if __name__ == "__main__":
    main()
