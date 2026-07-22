# 声场 Shēngchǎng Mandarin Reader

A Flutter graded reader with flowing, paged Mandarin sections, Chinese/English
tabs, pinyin controls, contextual vocabulary, saved words, reading progress, and
pre-generated Qwen3-TTS audio. The published app is completely static: it never
receives a DeepSeek key and never loads the local Qwen models.

## Run the learner

Flutter 3.38.9 is the pinned project version.

```powershell
flutter pub get
flutter run -d chrome
```

Release builds use the Hub project path:

```powershell
flutter build web --release --base-href /Hub/mandarin/
```

The app reads `assets/content/catalog.json`. Each catalog entry points to a
versioned story document and MP3 files under `assets/content/stories/`.

## Run the local story workshop

The workshop binds only to `127.0.0.1:8765`. It creates local drafts, asks
DeepSeek for structured story JSON, shows fixed-level reading metrics, offers a
learner preview, renders each sentence with Qwen, and publishes only complete
stories into Flutter assets. A pinned classic HSK vocabulary set makes the
level checks repeatable. Planned teaching words count toward readable coverage,
while unplanned above-level words are rejected before audio can start.
Long stories use two DeepSeek phases: a compact story structure followed by
schema-checked contextual annotation of each block. Up to three remote
annotation requests run together by default; local Qwen rendering remains
strictly sequential for the 8 GB GPU.

Add this to the gitignored repo-root `.env`:

```dotenv
DEEPSEEK_API_KEY=your_key_here
DEEPSEEK_MODEL=deepseek-v4-pro
```

Then install and start it:

```powershell
python -m venv --system-site-packages .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m workshop.server
```

After that one-time setup, Windows users can double-click
`Start Story Workshop.bat`. It starts the local server and opens the GUI. The
normal workflow is:

1. Choose a level and story idea, with optional practice words.
2. Generate a local draft and review the reading-comfort checks.
3. Edit the flowing sections, then choose **Recheck all words** once.
4. Preview the same Chinese/English pages learners will see.
5. Render Qwen audio only after the story passes, preview it, and publish.
6. Commit and push the newly tracked files under `assets/content/`.

If the machine already has CUDA PyTorch 2.6, ensure torchaudio matches it:

```powershell
python -m pip install --force-reinstall --no-deps torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124
```

Open `http://127.0.0.1:8765`. The 12 planned launch-story briefs are built into
the workshop. Generation, audio, and publishing can also be run as explicit
batch phases while retaining the same review checkpoint:

```powershell
python -m workshop.build_launch_set generate
python -m workshop.build_launch_set status
# Review/edit the ignored drafts in the workshop before continuing.
python -m workshop.build_launch_set render
python -m workshop.build_launch_set publish
```

Use `--only red-umbrella` to process one planned story or `--force` with the
generation command to replace an existing draft. The batch tool never prints
the DeepSeek key.

## Models and tokenizer

Run `python download_models.py` to resume or verify the three official snapshots:

- `Qwen3-TTS-12Hz-1.7B-CustomVoice`
- `Qwen3-TTS-12Hz-1.7B-Base`
- `Qwen3-TTS-Tokenizer-12Hz`

They remain under `models/` and are gitignored. The standalone Qwen tokenizer is
an audio tokenizer. Reader vocabulary is checked against the pinned local HSK
lists with deterministic segmentation; `pypinyin` supplies a baseline and
DeepSeek adds contextual glosses, pronunciation corrections, and name-aware
translations.

## Publishing contract

Drafts and source WAV/cache files live in ignored `.workshop/` directories.
Publishing requires valid tokens, pinyin, translations, supported voices, and a
playable MP3 for every block. It copies the approved files into tracked assets
and updates the catalog atomically. Pushes to `main` run Flutter tests/build and
deploy the compiled web output alongside the existing static Hub projects.

## Checks

```powershell
flutter analyze
flutter test
.\.venv\Scripts\python.exe -m unittest discover -s workshop\tests -v
```
