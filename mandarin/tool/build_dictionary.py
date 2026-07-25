"""Build the bundled Chinese-English dictionary from CC-CEDICT.

CC-CEDICT is a community dictionary published by MDBG under CC BY-SA 4.0. This
script downloads the current release and converts it into the compact JSON the
reader ships in `assets/dictionary/cedict.json`.

    python tool/build_dictionary.py            # download and convert
    python tool/build_dictionary.py --source cedict.txt

The output is keyed by simplified headword so the reader can look a word up
without scanning, and numbered pinyin (ni3 hao3) is converted to the tone marks
(nǐ hǎo) used everywhere else in the app.
"""

from __future__ import annotations

import argparse
import gzip
import json
import re
import urllib.request
from pathlib import Path


CEDICT_URL = "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz"
APP_ROOT = Path(__file__).resolve().parents[1]
OUTPUT = APP_ROOT / "assets" / "dictionary" / "cedict.json"

# Senses beyond this are almost always rare or archaic, and they dominate the
# file size. Six keeps the useful ones.
MAX_SENSES = 6

ENTRY = re.compile(r"^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+/(.+)/\s*$")

TONE_MARKS = {
    "a": "āáǎàa",
    "e": "ēéěèe",
    "i": "īíǐìi",
    "o": "ōóǒòo",
    "u": "ūúǔùu",
    "v": "ǖǘǚǜü",
}


def syllable_to_marks(syllable: str) -> str:
    """Convert one numbered pinyin syllable (hao3) to tone marks (hǎo)."""
    match = re.fullmatch(r"([a-zA-ZüÜ:]+)([1-5])?", syllable)
    if not match:
        return syllable
    body, tone = match.group(1), match.group(2)
    body = body.replace("u:", "v").replace("U:", "V")
    if not tone or tone == "5":
        return body.replace("v", "ü").replace("V", "Ü")

    index = int(tone) - 1
    lowered = body.lower()
    # Standard placement: a and e always win; in "ou" the o takes it; otherwise
    # the last vowel does.
    if "a" in lowered:
        position = lowered.index("a")
    elif "e" in lowered:
        position = lowered.index("e")
    elif "ou" in lowered:
        position = lowered.index("o")
    else:
        vowels = [i for i, letter in enumerate(lowered) if letter in TONE_MARKS]
        if not vowels:
            return body.replace("v", "ü")
        position = vowels[-1]

    letter = body[position]
    marked = TONE_MARKS[letter.lower()][index]
    if letter.isupper():
        marked = marked.upper()
    return (body[:position] + marked + body[position + 1 :]).replace("v", "ü")


def pinyin_to_marks(pinyin: str) -> str:
    return " ".join(
        syllable_to_marks(syllable) for syllable in pinyin.split() if syllable
    )


# CC-CEDICT writes cross-references as 歡迎|欢迎[huan1 ying2] and classifiers as
# CL:個|个[ge4]. Readable definitions keep the simplified form and tone marks.
CROSS_REFERENCE = re.compile(r"([^\s,;/]+?)\|([^\s,;/\[]+)\[([^\]]+)\]")
BARE_REFERENCE = re.compile(r"([一-鿿]+)\[([^\]]+)\]")


def clean_sense(sense: str) -> str:
    # Expand the CL: marker first, otherwise the cross-reference pattern
    # swallows it along with the traditional form it is attached to.
    classifier = "CL:" in sense
    sense = sense.replace("CL:", "classifier: ")
    sense = CROSS_REFERENCE.sub(
        lambda m: f"{m.group(2)} ({pinyin_to_marks(m.group(3))})", sense
    )
    sense = BARE_REFERENCE.sub(
        lambda m: f"{m.group(1)} ({pinyin_to_marks(m.group(2))})", sense
    )
    if classifier:
        sense = sense.replace(",", ", ").replace(",  ", ", ")
    return sense.strip()


def read_source(source: Path | None) -> str:
    if source:
        data = source.read_bytes()
    else:
        print(f"Downloading {CEDICT_URL}")
        with urllib.request.urlopen(CEDICT_URL, timeout=180) as response:
            data = response.read()
    if data[:2] == b"\x1f\x8b":
        data = gzip.decompress(data)
    return data.decode("utf-8")


def build(text: str) -> dict:
    entries: dict[str, list] = {}
    metadata = {}
    kept = 0
    for line in text.splitlines():
        if line.startswith("#"):
            if line.startswith("#!"):
                key, _, value = line[2:].strip().partition("=")
                metadata[key.strip()] = value.strip()
            continue
        match = ENTRY.match(line)
        if not match:
            continue
        traditional, simplified, pinyin, senses = match.groups()
        readings = [
            cleaned
            for sense in senses.split("/")
            if (cleaned := clean_sense(sense))
        ][:MAX_SENSES]
        if not readings:
            continue
        reading = [pinyin_to_marks(pinyin), readings]
        if traditional != simplified:
            reading.append(traditional)
        entries.setdefault(simplified, []).append(reading)
        kept += 1

    print(f"{kept} entries over {len(entries)} headwords")
    return {
        "schemaVersion": 1,
        "source": "CC-CEDICT",
        "publisher": "MDBG",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
        "url": "https://www.mdbg.net/chinese/dictionary?page=cc-cedict",
        "version": metadata.get("date", ""),
        "entries": entries,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        help="A downloaded cedict txt or txt.gz. Downloads the latest when omitted.",
    )
    parser.add_argument("--output", type=Path, default=OUTPUT)
    arguments = parser.parse_args()

    dictionary = build(read_source(arguments.source))
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(
        json.dumps(dictionary, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    size = arguments.output.stat().st_size / (1024 * 1024)
    print(f"Wrote {arguments.output} ({size:.1f} MB)")


if __name__ == "__main__":
    main()
