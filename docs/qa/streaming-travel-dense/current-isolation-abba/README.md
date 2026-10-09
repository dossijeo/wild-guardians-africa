# Current-main dense traveling AB/BA

Native885–888, frozen main `4c63faf9`, A1/B1/B2/A2. All four use the same archived Gran Río/Suajili farm (1257 living crops,34 ready actors), medium quality,180m/15s camera route and exact initial/final camera. Programs-only resident preparation,27 resident textures and the crate shadow primer are matched. No full resident geometry primer, binding/resource probes or trace wrappers during measurement. Only `isolatePreparation` differs.

| Arm | RAF p95 / max ms | RAF >100ms | GPU p95 ms |
| --- | --- | --- | --- |
| A1 | 149.8 / 232.8 | 35 | 72.55 |
| B1 | 116.4 / 149.7 | 22 | 69.56 |
| B2 | 116.4 / 149.7 | 16 | 68.04 |
| A2 | 166.2 / 199.6 | 41 | 70.55 |

Both isolated runs have lower p95 and fewer >100ms intervals than both controls. This reproduces the earlier positive comparison on current main without the historical local CPU campaigns. It supports the candidate for this desktop route; it does not prove smooth60FPS, mobile/all-biome performance, physical memory savings or absence of every motion artifact. Significant slow frames remain.

Each run installed15new chunks, kept serialization unchanged and finished all timer queries with zero disjoint/errors. Contexts were disposed/lost, tabs closed and browser inventory empty. Queries cover synchronous `world.render`; asynchronous far preparation outside it is excluded. RAF gaps include scheduler/GPU backpressure. Paused actors are ready but this fixture does not prove live task/raid movement.

Raw reports are lossless gzip, endpoint screenshots and source hashes retained. The separate paired buffer audit and six-biome zero-upload/flag/shadow-resource checks remain separate evidence; do not treat this timing measurement as their replacement.
