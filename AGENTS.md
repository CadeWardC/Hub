# AGENTS.md

## Quick start
- The Hub and all projects except `mandarin/` are dependency-free static sites. Open their `index.html` files directly.
- `mandarin/` is a Flutter 3.38.9 project. Run `flutter pub get` and `flutter run -d chrome` from that folder.
- The root `index.html` is the hub page that links to the sub-projects.
- `.github/workflows/pages.yml` analyzes/tests/builds Flutter, assembles all static projects, and deploys one GitHub Pages artifact.

## Project structure
- `index.html` / `script.js` / `styles.css` — the hub landing page
- `smolov/` — Smolov Jr. strength training calculator (static HTML/CSS/JS)
- `brain-health/` — Adaptive cognitive-training suite: 14 research-backed games across 4 domains (static HTML/CSS/JS)
- `mandarin/` — Flutter graded Mandarin story reader plus a local DeepSeek/Qwen publishing workshop
- `paypers/` — PubMed paper discovery app with swipe interface (static HTML/CSS/JS)
- `laser-engraving/` — Laser engraver bed layout tool with CAD-style SVG engine

Each static sub-project has its own `index.html`. Mandarin's deployed `index.html` is generated in `mandarin/build/web/`.

## Backend / APIs
- `smolov/supabase.js` talks to Supabase PostgREST (`/rest/v1`). Config comes from `smolov/config.js` (gitignored, generated from the repo-root `.env`), which sets `window.SMOLOV_CONFIG` with the project URL and the **publishable/anon** key only. The `.env` `SUPABASE_SECRET_KEY` must never reach client code. `config.example.js` is the committed template; `supabase-schema.sql` creates the `lift_maxes` and `smolov_plans` tables plus permissive anon RLS policies (run once in the Supabase SQL editor). The client keeps the original `LiftMaxesAPI` / `SmolovPlansAPI` surface so `script.js` is unchanged.
- `brain-health/core/cloud.js` talks to the **same** Supabase project via PostgREST for the earnings ledger only (`brain_earnings` table; see `brain-health/supabase-schema.sql`). Config is `brain-health/config.js` (gitignored, `window.BRAIN_CONFIG`, publishable key only); `config.example.js` is the committed template. Game progress (levels/streak/history) stays in localStorage; only earnings sync to the cloud. Sync is best-effort with a local fallback: each completed game appends an earning locally (with a client `cid` for idempotency) and pushes it; `reconcileEarnings()` flushes unsynced rows then pulls the server list as the source of truth.
- `paypers/app.js` fetches from Europe PMC REST API (`www.ebi.ac.uk/europepmc/webservices/rest/search`).
- `mandarin/` publishes a read-only Flutter Web bundle with pre-generated story JSON/MP3 assets. `python -m workshop.server` starts the local-only authoring UI on `127.0.0.1:8765`; it reads the gitignored root `.env` for `DEEPSEEK_API_KEY`, validates/edit drafts, renders Qwen blocks, and publishes approved assets. The official CustomVoice, Base, and standalone audio-tokenizer snapshots live under `mandarin/models/` and are gitignored; `download_models.py` resumes/verifies them.

## Editing conventions
- All non-Mandarin CSS and JS is vanilla. Mandarin uses Flutter/Dart; its separate local workshop uses vanilla HTML/CSS/JS and Flask.
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
- `brain-health/` — localStorage (`brainHealth.v1`: levels, history, bests, streak, settings, earnings cache) + Supabase `brain_earnings` ledger (authoritative for payouts)
- `mandarin/` — Flutter `shared_preferences` (`mandarinReader.v1`: reader settings, story progress, saved words); ignored `.workshop/` drafts/cache and `models/`; only reviewed `assets/content/` JSON/MP3 files are published

## Artifacts to ignore
- `.playwright-mcp/` directories are Playwright test artifacts.
- `.claude/` is Claude Code local config.
- `mandarin/build/`, `mandarin/.dart_tool/`, `mandarin/.venv/`, `mandarin/.workshop/`, and `mandarin/models/` are local/generated artifacts.
