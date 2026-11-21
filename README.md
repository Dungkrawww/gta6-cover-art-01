# Neon Coast Cover Studio — GTA 6 Cover Art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Dungkrawww/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Dungkrawww/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn any photo into a GTA-style cover, right in the browser. Neon Coast Cover
Studio draws the poster on a canvas — the classic multi-panel look with a
neon-sunset grade — and exports it as a PNG you can share. The whole thing
runs offline: no server, no uploads, your photos never leave your machine.

- Five layouts: Hero + 3, Full bleed, 4 panels, 9 panels, and Tilted snapshot
- Five grades: Sunset, Neon, Vice, Gold, and Mono, with film grain, vignette,
  and a white frame you can toggle
- Genre lettering: a title, a subtitle, a diagonal ribbon badge, and a 0–5
  star meter
- Crop each panel yourself: drag to pan, use the zoom slider, reset a panel,
  or fill every panel with one click
- Undo and redo for every change
- Four sample photos built in, or upload your own image
- Export as PNG in 1080×1080, 1080×1350, or 1920×1080 — one size, or all
  three at once

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

That copies `app/` and `screenshots/` to `/output` and writes
`/output/dossier.json`. To use the studio, open `app/index.html` in a
browser (or serve it with `node serve.ts` and open http://localhost:8080).

Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty, $250 in
USDC.
