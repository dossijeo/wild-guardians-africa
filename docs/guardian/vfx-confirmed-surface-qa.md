# Confirmed terrain surface for WebGPU VFX

The visual Worker uses the existing `SpatialSurfaceView` over the exact positions transferred from Wild Engine. It interpolates the same 1 m terrain triangles already rendered, instead of raycasting the complete terrain mesh for each VFX contact. The view retains the positions already owned by terrain residency; it follows confirmed chunk replacements and removals. The selected chunk must exist, preserving the earlier raycast behavior at an unloaded neighboring boundary. Other residency implementations retain the original raycast fallback. No authoritative physics, navigation or ground geometry changes.

`tests/webgpu-terrain-residency.test.js` compares thousands of nonplanar samples, negative coordinates and chunk borders against Three.js raycasts, and checks replacement, stale revisions and removal. VFX and terrain tests passed 13/13. This is a visual surface query, not a new physical authority.

Four sequential A/B/B/A runs of the existing prepared-wall-hit raid in the real game QA path (15-second requested window, paused during readiness and ten seconds afterwards, WebGPU, legacy draw skipped) produced the following final inspection aggregates:

| Path | VFX sync samples | mean / p95 / maximum ms | complete receipt mean / p95 / maximum ms | sampled simulation-time lag s |
| --- | ---: | --- | --- | ---: |
| Raycast A1 | 395 | 3.764 / 2.415 / 100.120 | 6.218 / 8.595 / 102.745 | 9.90 |
| Confirmed view B1 | 341 | 0.119 / 0.250 / 4.315 | 2.760 / 4.835 / 37.825 | 6.80 |
| Confirmed view B2 | 512 | 0.124 / 0.175 / 3.355 | 2.546 / 3.820 / 37.045 | 9.60 |
| Raycast A2 | 370 | 7.318 / 31.980 / 316.130 | 9.793 / 34.495 / 324.885 | 8.50 |

Values are Worker callback wall times including initialization; bounded timing history differs between runs. VFX callbacks do not necessarily contain the same number of contacts. These results show a reproducible reduction in the observed callback cost, not complete-scene performance equivalence or an FPS improvement. The presentation still falls behind. Only three lag observations per run are captured, and no lag p95/p99 can be inferred. Main-thread rAF p95/p99/max and raw snapshots are in [the four raw results](vfx-confirmed-surface-qa/); the first rAF interval can begin before the measurement window, so maxima must not be treated as precise in-window stalls. No GPU timings or GPU memory are measured. Different readiness/compilation and 10-second warm-up affect the runs.

Each run independently requested a WebGPU adapter reported as NVIDIA/Turing; the request returned no precise device ID. The machine inventory separately identifies a GTX 1660, but the Worker adapter itself was not independently identified. The prepared fixture has one attacking animal, so it is not a horde benchmark. A full production migration, event batching, sustained lag and shadow/pipeline issues remain open.

With Vite running on port 5175 and Node/Playwright available, use `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=15000`, `QA_VISUAL_TIMING=1`. Run `tools/experiments/measure_webgpu_stable_raid.mjs` with `QA_VFX_RAYCAST=1` for the previous query and `QA_VFX_RAYCAST=0` for the confirmed view, setting a different `QA_OUT_FILE` each time. The route changes only the test response; it does not modify the application path or simulation.
