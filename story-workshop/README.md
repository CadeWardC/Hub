# Story Workshop

A private, local authoring studio for building Taiwan Mandarin graded-reader
stories in Traditional characters. It is separate from the Flutter app and is
never included in the Hub's public GitHub Pages artifact.

## Start

Double-click `launch_workshop.bat`.

The launcher opens `http://127.0.0.1:8766` and keeps a small local server
running. Close its console window to stop the workshop.

The launcher verifies that its Python runtime contains `qwen_tts`, `torch`,
`soundfile`, and `numpy`. It prefers Python 3.10 because that is where the local
Qwen environment is installed, rather than blindly selecting the newest Python
registered with the Windows `py` launcher.

The server reads these values from the repository-root `.env`:

```text
DEEPSEEK_API_KEY=your-key
DEEPSEEK_MODEL=deepseek-v4-pro
```

The API key stays in the local server and is never sent to browser JavaScript or
saved in a story file.

## Levels

Levels are **TOCFL** (華語文能力測驗), Taiwan's proficiency test, not the
mainland's HSK. `tocfl.py` defines the ladder and the editorial guidance;
`tocfl_words.py` holds the vendored word data and is generated:

```text
python tool/build_tocfl.py
```

| Level | Chinese | CEFR | Words | Full list in prompt |
| --- | --- | --- | --- | --- |
| Novice 1 | 準備級一級 | pre-A1 | 160 | yes |
| Novice 2 | 準備級二級 | pre-A1 | 394 | yes |
| Level 1 | 入門級 | A1 | 739 | yes |
| Level 2 | 基礎級 | A2 | ~1,250 | no |
| Level 3 | 進階級 | B1 | ~2,500 | no |

Budgets are cumulative: a Novice 2 story may use everything Novice 1 may. The
three low tiers paste their whole word list into both the English draft request
and the localization request, along with the core verbs a story should lean on,
the sentence patterns it should recycle, and density targets:

* the level's character and distinct-word targets;
* at least 2.5 uses per different word;
* at most 5 words from outside the list, each used three or more times;
* fewer than a third of the different words appearing only once.

The upper bands are too large to paste, so they get count-based guidance
instead. Editing the master prompts does not remove any of this — it travels
with the brief, not the prompt.

The vendored pinyin is **Taiwan-standard**, taken from the official list, so the
budget itself is what teaches 垃圾 lèsè and 喜歡 xǐhuān rather than the mainland
readings. Every localization request also carries the Taiwan-versus-mainland
rules (no 兒化, the 有 + verb question, 腳踏車 not 自行車) from `TAIWAN_LEXICON` and
`TAIWAN_STYLE_RULES`.

Levels saved before the move to TOCFL still open: `tocfl.normalize` maps the old
HSK labels onto the nearest rung.

## Script

Stories are written in Traditional and the Simplified rendering is derived from
it, never the reverse. `script_convert.py` builds its table by reading the
reader's own `assets/dictionary/cedict.json`, so there is no OpenCC dependency
to install next to the Qwen runtime, and conversion runs longest-match over
whole words before falling back to characters.

Only this direction is automated. Simplified-to-Traditional is genuinely
ambiguous — a table will happily give you 昰 for 是, 咊 for 和, and 瞭 for the
particle 了 — which is why Traditional is the authored form.

Generation is checked rather than trusted: a segment containing a
Simplified-only character is rejected outright instead of being quietly fixed
up, because its pinyin and word splits were reasoned about in the wrong script
too. The segment `audioText` stays Traditional, since converting it down would
hand the synthesiser 干 for both 乾 and 幹 and let it pick the wrong reading.

## Books

**New book** plans a themed multi-chapter reader (4–12 chapters). DeepSeek
returns the premise, the recurring cast, the shared word budget, and one
outline per chapter; the workshop then creates a chapter project for each and
lists them under **Books**.

Each chapter runs through the normal story pipeline below. When a chapter is
generated or revised, its brief also carries the book's premise, cast, shared
words, the outlines of earlier chapters, and the titles of later ones, so
chapters stay consistent without retelling each other.

Publishing a chapter records its book in `mandarin/assets/content/index.json`,
which is what makes the reader app show the book as one library item with a
chapter list and read progress. Deleting a book deletes and unpublishes all of
its chapters.

## Workflow

1. Change and save the master story prompt, enter a brief, and generate an
   English story with DeepSeek V4 Pro.
2. Edit the story directly or ask DeepSeek for a revision. Approve the exact
   English version that should become the source.
3. Generate aligned Traditional Chinese, Taiwan-standard tone-mark pinyin,
   English translations, vocabulary, and the audio manifest. The Simplified
   rendering is derived here too.
4. Save a durable checkpoint. You can close the workshop and return later.
5. Continue from that checkpoint to generate Qwen3-TTS narration locally.
6. Publish the complete story and audio into the Flutter reader.

## Local files

Drafts and generated assets are stored under:

```text
.workshop/projects/<story-id>/
  project.json
  english.txt
  story.json
  audio_manifest.json
  audio/
.workshop/books/<book-id>/
  book.json
```

The `.workshop` folder is ignored by Git. The generated audio manifest points at
the Qwen Base, CustomVoice, and Tokenizer snapshots detected in
`../mandarin/models/`.

**Generate Qwen audio** creates WAV clips with the local CustomVoice model.
**Publish to app** then copies the checkpointed story and audio into
`../mandarin/assets/content/` and updates the Flutter library index.

## Checks

Run the dependency-free test suite with:

```text
python -m unittest discover -s tests
```
