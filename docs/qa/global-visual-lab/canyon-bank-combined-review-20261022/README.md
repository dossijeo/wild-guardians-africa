# Canyon bank transition on the combined native composition

18 fresh real frames: baseline, retained shallow-edge QA, wider structured-edge QA; three identical cameras each in day and night. Seed 712, media, 1280x720, current global native recipe. No changes to production rendering, simulation or authoritative geometry.

## Result

The retained `depth` variant is too subtle to solve the artistic gap identified in the six-biome review. The `structured` variant makes shallow/deeper color separation clearly visible, with a 5-unit transition modulated by two world-space waves rather than a constant 3-unit band. It preserves the center's blue and fades toward green/turquoise at the bank. The night view retains the dark blue center and a subdued edge.

However, the wider transition still reads as a clean colored border rather than a naturally detailed shore. It is **not adopted into the native recipe**. Preserve both QA variants for further work rather than claiming a solved river or discarding an attractive direction on unmeasured performance grounds. The next experiment should address coherent material detail across the land/water boundary, not keep increasing tint strength. Do not change authoritative terrain or add fake terrain silhouettes.

The shallow parameter is lateral distance from the procedural river center/half-width, **not measured bathymetry**, transparency or refraction. It cannot reproduce underwater rocks or the reference's irregular shoreline alone. No broad claim of physical depth is warranted.

## Evidence and limitations

`captures.json` holds all frame cameras, targets, time and counters. Both six-pair audits pass exact camera/time/draw/triangle equivalence. No captured GL, console or HTTP errors. The baseline spans 32–39 draws and 232,389–399,675 triangles across the three views; candidates match each frame.

Neither candidate adds geometry, draws, texture samples or render passes. Both add the same two-float bank attribute; the structured fragment adds two sine evaluations and arithmetic. This is a source-level cost description, **not a timing result**. No fresh GPU/CPU benchmark was run in this pass, and no speedup or free-cost claim is made. Previous QA bank memory/stream evidence is recorded in `canyon-water-horizon-20261022`, but does not validate the new width modulation during motion. Current cameras also do not establish near/far seam-free behavior; that remains pending.

## Reproduce

With Vite on port 5190:

```powershell
node tools/experiments/capture-canyon-bank-combined-review-20261022.mjs
node tools/experiments/capture-canyon-bank-structured-20261022.mjs
python tools/experiments/audit-canyon-bank-combined-review-20261022.py
$env:WG_BANK_VARIANT='structured'
python tools/experiments/audit-canyon-bank-combined-review-20261022.py
```

The second capture appends the structured records to the first capture's JSON. It uses the same resident/horizon preparation hooks as the retained QA, with `qa-canyon-water-structured-20261022.js`. These hooks are explicitly experimental replacements; the underlying terrain/sky recipe is native. Paired WebP sheets show baseline on the left and candidate on the right.


## Follow-up: sediment variation

Six additional real day/night frames (`sediment`) replace the clean tint band with two scales of continuous world-space value noise. Coarse noise varies the lateral transition width; finer noise varies the sediment color and boundary, with derivative-based detail attenuation. This reuses `waterHash`, adds no texture or draw, and preserves the same two-float bank attribute. It is an artistic opaque-water approximation, not underwater geometry or measured depth.

The inspected day/night game views show less uniformity than `structured`. The hard water/land contour persists, and at this scale the sediment can still look like soft mottling. Retain as QA, not as a completed shoreline or native default. Further work must assess the bank itself and motion/streaming. Do not keep increasing noise as a substitute for coherent bank detail.

Reproduce added captures with `node tools/experiments/capture-canyon-bank-sediment-20261022.mjs` after the baseline capture. Set `WG_BANK_VARIANT=sediment` for the paired audit; all six camera/time/geometry pairs pass. The directory now holds 24 images across four variants.

### Moving-camera cost

`canyon-bank-sediment-cost-20261022/benchmarks.json` and `summary.json`: Intel UHD ANGLE D3D11, same native combined recipe, seed 712, media 1280x720, A/B/A/B, day/night, 60 warmup + 90 measured frames per pass. All 720 GPU queries valid; no disjoint/discard/pending errors, no GL errors, unchanged simulation state, exact per-frame cameras/draws/triangles. CPU render submission and RAF cadence measured separately from GPU queries. A 4-unit loop moves the camera; chunk synchronization is suspended identically after settling, so this does not measure streaming or attribute preparation cost.

| Phase / repetition | Base GPU mean ms | Sediment GPU mean ms | Base CPU ms | Sediment CPU ms |
| --- | ---: | ---: | ---: | ---: |
| Day 1 | 10.894 | 9.617 | 3.706 | 3.497 |
| Day 2 | 9.769 | 9.629 | 3.497 | 3.519 |
| Night 1 | 10.753 | 10.745 | 3.607 | 3.552 |
| Night 2 | 10.812 | 10.732 | 3.657 | 3.421 |

Baseline day drift is 1.125 ms, much larger than the second paired difference. These results show no consistent measured penalty in this fixture, not a demonstrated optimization. RAF means 16.624–16.634 ms are refresh-limited and do not establish uncapped FPS. Full p95 and device data remain in summary JSON. No other captures/tests ran during timing.

Reproduce timings with `node tools/experiments/measure-canyon-bank-sediment-20261022.mjs`; set `WG_BENCH_OUT=docs/qa/global-visual-lab/canyon-bank-sediment-cost-20261022` and run `python tools/experiments/audit-canyon-native-composition-resident-cost-20261022.py`. Streaming, additional camera/seed coverage, native integration and bank detail remain pending.
