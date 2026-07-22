from __future__ import annotations


def valid_story() -> dict:
    return {
        "schemaVersion": 1,
        "id": "red-umbrella",
        "title": "红雨伞",
        "pinyinTitle": "hóng yǔsǎn",
        "englishTitle": "The Red Umbrella",
        "summary": "A rainy-day act of kindness.",
        "level": "newbie",
        "topic": "Everyday life",
        "minutes": 4,
        "glyph": "伞",
        "colors": ["#D7482F", "#8E2F21"],
        "voices": [
            {"id": "narrator", "name": "Narrator", "speaker": "Vivian"},
            {"id": "female", "name": "小林", "speaker": "Serena"},
        ],
        "blocks": [
            {
                "id": "b001",
                "kind": "narration",
                "speakerId": "narrator",
                "hanzi": "今天下雨了。",
                "traditional": None,
                "pinyin": "jīntiān xiàyǔ le",
                "translation": "It rained today.",
                "tokens": [
                    {"text": "今天", "pinyin": "jīntiān", "gloss": "today", "difficulty": 1, "focus": False},
                    {"text": "下雨", "pinyin": "xiàyǔ", "gloss": "to rain", "difficulty": 1, "focus": True},
                    {"text": "了", "pinyin": "le", "gloss": "change marker", "difficulty": 1, "focus": False},
                    {"text": "。", "pinyin": "", "gloss": "", "difficulty": 0, "focus": False},
                ],
                "audio": {"path": "audio/b001.mp3", "durationMs": 1200},
            }
        ],
    }
