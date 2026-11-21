# Neon Coast Cover Studio — GTA 6 Cover Art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Dungkrawww/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Dungkrawww/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline browser web app that turns a photo and a caption into GTA 6-style
cover art: the iconic multi-panel poster and loading-screen look with a Vice
City neon-sunset grade, exported as a PNG to share. Everything runs locally
in the browser — no network requests, no uploads.

- Canvas 2D engine: 5 layouts (Hero + 3, Full bleed, 4-panel, 9-panel,
  Tilted snapshot) and 5 gradient-map grades (Sunset, Neon, Vice, Gold, Mono)
  with grain and vignette
- Genre lettering (Anton + Pacifico), halftone title block, editable diagonal
  ribbon badge, and a 0–5 star meter
- Per-panel crop and position (drag to pan, wheel to zoom), undo/redo
- 4 sample photos included, or upload your own; "Fill all panels" in one step
- PNG export in 1080×1080, 1080×1350, and 1920×1080 — one size or all three

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `app/` and `screenshots/` to `/output` and writes
`/output/dossier.json`. Open `app/index.html` in a browser to use the studio.

Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty, $250 in
USDC.
