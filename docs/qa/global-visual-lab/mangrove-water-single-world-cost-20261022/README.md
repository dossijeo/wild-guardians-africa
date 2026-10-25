# Deep Mangrove water: full background, single-world ABAB

One paused seed-712 world, media 1280x720, Intel UHD 0x9A60 ANGLE D3D11. Includes spatialFar=1 native distant impostors and mountains. All four runs reuse the same scene; QA recompiles only natural-water materials with the deep-color branch on/off and distinct cache keys. Extra depth-map lookup is absent in olive shader, rather than hidden behind a zero uniform. Far-water muted blue is held identical in both arms to isolate the near-water shader.

60 warmup + 90 measured frames per pass; GPU timer pass and CPU/cadence pass separate, four-unit circular camera path. Idle far adapters plus 45 stable renders before each phase. Chunk sync suspended during the short resident path; not a streaming benchmark.

## Mean milliseconds, olive -> deep

| Pair / phase | GPU | CPU render submission | Frame interval |
|---|---|---|---|
| 1 day | 20.167 -> 19.053 | 5.737 -> 5.908 | 24.537 -> 25.956 |
| 2 day | 19.294 -> 19.432 | 5.336 -> 5.206 | 23.460 -> 22.488 |
| 1 night | 19.606 -> 20.583 | 5.157 -> 5.128 | 22.796 -> 23.886 |
| 2 night | 19.640 -> 19.383 | 5.129 -> 5.243 | 22.876 -> 23.471 |

720 valid GPU samples; no disjoint, lost, pending or discarded queries. Every GPU-measured frame has identical camera, calls and triangles across all four runs. CPU/cadence workloads match within each A/B pair. Between pairs, night frame 6 differs by +1 call/-690 triangles; all data retained and this deviation is not silently ignored. Audit checks per-pair CPU equality and global GPU equality. State unchanged and zero GL/page errors.

Results are mixed: no consistent speedup or consistent measured penalty attributable to the additional lookup, and no FPS improvement demonstrated. Keep the artistically preferred deep blue. The approximately 19–21 ms whole-scene GPU cost remains material on modest hardware and warrants broader optimization. Do not equate lack of a consistent delta with proof of zero shader cost.

Reproduce: node tools/experiments/measure-mangrove-water-single-world-cost-20261022.mjs; python tools/experiments/audit-mangrove-water-single-world-cost-20261022.py. summary.json includes p95 values. scene.png files are context snapshots, not synchronized grass-animation pixel-comparison evidence. Prior dedicated visual comparisons establish appearance.
