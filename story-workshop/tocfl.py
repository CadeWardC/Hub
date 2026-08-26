"""The TOCFL word budgets that graded Taiwan-Mandarin stories are written inside.

TOCFL (華語文能力測驗) is Taiwan's proficiency test, run by SC-TOP. Its published
華語八千詞 list tiers vocabulary as 準備級 (Novice 1-2), 入門級 (Level 1), 基礎級
(Level 2) and upward. Keeping the low tiers here rather than in a prompt means
the workshop, not DeepSeek, decides what a level contains, and the same list can
be shown in the workshop UI.

The word data lives in the generated `tocfl_words.py`; this module adds the parts
that are editorial rather than official — which verbs a story should lean on,
which sentence patterns it should recycle, and the Taiwan-versus-mainland rules
every localization must follow.

The vendored pinyin is the Taiwan-standard reading throughout, which is why 垃圾
is lèsè and 喜歡 is xǐhuān here. Prompts must quote these readings rather than
letting the model fall back on mainland ones.
"""

from __future__ import annotations

from typing import NamedTuple

from tocfl_words import (
    TOCFL_LEVEL1_WORDS,
    TOCFL_NOVICE1_WORDS,
    TOCFL_NOVICE2_WORDS,
)

Word = tuple[str, str, str]


def _merge(*groups: tuple[Word, ...]) -> tuple[Word, ...]:
    """Concatenate word tiers, keeping the first reading of any repeat."""
    merged: list[Word] = []
    seen: set[tuple[str, str]] = set()
    for group in groups:
        for word, pinyin, english in group:
            if (word, pinyin) in seen:
                continue
            seen.add((word, pinyin))
            merged.append((word, pinyin, english))
    return tuple(merged)


# Cumulative budgets: a Novice 2 story may use everything a Novice 1 story may.
NOVICE1_BUDGET = TOCFL_NOVICE1_WORDS
NOVICE2_BUDGET = _merge(TOCFL_NOVICE1_WORDS, TOCFL_NOVICE2_WORDS)
LEVEL1_BUDGET = _merge(
    TOCFL_NOVICE1_WORDS, TOCFL_NOVICE2_WORDS, TOCFL_LEVEL1_WORDS
)


class Level(NamedTuple):
    """One rung of the TOCFL ladder as the workshop presents it."""

    key: str
    label: str
    chinese: str
    cefr: str

    # The vendored budget, or None for bands too large to paste into a prompt.
    words: tuple[Word, ...] | None

    # Cumulative vocabulary the band assumes, for count-based guidance.
    vocabulary: int

    # Target story shape, measured the way the Newbie tier always was.
    characters: str
    distinct_words: str


LEVELS: tuple[Level, ...] = (
    Level(
        key="NOVICE1",
        label="TOCFL Novice 1",
        chinese="準備級一級",
        cefr="pre-A1",
        words=NOVICE1_BUDGET,
        vocabulary=len(NOVICE1_BUDGET),
        characters="120–200",
        distinct_words="25–40",
    ),
    Level(
        key="NOVICE2",
        label="TOCFL Novice 2",
        chinese="準備級二級",
        cefr="pre-A1",
        words=NOVICE2_BUDGET,
        vocabulary=len(NOVICE2_BUDGET),
        characters="150–260",
        distinct_words="30–45",
    ),
    Level(
        key="LEVEL1",
        label="TOCFL Level 1",
        chinese="入門級",
        cefr="A1",
        words=LEVEL1_BUDGET,
        vocabulary=len(LEVEL1_BUDGET),
        characters="220–380",
        distinct_words="45–70",
    ),
    Level(
        key="LEVEL2",
        label="TOCFL Level 2",
        chinese="基礎級",
        cefr="A2",
        words=None,
        vocabulary=1_250,
        characters="320–520",
        distinct_words="70–110",
    ),
    Level(
        key="LEVEL3",
        label="TOCFL Level 3",
        chinese="進階級",
        cefr="B1",
        words=None,
        vocabulary=2_500,
        characters="450–700",
        distinct_words="100–160",
    ),
)

DEFAULT_LEVEL = "TOCFL Novice 1"

_BY_KEY = {level.key: level for level in LEVELS}


def normalize(label: object) -> str:
    """Map a stored or submitted level string onto a Level key.

    Accepts the labels the UI sends ("TOCFL Level 1"), bare keys ("LEVEL1"),
    the Chinese names, and the HSK labels published stories used before the
    move to TOCFL, so old projects still open.
    """
    text = str(label or "").strip()
    if not text:
        return LEVELS[0].key

    squashed = "".join(text.split()).upper().replace("-", "").replace("–", "")
    for level in LEVELS:
        candidates = {
            level.key,
            "".join(level.label.split()).upper(),
            level.chinese,
        }
        if squashed in {"".join(c.split()).upper() for c in candidates}:
            return level.key

    # Legacy HSK labels, mapped to the nearest TOCFL rung.
    legacy = {
        "HSK1": "NOVICE2",
        "HSK1NEWBIE": "NOVICE2",
        "NEWBIE": "NOVICE1",
        "HSK12": "LEVEL1",
        "HSK2": "LEVEL1",
        "HSK23": "LEVEL2",
        "HSK3": "LEVEL3",
    }
    if squashed in legacy:
        return legacy[squashed]
    return LEVELS[0].key


def level_for(label: object) -> Level:
    return _BY_KEY[normalize(label)]


def has_word_budget(label: object) -> bool:
    """Whether this level ships a full word list to paste into a prompt."""
    return level_for(label).words is not None


# The verbs a low-level story should lean on again and again. A story that
# reuses eight of these across a dozen sentences teaches far more than one that
# uses thirty verbs once each. Every entry is inside the Novice 1-2 budget.
TOCFL_CORE_VERBS: tuple[str, ...] = (
    "是",
    "有",
    "沒有",
    "在",
    "去",
    "來",
    "吃",
    "喝",
    "看",
    "說",
    "問",
    "叫",
    "想",
    "要",
    "喜歡",
    "會",
    "能",
    "可以",
    "買",
    "做",
    "坐",
    "站",
    "住",
    "睡覺",
    "回",
    "開",
    "聽",
    "學",
    "寫",
    "走",
    "找",
    "給",
    "知道",
    "等",
    "拿",
)

# Sentence patterns a low-level story should recycle. Naming them keeps chapters
# structurally familiar, which is what makes a graded reader readable. These are
# written the way Taiwan writes them — 這裡 not 這儿, and the 有 + verb question
# that mainland Mandarin forms with 了 instead.
TOCFL_PATTERNS: tuple[str, ...] = (
    "我是……",
    "這是……／那是……",
    "我有……／我沒有……",
    "你有……嗎？",
    "我在……",
    "我要……／我想……",
    "我喜歡……",
    "我會……／我可以……",
    "……很……",
    "太……了！",
    "……嗎？",
    "……呢？",
    "我也……／我都……",
    "我不……／我沒……",
    "因為……，所以……",
    "……，可是……",
    "然後……",
    "這裡／那裡……",
)

# Words where Taiwan and the mainland simply differ. The localization prompt
# carries these so DeepSeek does not quietly produce mainland vocabulary in
# Traditional characters, which is the most common way this goes wrong.
TAIWAN_LEXICON: tuple[tuple[str, str, str], ...] = (
    ("腳踏車", "自行車", "bicycle"),
    ("捷運", "地鐵", "metro / MRT"),
    ("計程車", "出租車", "taxi"),
    ("公車", "公交車", "bus"),
    ("便當", "盒飯", "boxed meal"),
    ("早餐", "早點", "breakfast"),
    ("馬鈴薯", "土豆", "potato — 土豆 means peanut in Taiwan"),
    ("鳳梨", "菠蘿", "pineapple"),
    ("番茄", "西紅柿", "tomato"),
    ("優格", "酸奶", "yoghurt"),
    ("服務生", "服務員", "waiter"),
    ("網路", "網絡", "network"),
    ("軟體", "軟件", "software"),
    ("硬體", "硬件", "hardware"),
    ("影片", "視頻", "video"),
    ("資訊", "信息", "information"),
    ("品質", "質量", "quality"),
    ("列印", "打印", "to print"),
    ("幼稚園", "幼兒園", "kindergarten"),
    ("這裡／那裡／哪裡", "這兒／那兒／哪兒", "here / there / where"),
)

# Pronunciation and grammar rules that separate Taiwan Mandarin from the
# mainland standard. These travel with every localization request.
TAIWAN_STYLE_RULES: tuple[str, ...] = (
    "Write Traditional characters (正體字) throughout, as used in Taiwan.",
    "No 兒化: write 這裡, 那裡, 哪裡, 一點 — never 這兒, 那兒, 哪兒, 一點兒.",
    "Use Taiwan-standard readings in the pinyin: 垃圾 lèsè, 星期 xīngqí, "
    "研究 yánjiù, 企業 qìyè, 喜歡 xǐhuān, 先生 xiānshēng, 眼睛 yǎnjīng.",
    "Taiwan gives many syllables a full tone where the mainland reduces them "
    "to neutral. Follow the reading given in the word budget exactly.",
    "Prefer the Taiwan word when the two standards differ (see the list "
    "supplied with this request).",
    "The 有 + verb question (你有吃嗎？) is normal Taiwan Mandarin; use it "
    "alongside ……了嗎？ rather than avoiding it.",
    "Keep the register warm and slightly indirect, the way Taiwanese speakers "
    "talk to children and learners.",
)


def word_budget_text(label: object) -> str:
    """The level's word list as a compact prompt block."""
    words = level_for(label).words
    if not words:
        return ""
    return "、".join(f"{word}({pinyin})" for word, pinyin, _ in words)


def core_verbs_text() -> str:
    return "、".join(TOCFL_CORE_VERBS)


def patterns_text() -> str:
    return "  ".join(TOCFL_PATTERNS)


def taiwan_lexicon_text() -> str:
    return "; ".join(
        f"{taiwan} (not {mainland}) = {gloss}"
        for taiwan, mainland, gloss in TAIWAN_LEXICON
    )


def taiwan_style_text() -> str:
    return "\n".join(f"- {rule}" for rule in TAIWAN_STYLE_RULES)
