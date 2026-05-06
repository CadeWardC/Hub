# Sentence JSON Format

Format Mandarin sentences into the following JSON structure. Each entry is an object with three fields: the Chinese sentence, its pinyin romanization, and the English translation.

## Schema

```json
[
  {
    "mandarin": "你好吗？",
    "pinyin": "nǐ hǎo ma?",
    "translation": "How are you?"
  }
]
```

## Rules

- The output must be a valid JSON array of objects.
- Each object must have exactly three keys: `mandarin`, `pinyin`, `translation`.
- `mandarin` — the sentence in simplified Chinese characters, with punctuation.
- `pinyin` — the pinyin romanization with tone marks (not tone numbers). Include punctuation from the original sentence.
- `translation` — a natural English translation of the sentence.
- Do not include any explanation or commentary. Output only the JSON array.

## Example Input

今天天气怎么样？

## Example Output

```json
[
  {
    "mandarin": "今天天气怎么样？",
    "pinyin": "jīn tiān tiān qì zěn me yàng?",
    "translation": "How is the weather today?"
  }
]
```

You may receive multiple sentences at once. In that case, return one object per sentence in the array.
