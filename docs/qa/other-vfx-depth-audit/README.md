# Other Wild Guardians VFX: depth-capture audit

The Growth and Multiply optimization does **not** yet apply to the other effects. All native effects use instanced sprite/rigid buffers, but shield, animal attack, worker, impact, and locomotion effects still request the shared soft-particle scene-depth capture. The capture occurs once per frame if any active effect needs it; it is not repeated for each effect. Those effects also retain their world point lights. This audit changes no production renderer behavior.

## Hardware comparison

Source commit: `88c16da2e0ec50456732105013df80a3a314b5ad`. A real Sabana/712 Wild Engine browser world ran in headed Google Chrome on `ANGLE (Intel UHD Graphics, D3D11)`. The test paused the simulation, displayed one native effect at a fixed age and village position, and alternated `control, soft, hard, hard, soft, control` for each effect. `soft` uses the current depth capture; `hard` omits it while retaining the existing depth test. Each arm rendered 60 frames. GPU timings came from `EXT_disjoint_timer_query_webgl2` after warmup; the [raw report](sabana-712-hardware.json) includes every arm, frame intervals, capture counts, renderer identity, and browser errors.

| Effect | Current soft depth GPU median | No extra depth capture GPU median | Difference |
| --- | ---: | ---: | ---: |
| Shield | 23.06 ms | 18.07 ms | 4.99 ms |
| Rhino attack | 23.20 ms | 17.24 ms | 5.96 ms |
| Watering | 28.40 ms | 20.14 ms | 8.26 ms |
| Dust | 31.01 ms | 20.27 ms | 10.74 ms |
| Stone impact | 28.37 ms | 20.15 ms | 8.22 ms |

Each value is the median of the two corresponding arm medians. Soft arms captured scene depth 60 times each; hard and control arms captured it zero times. All arms finished without browser errors. The control GPU median varied between 14 and 16 ms across effects. These results show a real cost of the shared capture in this fixture, not an additive saving per simultaneous effect.

The screenshots from this fixture looked similar on flat ground, but several effects occupy few pixels at the chosen age. They do **not** establish visual equivalence at contacts with walls, water, buildings, or slopes. The fixture creates isolated render effects directly, so it does not measure legal game actions, VFX lifetimes in a campaign, or total `Game.tick`. A later production change should compare those contact cases and simultaneous effects before turning off soft depth or world lights for any of these compositions.

## Reproduce

Start `npm run dev -- --port 5188 --strictPort`, then run from the repository root:

```powershell
$env:WG_QA_PLAYWRIGHT_MODULE='C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright\index.mjs'
$env:WG_QA_HEADLESS='0'
node tools/experiments/benchmark-other-vfx-depth-browser.mjs result.json
```

The Playwright path is host-specific. `WG_QA_VFX_IDS` selects a comma-separated subset; `WG_QA_SCREENSHOT_DIR` optionally saves canvas captures. The development-only QA hook exposes the real browser world, and the script switches only each effect's `softParticleDepth` option. No game rules or effect definitions are changed.
