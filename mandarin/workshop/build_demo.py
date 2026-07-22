"""Build one small, reviewed demo story and render it with local Qwen.

The 12-story launch set is intentionally generated through DeepSeek in the
workshop after a key is supplied. This fixture keeps the Flutter reader and
audio pipeline testable without pretending locally-authored text came from the
API.
"""

from __future__ import annotations

import argparse
import time

from .draft_store import DraftStore
from .publisher import Publisher
from .schema import baseline_tokens, hydrate_story, validate_story
from .tts_service import AudioJobManager, TTSService


BLOCKS = [
    ("narration", "narrator", "星期一早上，天空很黑，小雨一直下。小林拿着一把红色的雨伞去上中文课。", "On Monday morning, the sky was dark and a light rain kept falling. Xiao Lin carried a red umbrella to Chinese class."),
    ("narration", "narrator", "下课以后，她在教室门口看见另一把红雨伞。", "After class, she saw another red umbrella by the classroom door."),
    ("dialogue", "xiaolin", "这不是我的雨伞。我的雨伞上有一只小猫。", "This is not my umbrella. Mine has a little cat on it."),
    ("dialogue", "friend", "也许有人拿错了。我们在这里等一会儿吧。", "Maybe someone took the wrong one. Let's wait here for a little while."),
    ("narration", "narrator", "十分钟后，一个男生跑回来。他的头发和书包都湿了。", "Ten minutes later, a boy came running back. His hair and backpack were both wet."),
    ("dialogue", "boy", "对不起，你们看见一把红雨伞吗？", "Excuse me, have you seen a red umbrella?"),
    ("dialogue", "xiaolin", "是这把吗？下次可以在雨伞上写名字。", "Is it this one? Next time you can write your name on the umbrella."),
    ("narration", "narrator", "男生笑了，把自己的名字写在伞里。三个人一起走到地铁站，雨也慢慢停了。", "The boy smiled and wrote his name inside the umbrella. The three walked to the metro together, and the rain slowly stopped."),
]

GLOSSES = {
    "星期一": "Monday", "早上": "morning", "天空": "sky", "很": "very", "黑": "dark", "小雨": "light rain", "一直": "continuously", "下": "to fall", "小林": "Xiao Lin", "拿": "to hold", "着": "ongoing state marker", "一把": "one (for handled objects)", "红色": "red", "的": "possessive/description particle", "雨伞": "umbrella", "去": "to go", "上": "to attend; on", "中文": "Chinese language", "课": "class", "下课": "class ends", "以后": "after", "她": "she", "在": "at; in", "教室": "classroom", "门口": "doorway", "看见": "to see", "另": "another", "红": "red", "这": "this", "不是": "is not", "我": "I; me", "有": "to have", "一只": "one (for animals)", "小猫": "kitten", "也许": "perhaps", "有人": "someone", "错": "wrong", "了": "change/completion marker", "我们": "we", "这里": "here", "等": "to wait", "一会儿": "a little while", "吧": "suggestion particle", "十分钟": "ten minutes", "后": "after", "一个": "one", "男生": "boy; male student", "跑": "to run", "回来": "to come back", "他": "he", "头发": "hair", "和": "and", "书包": "school bag", "都": "both; all", "湿": "wet", "对不起": "excuse me; sorry", "你们": "you (plural)", "吗": "question particle", "是": "to be; is", "把": "object-disposal marker; classifier", "下次": "next time", "可以": "can; may", "写": "to write", "名字": "name", "笑": "to smile", "自己": "oneself", "伞": "umbrella", "里": "inside", "三个": "three", "人": "people", "一起": "together", "走": "to walk", "到": "to arrive at", "地铁站": "metro station", "雨": "rain", "也": "also", "慢慢": "slowly", "停": "to stop"
}


def make_story() -> dict:
    blocks = []
    focus = {"雨伞", "看见", "拿", "错", "湿", "名字", "地铁站"}
    for index, (kind, speaker, hanzi, translation) in enumerate(BLOCKS, start=1):
        tokens = baseline_tokens(hanzi, 1)
        for token in tokens:
            if token["pinyin"]:
                token["gloss"] = GLOSSES.get(token["text"], "context word")
                token["focus"] = token["text"] in focus
        blocks.append(
            {
                "id": f"b{index:03d}",
                "kind": kind,
                "speakerId": speaker,
                "hanzi": hanzi,
                "traditional": None,
                "pinyin": " ".join(token["pinyin"] for token in tokens if token["pinyin"]),
                "translation": translation,
                "tokens": tokens,
                "audio": {"path": f"audio/b{index:03d}.mp3", "durationMs": 0},
            }
        )
    return hydrate_story(
        {
            "schemaVersion": 1,
            "id": "red-umbrella",
            "title": "红雨伞",
            "pinyinTitle": "hóng yǔsǎn",
            "englishTitle": "The Red Umbrella",
            "summary": "A small mix-up after class turns a rainy morning into a new friendship.",
            "level": "newbie",
            "topic": "Everyday life",
            "minutes": 4,
            "glyph": "伞",
            "colors": ["#D7482F", "#8E2F21"],
            "voices": [
                {"id": "narrator", "name": "Narrator", "speaker": "Vivian"},
                {"id": "xiaolin", "name": "小林", "speaker": "Serena"},
                {"id": "friend", "name": "安娜", "speaker": "Vivian"},
                {"id": "boy", "name": "男生", "speaker": "Dylan"},
            ],
            "blocks": blocks,
        }
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-audio", action="store_true")
    args = parser.parse_args()
    store = DraftStore()
    story = store.save(make_story())
    errors = validate_story(story)
    if errors:
        raise SystemExit("\n".join(errors))
    if args.skip_audio:
        print(f"Saved demo draft {story['id']}")
        return
    manager = AudioJobManager(TTSService(), store)
    job_id = manager.start(story["id"])
    while True:
        job = manager.get(job_id)
        print(f"\rAudio {job['completed']}/{job['total']} {job['currentBlock'] or ''}", end="", flush=True)
        if job["status"] in ("complete", "failed"):
            print()
            if job["status"] == "failed":
                raise SystemExit(job["error"])
            break
        time.sleep(0.5)
    entry = Publisher(store).publish(story["id"])
    print(f"Published demo: {entry['englishTitle']}")


if __name__ == "__main__":
    main()
