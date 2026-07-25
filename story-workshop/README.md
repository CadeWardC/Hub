# Story Workshop

A private, local authoring studio for building Mandarin graded-reader stories.
It is separate from the Flutter app and is never included in the Hub's public
GitHub Pages artifact.

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

The learner level chosen for a story decides the vocabulary budget sent with
every request. **HSK 1 (Newbie)** is handled specially: `hsk1.py` holds the
150-word HSK 1 list, the core verbs a Newbie story should lean on, and the
sentence patterns it should recycle. Those are pasted into both the English
draft request and the localization request, along with density targets measured
from published Newbie chapters:

* 150–260 Chinese characters per story or chapter;
* 30–45 different words, used at least 2.5 times each on average;
* at most 5 words from outside the list, each used three or more times;
* fewer than a third of the different words appearing only once.

Other levels get general guidance instead. Editing the master prompts does not
remove these rules — they travel with the brief, not the prompt.

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
3. Generate aligned Simplified Chinese, tone-mark pinyin, English translations,
   vocabulary, and the audio manifest.
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
