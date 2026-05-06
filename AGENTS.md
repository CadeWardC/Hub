# AGENTS.md

## Quick start
- **No build system, no package manager, no dependencies.** Open any `index.html` directly in a browser.
- The root `index.html` is the hub page that links to the sub-projects.
- No CI, no lint, no typecheck, no test runner. Manual browser testing only.

## Project structure
- `index.html` / `script.js` / `styles.css` — the hub landing page
- `smolov/` — Smolov Jr. strength training calculator (static HTML/CSS/JS)
- `mandarin/` — Mandarin learning app with microphone-based tone detection (static HTML/CSS/JS)
- `paypers/` — PubMed paper discovery app with swipe interface (static HTML/CSS/JS)
- `laser-engraving/` — Laser engraver bed layout tool with CAD-style SVG engine
- `annotation/` — PDF viewer and annotation tool

Each sub-project is self-contained with its own entrypoint (`index.html`).

## Backend / APIs
- `smolov/directus.js` uses a Directus CMS instance at `api.opcw032522.uk`. Credentials are hardcoded — do not expose or change without coordination.
- `paypers/app.js` fetches from Europe PMC REST API (`www.ebi.ac.uk/europepmc/webservices/rest/search`).
- `annotation/script.js` loads pdf.js v3.11 from cdnjs CDN at runtime. The export feature dynamically loads pdf-lib from cdnjs on demand.

## Editing conventions
- All CSS and JS is vanilla — no preprocessors, no frameworks, no bundlers.
- CSS uses cache-busting query strings on `<link>` and `<script>` tags (e.g., `styles.css?v=12`). Increment the version when changing assets in `smolov/`.
- Most JS uses IIFE-style patterns and DOM-ready callbacks (`DOMContentLoaded`). Exceptions: `paypers/app.js` and `annotation/script.js` use module-scope `const` instead.
- Every sub-project uses a view state machine (loading → setup → main, or welcome → tabs, or onboarding → viewer).
- `mandarin/` has three tabs: Daily (quiz), Roadmap, Words (searchable vocabulary list). VOCAB and ROADMAP data are defined inline in `script.js`.
- `paypers/` has two tabs: Swipe (card stack) and Saved (paper list). Double-tapping the Saved tab triggers a full state reset.
- `laser-engraving/` has a CAD engine rendering to SVG with pan/zoom/draw/drag tools. `doggo.gc` is a sample G-code file.
- `annotation/` renders PDFs via pdf.js with annotation shapes as positioned `<div>` overlays. Persistence is file-based (explicit Save/Load via `.annotations.json`, also exports flattened PDF via pdf-lib). **No auto-save** — user must explicitly save to retain work.

## Persistence
- `smolov/` — Directus CMS (remote)
- `mandarin/` — localStorage (`mandarinState`, `mandarinSRS`)
- `paypers/` — localStorage (`paypersState`)
- `laser-engraving/` — localStorage (`laserEngraving_bedSize`, `laserEngraving_presets`)
- `annotation/` — file-based (export/import `.annotations.json`, flattened PDF export via pdf-lib)

## Artifacts to ignore
- `.playwright-mcp/` directories and `mandarin/*.png` files are Playwright test artifacts.
- `.claude/` is Claude Code local config.
