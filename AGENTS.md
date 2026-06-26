# AGENTS.md

## Quick start
- **No build system, no package manager, no dependencies.** Open any `index.html` directly in a browser.
- The root `index.html` is the hub page that links to the sub-projects.
- No CI, no lint, no typecheck, no test runner. Manual browser testing only.

## Project structure
- `index.html` / `script.js` / `styles.css` — the hub landing page
- `smolov/` — Smolov Jr. strength training calculator (static HTML/CSS/JS)
- `brain-health/` — Adaptive cognitive-training suite: 14 research-backed games across 4 domains (static HTML/CSS/JS)
- `paypers/` — PubMed paper discovery app with swipe interface (static HTML/CSS/JS)
- `laser-engraving/` — Laser engraver bed layout tool with CAD-style SVG engine

Each sub-project is self-contained with its own entrypoint (`index.html`).

## Backend / APIs
- `smolov/directus.js` uses a Directus CMS instance at `api.opcw032522.uk`. Credentials are hardcoded — do not expose or change without coordination.
- `paypers/app.js` fetches from Europe PMC REST API (`www.ebi.ac.uk/europepmc/webservices/rest/search`).

## Editing conventions
- All CSS and JS is vanilla — no preprocessors, no frameworks, no bundlers.
- CSS uses cache-busting query strings on `<link>` and `<script>` tags (e.g., `styles.css?v=12`). Increment the version when changing assets in `smolov/`.
- Most JS uses IIFE-style patterns and DOM-ready callbacks (`DOMContentLoaded`). Exception: `paypers/app.js` uses module-scope `const` instead.
- Every sub-project uses a view state machine (loading → setup → main, or welcome → tabs, or onboarding → viewer).
- `paypers/` has two tabs: Swipe (card stack) and Saved (paper list). Double-tapping the Saved tab triggers a full state reset.
- `laser-engraving/` has a CAD engine rendering to SVG with pan/zoom/draw/drag tools. `doggo.gc` is a sample G-code file.
- `brain-health/` is modular: `core/` (storage, ui, engine) loads first, then each `games/*.js` file self-registers games via `BRAIN.register(spec)`, then `app.js` boots the dashboard. Script order in `index.html` matters. Each game spec exposes `play(host, {level}) → Promise<{score, accuracy, level, metric}>`; the engine runs an accuracy-based adaptive staircase between sessions. Adding a game = one `BRAIN.register({...})` call in the relevant domain file. Dual N-Back uses the Web Speech API for its audio stream (graceful visual fallback).

## Persistence
- `smolov/` — Directus CMS (remote)
- `paypers/` — localStorage (`paypersState`)
- `laser-engraving/` — localStorage (`laserEngraving_bedSize`, `laserEngraving_presets`)
- `brain-health/` — localStorage (`brainHealth.v1`: levels, history, bests, streak, settings)

## Artifacts to ignore
- `.playwright-mcp/` directories are Playwright test artifacts.
- `.claude/` is Claude Code local config.
