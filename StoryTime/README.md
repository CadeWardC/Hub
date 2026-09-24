# StoryTime

Dependency-free Mandarin story PWA. Open `index.html` to read, or serve the Hub over localhost / HTTPS to install and cache it offline. GitHub Pages includes this folder automatically.

## Write stories with a model

Use [the story-writing prompt](STORY_AUTHORING.md) with [the complete first-year ManDayRin vocabulary](MANDAYRIN_YEAR_ONE.md). The reference includes every noun, verb, and adjective with Chinese, pinyin, English, curriculum band, and first scheduled day. [JSON data](mandayrin-year-one.json) is also available. Story-writing agents in this folder are directed to these files by `AGENTS.md`.

Refresh the references after vocabulary changes with `node StoryTime/export-vocabulary.cjs`. Pages deployment also regenerates them automatically.

The starter versions now have 24 beginner, 20 intermediate, or 18 advanced sentences per story. For new stories, aim for 20–30 short beginner sentences, 18–24 intermediate sentences, or 16–22 richer advanced sentences. Length does not need to increase the language difficulty; build a complete scene with familiar vocabulary and a clear ending.

## Add a story

1. Copy `stories/_template.txt` to a new file in the same folder, for example `stories/rainy-day-beginner.txt`.
2. Replace the title, level, and story text. Each line after `---` is one sentence:

```text
title: A rainy day
level: beginner
---
今天下雨了。 | Jīntiān xià yǔ le. | It rained today.
我在家喝茶。 | Wǒ zài jiā hē chá. | I drink tea at home.
```

3. Commit and deploy as usual. **GitHub Pages automatically builds all story files.** No app editor, import, registration list, or timing data needed. New stories can use device speech immediately; run the audio generator to add Qwen3 narration.

For a local preview, run this from the Hub folder after changing files:

```sh
python3 StoryTime/build_stories.py
```

Then open `StoryTime/index.html` or refresh your local server. Installed apps pick up the update after their existing windows close and reopen (they first need a visit online to download it). The build updates the offline cache version automatically.

### The file format

- Required headers: `title` and `level` (`beginner`, `intermediate`, or `advanced`).
- Put `---` on its own line between the headers and sentences.
- One sentence per line: `Chinese | pinyin | English`. No quotes or commas to manage.
- Pinyin and English are optional. Chinese alone works. For English without pinyin, use `你好！ | | Hello!`.
- Blank lines and lines starting with `#` are ignored. Files starting with `_` are ignored, so the template is never published.
- Use lowercase filenames with hyphens and a `.txt` extension. The filename is the story's stable ID; keep it unchanged to preserve reading progress.
- Optional headers: `description`, `note` (a learning hint), `symbol` (cover text), and `series`.
- Don't put a literal `|` inside a sentence or translation; it separates the fields.

### The same story at several levels

Create a separate file for each version, with the same `series` header:

```text
title: A rainy day
level: intermediate
series: rainy-day
---
虽然外面在下雨，但是家里很暖和。 | Suīrán wàimian zài xià yǔ, dànshì jiā lǐ hěn nuǎnhuo. | Although it is raining outside, it is warm at home.
```

Add `series: rainy-day` to the beginner version too. The reader automatically offers a level switcher for matching versions. Write the text for each level yourself; changing the label does not rewrite or translate it. The two starter stories show all three levels. Levels are editorial categories, not certified HSK ratings.

`stories.js` is generated; edit the `.txt` source files instead. The builder uses only Python's standard library, validates all files before replacing the library, and reports the filename and line if something is wrong.

## Listening

The included stories use locally generated **Qwen3 Mandarin narration**: `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`, voice `Serena`, with a warm, clear Mandarin reading instruction. Each sentence has a separate 24 kHz WAV recording. Playback defaults to 0.65×, with pitch-preserving 0.5×–1.2× controls. Choose a device voice in the voice menu to use browser speech instead.

Sentence highlighting advances on the recording's actual end event. Tap a sentence to start there. Pause cancels playback; resume replays that sentence. The step option waits between sentences. Changing story or leaving the reader cancels old callbacks. Recorded audio provides sentence highlighting; browser speech can additionally highlight words when boundary events are available.

The service worker caches all current recordings with the app for offline listening after a successful hosted visit. No installed speech voice or model is needed for recorded narration. New or edited sentences without matching recordings use browser speech; offline browser speech needs an installed Mandarin voice. Installation requires HTTPS or localhost.

### Regenerate narration

Audio generation is a separate local Python step; the website itself remains dependency-free. Install `requirements-audio.txt` in a virtual environment, then run:

```sh
python StoryTime/generate_audio.py
```

On this Windows checkout, Qwen TTS is installed in the default Python environment:

```powershell
python StoryTime/generate_audio.py
```

The generator first looks for the model in the sibling `Coding_Projects/models/Qwen3-TTS-12Hz-1.7B-CustomVoice` folder, then falls back to the model ID. Use `--model-path` to select another local location. CUDA is used when available; `--device cpu` is also supported. Later runs reuse clips matching the text, model, voice, and reading instruction. Use `--voice` to choose another preset and `--batch-size` to tune memory use (default 4). The complete replacement is built before recordings referenced only by the old manifest are removed. Commit the generated `audio/` files, `stories.js`, and `sw.js` with the source changes. The audio manifest records the model, voice, reading instruction, text, and duration. A normal story build only attaches recordings whose text still matches, so stale narration is never used for edited sentences. No synthesis runs in Pages deployment.

### Preset voices and voice cloning

List all nine presets without loading a model:

```sh
python StoryTime/generate_audio.py --list-voices
python StoryTime/generate_audio.py --voice Serena
```

Presets: Vivian, Serena, Uncle_Fu, Dylan, Eric, Ryan, Aiden, Ono_Anna, and Sohee. These are local generation options, not separate audio packs in the website. Every run replaces the story narration with the selected voice. The CustomVoice model contains all presets; no per-voice download is required.

For cloning, provide a clear reference recording and its exact transcript:

```sh
python StoryTime/generate_audio.py --reference-audio "C:/audio/reference.wav" --reference-text "Exact words spoken in the reference."
```

Cloning automatically selects `Qwen3-TTS-12Hz-1.7B-Base` from the same sibling `models` folder and reuses one reference prompt across sentences. The reference recording and transcript are not copied into the website. The manifest stores only a reference-audio checksum. `--model-path` can override the model folder for either mode. The shared `Qwen3-TTS-Tokenizer-12Hz` model is also downloaded locally; the model folders contain their required speech tokenizer assets.

Model documentation: [Qwen3 Mandarin](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice). Preferences and reading position remain in `storytime.v1`. The service worker deletes only caches prefixed `storytime-`.

## Verification

With a local Hub server running and Playwright installed, run `STORYTIME_URL=http://127.0.0.1:8765/StoryTime/ node tests/storytime.cjs` from the repository root. Speech and recording events are mocked to exercise synchronization deterministically, and a real recording is decoded offline; audible quality and device-specific voice behavior need a real-device check. Run `python3 -m unittest discover -s tests -p "test_storytime*.py"` to check file parsing and the build. The browser test also checks reading progress, storage, responsive overflow, service-worker offline loading, and reading without speech/storage support.

Speech event reference: [MDN: speech boundary events](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/boundary_event).
