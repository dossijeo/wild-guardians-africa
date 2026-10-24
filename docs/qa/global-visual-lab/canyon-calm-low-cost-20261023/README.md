# Native calm Canyon water, low-quality cost

Source c3794f4ae. Intel UHD0x9A60 ANGLE/D3D11,1280x720, low quality, same populated native-camera fixture. Native canyonWater=calm compared against native baseline (no browser shader replacement). A/B/A/B, each day/night;60warmup and90GPU queries plus independent90-frame cadence per phase.720 valid GPU queries, no recorded errors/disjoint/lost/pending queries. Strict audit passed: scene state, workers, resident resources, camera and draw/triangle sequences match across all runs.25resident ground masks preinitialized.

| Variant | Phase | GPU mean ms | CPU mean ms | Cadence mean ms |
|---|---|---:|---:|---:|
| baseline | day | 12.053 | 5.727 | 16.628 |
| baseline | night | 14.061 | 5.679 | 16.630 |
| day | day | 11.929 | 5.270 | 16.623 |
| day | night | 12.278 | 4.743 | 16.627 |
| baseline | day | 11.025 | 5.437 | 16.628 |
| baseline | night | 13.378 | 4.407 | 16.632 |
| day | day | 12.199 | 4.808 | 16.629 |
| day | night | 12.783 | 4.428 | 16.632 |

Day GPU difference -.124ms then +1.174ms. Night -1.783/-.595ms despite unchanged night shader behavior. Results show substantial run-order/system variation; **do not claim a speedup or zero cost**. This limited run neither establishes a consistent penalty nor a performance advantage. CPU/cadence and p95 retained in summary.json. Candidate draws identical workload; no geometry reduction used to explain results.

Fixed resident camera, paused simulation, syncChunks suspended during timing; not active-game/streaming performance. Low quality disables shadows independently of this feature and remains an artistic compromise. Medium remains preferred reference. No default change from this validation.

Reproduce with Vite5190: WG_COVER_QUALITY=baja, WG_NATIVE_REFLECTION=1, WG_REVIEW_OUT=docs/qa/global-visual-lab/canyon-calm-low-cost-20261023; node tools/experiments/measure-canyon-day-reflection-20261023.mjs; python tools/experiments/audit-canyon-day-reflection-20261023.py. Benchmark helper defaults preserve the previous medium QA study; new environment options select native/quality/output explicitly.
