# Active crop growth index inside a rendered farm

Production simulation from main `44505794`, browser fixture with a reference growth loop prepared from that exact source. Only the growth iterable changes: full history in A, current active index in B. Other modules, scene, native terrain/navigation, camera, quality media, analytic shader and shadows are identical. Historical Manglares / Saheliana victory: 12,201 crop records, 215 initially living plants, 11,602 crates. Ordinary continuation hires 18 older women for 540 coins. Fifteen simulated seconds warm up each lot, then twenty seconds are measured, with fixed `advanceReal(0.1)` per RAF rather than production variable pacing.

| Lot | Active index | Simulation CPU median / p95 ms | Render CPU median ms | RAF interval median ms | Render-query median ms |
| --- | --- | --- | --- | --- | --- |
| A1 | No | 2.20 / 9.20 | 39.20 | 71.95 | 65.85 |
| B1 | Yes | 1.00 / 7.50 | 40.60 | 70.05 | 64.01 |
| B2 | Yes | 0.95 / 7.50 | 39.45 | 70.00 | 64.22 |
| A2 | No | 2.10 / 7.70 | 38.15 | 70.05 | 64.08 |

800 CPU samples and 800 completed render queries, no disjoint, missing, discarded, overlapping/foreign or pending queries. Effective viewport 1280×720, framebuffer 1600×900, DPR 1.25. This differs from earlier farm reports with a 1280×720 framebuffer; do not compare their absolute timings as matched trials. Long campaigns remained concurrent, while the impostor agent explicitly closed its scenes and reserved the GPU window. Root ran no builds or other benchmarks during these lots.

All four setup/end-state hashes, camera/quality/shadows, path search counts (89), physical event counts and every measured frame's calls/triangles match. Each measured lot has 17 crate deliveries, 23 pickups, two waterings and three maturity/automatic-order events. Final state: time 35 s, 841 coins, 18 workers, 186 living crops. This exercises index retirement while deliveries remain physical and income is settled later. No scene or WebGL error; console retains one known ANGLE `f_environment4` potentially-uninitialized warning.

The CPU simulation saving survives integration, but the RAF median scarcely changes and render cost remains dominant. Query timing covers the full render submission interval, including any CPU/driver submission stalls, not an isolated shader or pure pass cost. This does not prove broad FPS, GPU savings, mobile/RAM, HUD/audio/autosave, raids or a current 100-night balance result. Next performance priority is drawing/material/pass cost, while larger current farms still need integrated acceptance.

The live viewport image was visually reviewed. `pass.png` records the terminal QA status; full-page capture cleared the WebGL canvas after the measurements, so it is not a screenshot of rendered-world appearance. The temporary tab 690 was closed and the GPU window returned to the impostor agent. No viewport override or itch deployment.

Reproduce: run `node tools/prepare_late_farm_render.mjs` (requires the existing frozen 1bfd85a reference), then `node tools/prepare_active_crops_render.mjs`, start Vite and choose **Comparar índice activo de cultivos A/B/B/A** in `tests/browser/late-farm-render.html`. Raw timings are in compressed `report.json.gz`; summary binds source/report hashes and preserves the console warning. Preparation rewrites the one reference loop and uses current imports; unrelated legacy comparison modes are unchanged.
