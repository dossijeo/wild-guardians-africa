# Chunk-membership mask reconstruction: not selected

QA alternative keeps reusable current/next Sets of cached raster stamps for each chunk. It reconstructs pixel data only when membership changes, instead of replaying every footprint in every chunk. No changes to shaders, selected anchors, geometry or scene content.

30 deterministic selections remain byte-exact to naive rasterization, including upload totals, capacity, empty lists, boundaries, invalidation and eviction. Six real day/night cached/incremental screenshot pairs are pixel-exact, with equal cameras/time/calls/triangles and no captured errors.

The capture reports102 reconstructed and2963 skipped chunk updates across128 selections. This large reduction in reconstruction count **does not establish lower frame cost**: detecting membership still visits selected anchors and maintains Sets.

## Intel UHD A/B/A/B

`river-underlay-mask-incremental-cost-20261022`: cached/incremental/cached/incremental, seed712, media1280x720, same4-unit camera/wind path,60 warmup/90 samples. GPU-query and cadence/CPU passes separate; fixed resident chunks, simulation paused.720 valid GPU queries, exact per-frame cameras/draws/triangles, unchanged simulation, no GL/disjoint/pending errors. No concurrent captures/tests during timing.

| Phase/repetition | Cached CPU ms | Incremental CPU ms | Cached GPU ms | Incremental GPU ms | Cached interval ms | Incremental interval ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Day1 | 6.379 | 6.339 | 15.118 | 15.154 | 17.466 | 17.850 |
| Day2 | 6.136 | 6.943 | 15.028 | 14.998 | 17.604 | 17.551 |
| Night1 | 6.204 | 5.964 | 15.517 | 15.737 | 18.289 | 18.239 |
| Night2 | 6.022 | 7.152 | 15.686 | 15.758 | 18.119 | 18.306 |

No consistent CPU or total-frame benefit; second repetition CPU penalties .808/1.130ms. Full p95 data retained. The result does not justify selecting this extra Set-based machinery. Additional Set storage was not reliably measured; R8/scratch payload is unchanged. Cold capture aggregate CPU was also similar (253.7ms cached/261.7ms incremental, different loading update counts), not evidence of improvement.

## Decision

Reject this optimization as the preferred implementation, preserve it for reproducibility, retain the prior cached-footprint candidate and the visual underlay improvement. Do not discard the visual result for this failed optimization. Investigate persistent spatial eligibility from already accepted tile anchors, invalidated by coverage events, with an explicit fallback for capacity overflow/disabled coverage. That changes mask semantics and must be compared visually and measured; do not silently claim equivalence to selected-list masks.

Production and main unchanged. Native integration, real occupancy changes, fast streaming and broader biome validation remain pending.

## Reproduce

```powershell
node tools/experiments/test-selected-grass-mask-incremental-20261022.mjs
node tools/experiments/capture-river-underlay-mask-incremental-20261022.mjs
node tools/experiments/measure-river-underlay-mask-incremental-20261022.mjs
$env:WG_BENCH_OUT='docs/qa/global-visual-lab/river-underlay-mask-incremental-cost-20261022'
python tools/experiments/audit-canyon-native-composition-resident-cost-20261022.py
```

Vite on5190. Raw capture JSON/PNGs and equality audit retained here. Scope is one River scene, not a global completion claim.
