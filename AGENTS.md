# AGENTS.md

## Quick start
- The Hub and its static projects are dependency-free sites. Open their `index.html` files directly.
- `mandarin/` is a Flutter 3.38.9 graded-reader project with web, Android, and iOS targets. Run `flutter pub get` and `flutter run -d chrome` from that folder. It teaches **Taiwan Mandarin in Traditional characters**, graded against **TOCFL** (not HSK).
- `story-workshop/` is a local Python/HTML authoring tool. Double-click `launch_workshop.bat`; do not publish this folder.
- The root `index.html` is the hub page that links to the sub-projects.
- `.github/workflows/pages.yml` analyzes/tests/builds Flutter, assembles all static projects, and deploys one GitHub Pages artifact.

## Project structure
- `index.html` / `script.js` / `styles.css` — the hub landing page
- `smolov/` — Smolov Jr. strength training calculator (static HTML/CSS/JS)
- `brain-health/` — Adaptive cognitive-training suite: 14 research-backed games across 4 domains (static HTML/CSS/JS)
- `mandarin/` — Flutter graded Taiwan Mandarin story reader (Traditional characters, TOCFL levels) plus published story JSON/WAV assets and ignored local Qwen models
- `paypers/` — PubMed paper discovery app with swipe interface (static HTML/CSS/JS)
- `laser-engraving/` — Laser engraver bed layout tool with CAD-style SVG engine
- `conversions/` — Local file converter: audio/video → MP3 (vendored `lame.min.js`, a lamejs build) or WAV via Web Audio `decodeAudioData`, images → JPEG/PNG/WebP via canvas (static HTML/CSS/JS)
- `story-workshop/` — Local-only DeepSeek story studio that prepares Mandarin, pinyin, and Qwen3-TTS audio manifests

Each static sub-project has its own `index.html`. Mandarin's deployed `index.html` is generated in `mandarin/build/web/`.

## Backend / APIs
- `smolov/supabase.js` talks to Supabase PostgREST (`/rest/v1`). Config comes from `smolov/config.js` (gitignored, generated from the repo-root `.env`), which sets `window.SMOLOV_CONFIG` with the project URL and the **publishable/anon** key only. The `.env` `SUPABASE_SECRET_KEY` must never reach client code. `config.example.js` is the committed template; `supabase-schema.sql` creates the `lift_maxes` and `smolov_plans` tables plus permissive anon RLS policies (run once in the Supabase SQL editor). The client keeps the original `LiftMaxesAPI` / `SmolovPlansAPI` surface so `script.js` is unchanged.
- `brain-health/core/cloud.js` talks to the **same** Supabase project via PostgREST for the earnings ledger only (`brain_earnings` table; see `brain-health/supabase-schema.sql`). Config is `brain-health/config.js` (gitignored, `window.BRAIN_CONFIG`, publishable key only); `config.example.js` is the committed template. Game progress (levels/streak/history) stays in localStorage; only earnings sync to the cloud. Sync is best-effort with a local fallback: each completed game appends an earning locally (with a client `cid` for idempotency) and pushes it; `reconcileEarnings()` flushes unsynced rows then pulls the server list as the source of truth.
- `paypers/app.js` fetches from Europe PMC REST API (`www.ebi.ac.uk/europepmc/webservices/rest/search`).
- `mandarin/` publishes a read-only Flutter Web bundle with reviewed story JSON/WAV assets from `assets/content/`. The official CustomVoice, Base, and standalone audio-tokenizer snapshots live under `mandarin/models/` and are gitignored.
- `story-workshop/server.py` runs only on `127.0.0.1:8766` and proxies DeepSeek V4 Pro requests so the API key never enters browser code. Double-click `story-workshop/launch_workshop.bat` to start it. Prompts and working drafts stay under the gitignored `story-workshop/.workshop/`; its final action generates local Qwen WAV files and publishes the story plus audio into `mandarin/assets/content/`.

## Script and levels (Mandarin)
- **Traditional is canonical.** Stories are authored in Traditional; the Simplified rendering is derived at publish time by `story-workshop/script_convert.py`, which reads its table out of `mandarin/assets/dictionary/cedict.json` (no OpenCC dependency). Never convert Simplified → Traditional programmatically: it is ambiguous (干 is 乾/幹/干; a table gives 昰 for 是 and 瞭 for the particle 了).
- Story JSON is `schemaVersion` 2: `chinese` + `chineseSimplified` per segment, `text` + `textSimplified` per word, and `vocabulary` keyed by `traditional`. Every Simplified field is optional and empty when the scripts agree; the Dart model falls back to Traditional via `ChineseScript` / `*In(script)` accessors.
- `mandarin/assets/dictionary/cedict.json` is keyed by **traditional** headword; `simplifiedIndex` maps simplified → a list of traditional candidates. Rebuild with `python tool/build_dictionary.py`.
- `validate_package` in `server.py` **rejects** a segment containing Simplified-only characters rather than fixing it up. Segment `audioText` stays Traditional so the synthesiser is not handed ambiguous 干.
- Levels are TOCFL, defined in `story-workshop/tocfl.py`; word data is generated into `tocfl_words.py` by `python tool/build_tocfl.py`. The vendored pinyin is Taiwan-standard (垃圾 lèsè, 喜歡 xǐhuān). `tocfl.normalize` still accepts legacy HSK labels.
- Saved words, reading progress, and dictionary lookups key on the **traditional** form regardless of the displayed script, so the toggle never orphans saved data.

## Editing conventions
- All non-Mandarin CSS and JS is vanilla. Mandarin uses Flutter/Dart; `story-workshop/` uses vanilla HTML/CSS/JS and Python's standard-library HTTP server.
- CSS uses cache-busting query strings on `<link>` and `<script>` tags (e.g., `styles.css?v=12`). Increment the version when changing assets in `smolov/`.
- Most JS uses IIFE-style patterns and DOM-ready callbacks (`DOMContentLoaded`). Exception: `paypers/app.js` uses module-scope `const` instead.
- Every sub-project uses a view state machine (loading → setup → main, or welcome → tabs, or onboarding → viewer).
- `paypers/` has two tabs: Swipe (card stack) and Saved (paper list). Double-tapping the Saved tab triggers a full state reset.
- `laser-engraving/` has a CAD engine rendering to SVG with pan/zoom/draw/drag tools. `doggo.gc` is a sample G-code file.
- `brain-health/` is modular: `config.js` + `core/` (storage, ui, engine, cloud) load first, then each `games/*.js` file self-registers games via `BRAIN.register(spec)`, then `app.js` boots. Script order in `index.html` matters. Each game spec exposes `play(host, {level}) → Promise<{score, accuracy, level, metric}>`; the engine runs an accuracy-based adaptive staircase between sessions. Adding a game = one `BRAIN.register({...})` call in the relevant domain file. Dual N-Back uses the Web Speech API for its audio stream (graceful visual fallback). The UI is two tabs (Train / Earnings); every completed game pays a small amount via `engine.payoutCents()` (≈5–20¢, scaled by accuracy + level) recorded in the earnings ledger.

## Persistence
- `smolov/` — Supabase (Postgres via PostgREST): `lift_maxes`, `smolov_plans`
- `paypers/` — localStorage (`paypersState`)
- `laser-engraving/` — localStorage (`laserEngraving_bedSize`, `laserEngraving_presets`)
- `conversions/` — none; source files are decoded in memory and results download straight to disk
- `brain-health/` — localStorage (`brainHealth.v1`: levels, history, bests, streak, settings, earnings cache) + Supabase `brain_earnings` ledger (authoritative for payouts)
- `mandarin/` — Flutter `shared_preferences` for reading progress, completed stories, and the chosen script (`mandarin.script.v1`); ignored `models/`; reviewed `assets/content/` JSON/WAV files are published
- `story-workshop/` — local filesystem JSON under gitignored `.workshop/`; never included in the GitHub Pages artifact

## Artifacts to ignore
- `.playwright-mcp/` directories are Playwright test artifacts.
- `.claude/` is Claude Code local config.
- `mandarin/build/`, `mandarin/.dart_tool/`, `mandarin/.venv/`, `mandarin/.workshop/`, and `mandarin/models/` are local/generated artifacts.
- `story-workshop/.workshop/` is local draft/output state and must stay ignored.
