# River underlay activation and measured cost

The selected filtered-underlay QA now has a shared vec2 uniform owned by BiomeGround and updated by the coverage render hook. X enables filtering only when the coverage group is visible, variant is not A, and quality is not very low; Y follows the coverage's far distance. Dispose clears activation. This is still an in-memory QA integration, not production/native adoption.

18 real frames compare baseline without grass, gated filter without grass, and gated filter with grass. Seed 712, media, 1280x720, three camera poses in day/night. All six disabled pairs are **pixel-exact** to baseline terrain, with identical geometry/camera/time; uniform [0,48]. All six enabled pairs are **pixel-exact** to the retained underlay candidate, uniform [1,48]. JSON evidence is in `off-equivalence.json`, `on-equivalence.json`, and `captures.json`. No captured errors.

Reproduce with Vite on port 5190 and `node tools/experiments/capture-river-underlay-activation-20261022.mjs`. Compare PNGs against the existing `river-coverage-pigment-scale-20261022` underlay fixture for the enabled check. The current fixture tests visibility/variant off at media; live low/very-low quality switching and disposal behavior are implemented in the patch but **not yet exercised by this capture**.

## Cost of the original underlay candidate

`river-coverage-underlay-cost-20261022` contains raw A/B/A/B and summary. Intel UHD ANGLE D3D11, fixed resident chunks, same native recipe, 4-unit moving camera plus wind, 60 warmup/90 measured frames per phase. CPU/cadence runs separate from GPU query runs. 720 valid GPU queries, exact per-frame cameras/draws/triangles, unchanged simulation, no GL/disjoint/pending errors. No concurrent captures/tests during timing. These timings precede the shared activation uniform; they do not establish its disabled cost.

| Phase/repetition | Base GPU mean ms | Underlay GPU mean ms | Base CPU ms | Underlay CPU ms |
| --- | ---: | ---: | ---: | ---: |
| Day 1 | 15.595 | 15.445 | 5.173 | 5.246 |
| Day 2 | 15.809 | 15.328 | 4.892 | 4.982 |
| Night 1 | 16.682 | 16.816 | 4.837 | 4.977 |
| Night 2 | 15.978 | 16.030 | 5.044 | 4.600 |

Day GPU deltas -.150/-.481 ms, night +.134/+.052 ms. Baseline night drift .704 ms exceeds those paired penalties. No demonstrated speedup, no zero-cost claim. RAF mean 18.07–19.15 ms, p95 up to39.2 ms; do not call this smooth 60 FPS. GPU p95 and full records remain in summary JSON. Geometry/sample-footprint equality is intentionally different: color gradients change which mip/filter footprint is used, while submitted geometry is equal.

Reproduce timings: `node tools/experiments/measure-river-coverage-underlay-20261022.mjs`, then set WG_BENCH_OUT to the cost directory and run `python tools/experiments/audit-canyon-native-composition-resident-cost-20261022.py` (the auditor is generic despite its original name).

## Remaining gates

Retain the candidate. Still required: visual motion/video inspection across the filter range; live quality/off/on/dispose checks; actual footprint eligibility around obstacles/water; second seed and rapid streaming. Current underlay eligibility remains terrain-mask based, not a raster mask of actual selected instances. Do not claim these activation checks resolve exclusion mismatch or global art completion. Main and approved native recipe remain unchanged.
