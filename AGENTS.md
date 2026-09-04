# AGENTS.md

## Quick start
- The Hub and its static projects are dependency-free sites. Open their `index.html` files directly.
- The root `index.html` is the hub page that links to the sub-projects.
- `.github/workflows/pages.yml` assembles the static projects and deploys one GitHub Pages artifact.

## Project structure
- `index.html` / `script.js` / `styles.css` — the hub landing page
- `ManDayRin/` — Installable, offline-first daily Mandarin PWA with a 365-day beginner curriculum and local vocabulary history
- `smolov/` — Smolov Jr. strength training calculator (static HTML/CSS/JS)
- `paypers/` — PubMed paper discovery app with swipe interface (static HTML/CSS/JS)
- `laser-engraving/` — Laser engraver bed layout tool with CAD-style SVG engine
- `conversions/` — Local file converter, all client-side: audio/video → MP3 (vendored `lame.min.js`, a lamejs build), WAV via Web Audio `decodeAudioData`, Opus/M4A/WebM/MP4 via MediaRecorder (feature-detected, real-time), animated GIF (vendored `gifenc.js`); images → JPEG/PNG/WebP via canvas plus BMP/GIF/ICO/PDF hand-written encoders; CSV/TSV ⇄ JSON; TXT/MD → PDF; batch results download as a store-only ZIP

Each static sub-project has its own `index.html`.

## Backend / APIs
- `smolov/supabase.js` talks to Supabase PostgREST (`/rest/v1`). Config comes from `smolov/config.js` (gitignored, generated from the repo-root `.env`), which sets `window.SMOLOV_CONFIG` with the project URL and the **publishable/anon** key only. The `.env` `SUPABASE_SECRET_KEY` must never reach client code. `config.example.js` is the committed template; `supabase-schema.sql` creates the `lift_maxes` and `smolov_plans` tables plus permissive anon RLS policies (run once in the Supabase SQL editor). The client keeps the original `LiftMaxesAPI` / `SmolovPlansAPI` surface so `script.js` is unchanged.
- `paypers/app.js` fetches from Europe PMC REST API (`www.ebi.ac.uk/europepmc/webservices/rest/search`).

## Editing conventions
- All CSS and JS is vanilla.
- CSS uses cache-busting query strings on `<link>` and `<script>` tags (e.g., `styles.css?v=12`). Increment the version when changing assets in `smolov/`.
- Most JS uses IIFE-style patterns and DOM-ready callbacks (`DOMContentLoaded`). Exception: `paypers/app.js` uses module-scope `const` instead.
- Every sub-project uses a view state machine (loading → setup → main, or welcome → tabs, or onboarding → viewer).
- `paypers/` has two tabs: Swipe (card stack) and Saved (paper list). Double-tapping the Saved tab triggers a full state reset.
- `laser-engraving/` has a CAD engine rendering to SVG with pan/zoom/draw/drag tools. `doggo.gc` is a sample G-code file.

## Persistence
- `ManDayRin/` — localStorage (`mandayrinState.v1`: start date, daily selections, vocabulary history, and reminder settings) plus service-worker IndexedDB for best-effort background reminder checks
- `smolov/` — Supabase (Postgres via PostgREST): `lift_maxes`, `smolov_plans`
- `paypers/` — localStorage (`paypersState`)
- `laser-engraving/` — localStorage (`laserEngraving_bedSize`, `laserEngraving_presets`)
- `conversions/` — none; source files are decoded in memory and results download straight to disk

## Artifacts to ignore
- `.playwright-mcp/` directories are Playwright test artifacts.
- `.claude/` is Claude Code local config.
