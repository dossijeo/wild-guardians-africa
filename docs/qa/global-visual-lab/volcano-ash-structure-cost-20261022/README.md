# Volcanic ash deposits: resident ABAB cost

Reproduce: `node tools/experiments/measure-volcano-ash-structure-cost-20261022.mjs`, Vite 5190. Audit using `WG_BENCH_OUT=docs/qa/global-visual-lab/volcano-ash-structure-cost-20261022` with `audit-canyon-native-composition-resident-cost-20261022.py`.

Intel UHD ANGLE D3D11, seed 712, media, 1280x720. Baseline/deposits/baseline/deposits, day and night; identical resident four-unit moving camera path. 60 warmup + 90 samples per pass. GPU queries separate from cadence run. CPU is synchronous render submission; interval is RAF cadence, not uncapped throughput. Streaming suspended equally in both arms, simulation paused.

Audit passed: 720 valid GPU samples, no disjoint/discarded queries or GL errors, exact per-frame camera/draw-call/triangle sequences and unchanged simulation state. Initial failed attempt assumed grass audit exists in Volcano; the QA adapter now checks the function and omits it for this biome. No renderer changes needed.

| Pass | CPU mean ms | GPU mean ms | Interval mean ms | GPU p95 ms |
|---|---:|---:|---:|---:|
| 1 baseline day | 4.577 | 13.100 | 16.631 | 15.808 |
| 2 baseline night | 4.394 | 14.032 | 16.628 | 16.534 |
| 3 deposits day | 4.650 | 13.138 | 16.632 | 15.823 |
| 4 deposits night | 4.772 | 14.057 | 16.631 | 16.268 |
| 5 baseline day | 4.542 | 13.303 | 16.632 | 16.087 |
| 6 baseline night | 4.411 | 14.153 | 16.627 | 16.631 |
| 7 deposits day | 4.456 | 13.173 | 16.637 | 15.714 |
| 8 deposits night | 4.611 | 14.156 | 16.638 | 16.780 |

Paired GPU deltas: day1 +.039 ms, night1 +.025, day2 -.130, night2 +.003. No consistent GPU regression or improvement. Night CPU rises +.378/+ .200 ms; day changes +.073/-.087 ms. Cause of CPU variation is not isolated; do not call free or faster. Cadence remains approximately 16.63 ms under browser pacing, masking small throughput differences.

Elevated/reverse daytime captures from the visual study were also inspected: deposits remain coherent at these angles, but broad smooth areas merit restraint. Retain candidate for its more visible material separation. Next validate camera motion visually, lower-quality profile and additional seeds, then consider opt-in native integration. No dynamic streaming latency, full memory accounting or global art equivalence claim.
