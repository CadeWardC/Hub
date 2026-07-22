# 声场 Shēngchǎng Mandarin Reader

A Flutter graded reader with block-based Mandarin text, pinyin controls,
translations, contextual vocabulary, saved words, reading progress, and
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
DeepSeek for structured story JSON, supports block-by-block review, renders each
block with Qwen, and publishes only complete stories into Flutter assets.
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
an audio tokenizer. The reading dictionary uses `jieba` for lexical boundaries,
`pypinyin` for a baseline, and DeepSeek for contextual glosses and corrections.

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
