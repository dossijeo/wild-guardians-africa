# Wild Engine crop spell performance — 2026-10-18

**Correction (same day):** The first browser fixture below injected `radius: 12` into growth and multiply VFX. The game actually assigns a single `targetPlantId` and a visual radius of `0.65` to either spell. Those first screenshots and frame times are **not representative of the current spells**. They are retained only as a record of an oversized-effect stress test. The corrected single-crop and concurrent-spell results are in [Current-spell benchmark](#current-spell-benchmark).

## Discarded oversized-effect fixture

The earlier headless Playwright Chromium run used `--use-angle=swiftshader-webgl`; its frame intervals are not evidence of hardware WebGL performance. This follow-up used installed, headed Google Chrome. `WEBGL_debug_renderer_info` reported `ANGLE (Intel, Intel(R) UHD Graphics (0x00009A60) Direct3D11 vs_5_0 ps_5_0, D3D11)`. GPU times came from `EXT_disjoint_timer_query_webgl2` and contain 45 settled samples per arm. The committed JSON reports retain the full measurements.

This original test created a real Wild Engine Sabana/712 browser world and 100, 500, or 1,500 synthetic crops, but used the incorrect 12-meter VFX radius. Its measurements cannot be used to assess the present single-crop spell. Frame intervals include scheduling and GPU stalls; `world.render` measures synchronous JavaScript time only.

| Crops | Arm | Frame interval median | GPU median | `world.render` median |
| ---: | --- | ---: | ---: | ---: |
| 100 | control | 16.7 ms | 17.7 ms | 4.1 ms |
| 100 | growth | 33.3 ms | 30.4 ms | 6.1 ms |
| 100 | multiply | 33.3 ms | 30.2 ms | 6.1 ms |
| 500 | control | 33.1 ms | 21.8 ms | 4.1 ms |
| 500 | growth | 49.9 ms | 42.9 ms | 6.2 ms |
| 500 | multiply | 49.9 ms | 43.1 ms | 6.5 ms |
| 1,500 | control | 33.4 ms | 34.9 ms | 4.3 ms |
| 1,500 | growth | 83.1 ms | 72.6 ms | 6.2 ms |
| 1,500 | multiply | 83.1 ms | 71.7 ms | 5.9 ms |
| 1,500 | control after | 33.3 ms | 33.0 ms | 4.3 ms |

Reversing growth and multiply at 1,500 crops reproduced 83.1–83.2 ms frame intervals and 73.2–77.9 ms GPU medians. In both orders, the control after the spells returned to about 33 ms and the agriculture effect and native VFX instance counts returned to zero. This indicates a live visual cost rather than a persistent VFX instance leak in the tested path.

`Game.cast` and 50 `Game.tick` calls were measured separately under Wild Engine for Sabana/712, Gran Cañón/123, and Manglares/712 at all three crop counts. All average per-tick CPU times were below 0.51 ms, and individual cast calls averaged below 0.45 ms. These synthetic results do not implicate the simulation or WASM navigation in the observed frame drop.

An isolated prototype rendered the depth texture at half resolution. At 1,500 crops, the growth and multiply GPU medians were 72.8 and 74.0 ms. This negative result applies only to the oversized fixture and was not adopted.

Reproduce the hardware run from the repository root after starting `npm run dev -- --port 5188`:

```powershell
$env:WG_QA_PLAYWRIGHT_MODULE='C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright\index.mjs'
$env:WG_QA_BROWSER='chrome'
$env:WG_QA_HEADLESS='0'
$env:WG_QA_GPU='1'
$env:WG_QA_MODE='raf'
$env:WG_QA_SPELL_COUNT='20'
$env:WG_QA_SPELL_AGE='5'
node tools/experiments/benchmark-wild-engine-crop-spells-browser.mjs result.json 100,500,1500
```

The Playwright module path is host-specific. To reverse spell order, set `WG_QA_ARMS=control,multiply,growth,control-after`. The development-only `qa-crop-spell-frame` hook exposes the world for this benchmark; production builds do not enable it. The separate CPU benchmark is `node tools/experiments/benchmark-wild-engine-crop-spells.mjs 712 sabana result.json`.

## Current-spell benchmark

The corrected fixture creates a real Wild Engine Sabana/712 browser world with 1,500 synthetic living crops. Every effect references a distinct `targetPlantId`, uses `Game.spellRadius(kind) === 0.65`, and is centred on that plant. One or 20 simultaneous effects were held at age 1 or 5 seconds while the simulation was paused. This exercises the actual rendering geometry and concurrent VFX count, though it does not represent a legal campaign's economy or player actions. Each arm has 60 RAF frames and 45 settled GPU samples. `WG_QA_FORCE_SOFT_DEPTH=1` restores the former depth-capture path in the same build.

| Spells | Age | Effect | Former soft-depth GPU median | Main-depth GPU median | Depth captures per 60 frames (former → new) |
| ---: | ---: | --- | ---: | ---: | ---: |
| 1 | 1 s | Growth | 77.4 ms | 51.4 ms | 60 → 0 |
| 1 | 1 s | Multiply | 80.3 ms | 51.1 ms | 60 → 0 |
| 20 | 1 s | Growth | 76.8 ms | 53.9 ms | 60 → 0 |
| 20 | 1 s | Multiply | 76.7 ms | 51.7 ms | 60 → 0 |
| 20 | 5 s | Growth | 76.3 ms | 54.2 ms | 60 → 0 |
| 20 | 5 s | Multiply | 76.6 ms | 52.6 ms | 60 → 0 |

Unspelled controls in these runs were about 33–37 ms GPU. The corrected single-crop and concurrent cases support the same structural finding: one visible agricultural effect previously caused a full-scene depth capture every frame. The active-spell GPU reduction was about 29–36% across these runs. RAF intervals fell from roughly 83 ms to roughly 50–66 ms, but scheduling, thermal state and frame pacing make this less stable than the GPU timer. The control after the effects returned near its baseline, and the VFX instance count returned to zero.

Growth and multiply now use normal WebGL depth testing against the main scene. Other effects retain soft-particle depth. The spell simulation, local lights, movement, terrain, collision and particle schedules are unchanged; only the smooth fade where particles intersect solids can differ. Focused images of an age-5 effect on **one crop** are [main depth](visual-hard-growth.webp) and [former soft depth](visual-soft-growth.webp). The 1280×800 source screenshots have mean absolute channel difference 0.093/255; this is a coarse whole-frame measure, not proof that every particle edge is identical. The particle material still has depth testing enabled, and opaque crop geometry still writes scene depth. A legal-gameplay spell benchmark and checks on other GPUs remain useful.

Reproduce the corrected comparison with `WG_QA_SPELL_COUNT=1` or `20`, `WG_QA_SPELL_AGE=1` or `5`, and optionally `WG_QA_FORCE_SOFT_DEPTH=1`. The original oversized JSON files remain only as historical diagnostics. The local-light experiment also used that oversized fixture, so no conclusion about lights in current-size spells is drawn from it.

## Commands from the game, not injected spell state

A second browser fixture sets `WG_QA_REAL_CAST=1`. It constructs the work center through `Game.placeStructure`, then uses `Game.cast` on each living target crop while the daytime permission is open. The simulation is paused during the measured RAF frames, so the spells retain a fixed age. The 1,500 crops are still a synthetic rendering stress fixture; these are real spell commands against that fixture, not evidence of a legally financed 1,500-crop campaign.

| Spell commands | Age | Effect | Former soft-depth GPU median | Main-depth GPU median | Depth captures per 60 frames (former → new) |
| ---: | ---: | --- | ---: | ---: | ---: |
| 1 | 1 s | Growth | 77.5 ms | 50.8 ms | 60 → 0 |
| 1 | 1 s | Multiply | 78.2 ms | 47.8 ms | 60 → 0 |
| 20 | 5 s | Growth | 77.5 ms | 57.0 ms | 60 → 0 |
| 20 | 5 s | Multiply | 78.9 ms | 58.2 ms | 60 → 0 |

The `Game.cast` results confirm that the earlier manually constructed spells matched the actual renderer input: each has `targetPlantId`, radius `0.65`, and the expected duration. The absolute GPU values vary across runs and differ slightly because this fixture also draws a work center. The main-depth path still leaves a measurable spell cost above the unspelled scene; it removes the redundant scene render, not all particle rendering work. The effect count returns to zero after clearing the test arms. For reproduction, add `WG_QA_REAL_CAST=1` to the command above. The committed `chrome-real-command-*.json` files record the full samples and renderer identity.
