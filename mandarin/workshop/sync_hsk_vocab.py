"""Refresh the pinned classic HSK 2.0 vocabulary used by the story gate.

The source project is MIT licensed. Only the cumulative simplified word lists
are retained so the workshop can grade drafts locally and deterministically.
"""

from __future__ import annotations

import json
from pathlib import Path

import requests


VERSION = "v1.4"
BASE_URL = (
    "https://raw.githubusercontent.com/drkameleon/"
    f"complete-hsk-vocabulary/{VERSION}"
)
DATA_ROOT = Path(__file__).resolve().parent / "data"
OUTPUT_PATH = DATA_ROOT / "hsk2.json"
LICENSE_PATH = DATA_ROOT / "LICENSE.complete-hsk-vocabulary"


def main() -> None:
    levels: dict[str, list[str]] = {}
    for level in range(1, 7):
        response = requests.get(
            f"{BASE_URL}/wordlists/inclusive/old/{level}.json", timeout=60
        )
        response.raise_for_status()
        levels[str(level)] = sorted(
            {entry["simplified"] for entry in response.json() if entry.get("simplified")}
        )

    license_response = requests.get(f"{BASE_URL}/LICENSE", timeout=60)
    license_response.raise_for_status()
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(
            {
                "source": "drkameleon/complete-hsk-vocabulary",
                "version": VERSION,
                "scheme": "classic HSK 2.0 cumulative",
                "levels": levels,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
        + "\n",
        encoding="utf-8",
    )
    LICENSE_PATH.write_text(license_response.text, encoding="utf-8")
    print(
        "Wrote classic HSK vocabulary: "
        + ", ".join(f"L{level}={len(words)}" for level, words in levels.items())
    )


if __name__ == "__main__":
    main()
