# Wild Engine crop spell performance — 2026-10-18

The earlier headless Playwright Chromium run used `--use-angle=swiftshader-webgl`; its frame intervals are not evidence of hardware WebGL performance. This follow-up used installed, headed Google Chrome. `WEBGL_debug_renderer_info` reported `ANGLE (Intel, Intel(R) UHD Graphics (0x00009A60) Direct3D11 vs_5_0 ps_5_0, D3D11)`. GPU times came from `EXT_disjoint_timer_query_webgl2` and contain 45 settled samples per arm. The committed JSON reports retain the full measurements.

The interactive test creates a real Wild Engine Sabana/712 browser world, pauses the simulation, injects 100, 500, or 1,500 synthetic living crops into the renderer, and compares 60 consecutive application frames with no spell, growth, multiply, and no spell again. It exercises the normal crop batch and agriculture VFX rendering path, but the crop fixture is not a legal campaign. Frame intervals include scheduling and GPU stalls; `world.render` measures synchronous JavaScript time only.

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

An isolated prototype rendered the depth texture at half resolution. At 1,500 crops, the growth and multiply GPU medians were 72.8 and 74.0 ms, effectively unchanged from full resolution. The prototype was reverted. The remaining likely cost is the extra full-scene depth capture enabled while agriculture VFX is active. That is an inference from the draw path and timings, not a per-pass GPU measurement. A future optimization should profile that pass separately and preserve correct VFX occlusion by crops and terrain.

Reproduce the hardware run from the repository root after starting `npm run dev -- --port 5188`:

```powershell
$env:WG_QA_PLAYWRIGHT_MODULE='C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright\index.mjs'
$env:WG_QA_BROWSER='chrome'
$env:WG_QA_HEADLESS='0'
$env:WG_QA_GPU='1'
$env:WG_QA_MODE='raf'
node tools/experiments/benchmark-wild-engine-crop-spells-browser.mjs result.json 100,500,1500
```

The Playwright module path is host-specific. To reverse spell order, set `WG_QA_ARMS=control,multiply,growth,control-after`. The development-only `qa-crop-spell-frame` hook exposes the world for this benchmark; production builds do not enable it. The separate CPU benchmark is `node tools/experiments/benchmark-wild-engine-crop-spells.mjs 712 sabana result.json`.

The browser result is from one GPU and synthetic farm layouts; it establishes a reproducible performance issue on that configuration, not a universal frame rate. A legal-gameplay spell benchmark and a visual occlusion check are still needed before changing the depth pipeline.
