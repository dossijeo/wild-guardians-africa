# Smooth far alpha, fixed-camera ABAB

QA candidate, not production. Full spatial background, seed 712 Sabana, media 1280x720, Intel UHD 0x9A60 ANGLE D3D11. One warmed world, fixed oblique camera, dither/alpha/dither/alpha, 60 warmup + 90 samples per phase/pass. GPU timers and cadence measured separately. Camera movement and streaming explicitly excluded.

All GPU camera/call/triangle signatures match across four runs. CPU workload matches within each A/B pair. 720 valid GPU timer samples, no discarded/disjoint/context errors, simulation unchanged. Means in ms:

| Pair / phase | GPU dither -> alpha | CPU render dither -> alpha | Frame interval dither -> alpha |
|---|---|---|---|
| 1 day | 23.748 -> 21.892 | 5.423 -> 4.576 | 26.358 -> 22.696 |
| 2 day | 23.779 -> 25.753 | 4.657 -> 5.028 | 23.114 -> 25.416 |
| 1 night | 23.978 -> 24.195 | 4.867 -> 5.202 | 24.586 -> 27.190 |
| 2 night | 23.665 -> 24.760 | 4.519 -> 5.703 | 22.931 -> 28.161 |

No overall performance improvement demonstrated. Daytime variation changes sign; night costs increase in both pairs. Retain candidate for visual refinement/optimization rather than rejecting on this cost. Must still validate overlap/order for transparent instanced batches, camera motion, other biomes and modest quality. Fixed-camera acceptance cannot stand in for those checks.

Reproduce measure-far-alpha-static-cost-20261022.mjs, then set WG_BENCH_OUT to this directory and run audit-far-alpha-single-world-cost-20261022.py. summary.json includes p95. Static visual evidence with exact return controls is in far-transition-warmed-world-20261022. Earlier moving benchmark fails workload parity and is not used for these conclusions.
