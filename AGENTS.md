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
- `hollowkeep/` — Installable, offline colony-defence game prototype (Rise to Ruins–style), Phase 2 core economy. `js/sim.js` is pure data advanced by a fixed 10 Hz tick (`SimClock`, pause/1x/2x/3x) and also runs under Node; `js/colony.js` (also pure data, Node-runnable) holds the economy: villagers with hunger/rest and an idle → seek → travel → work → haul → eat/sleep state machine, a priority job board (score = priority / distance; player sets Build/Wood/Stone/Food priorities), A*/Dijkstra pathfinding, chop/quarry/forage/farm gathering into a global stock via stores, blueprint → deliver → build construction, house beds as the population cap, and newcomers at dawn; all tuning lives in its `BAL`, `DAY` and `BUILDINGS` tables (balance target: 8 villagers finish 3 houses + a woodcutter before dusk on day 1). `js/render.js` bakes the procedural map into an offscreen canvas (repainting tiles the colony clears) and draws pixel-art buildings, construction, villagers with carry icons, effects and the night overlay; `js/camera.js` handles drag + inertia, pinch/wheel zoom snapping to 3 levels, edge clamping, taps and a `dragHandler` hook for the placement ghost; `main.js` owns the HUD (top stores bar, bottom build menu, ghost placement with ✓/✕, jobs panel, cards, toasts) and exposes `HK.debug` for the console; `design.html` holds the Phase 0 design doc, paper prototype, mockup and NOT-in-1.0 list. URL params `?seed=N&agents=N` (agents = Phase 1 load-test wanderers, default 0)
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
- `hollowkeep/` — none yet (the map is regenerated from a seed and the colony is not saved); service-worker Cache Storage (`hollowkeep-v*`) for offline play
- `conversions/` — none; source files are decoded in memory and results download straight to disk

## Artifacts to ignore
- `.playwright-mcp/` directories are Playwright test artifacts.
- `.claude/` is Claude Code local config.
