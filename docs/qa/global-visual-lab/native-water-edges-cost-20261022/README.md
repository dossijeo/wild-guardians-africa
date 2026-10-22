# Native natural shoreline cost

Intel UHD 0x9A60 / ANGLE D3D11, medium, 1280x720, seed 712, original/natural/original/natural, day/night. Same palettes and land materials in both arms. Four-unit moving camera, paused simulation. Each phase: 60 warmup + 90 GPU samples and separate warmup/cadence pass. Audit passes: 1440 valid GPU queries, no disjoint/pending/context errors, unchanged simulation, equal camera sequences and stable repeated per-variant draw/triangle signatures.

Mean GPU milliseconds, original → natural:

| Biome | Phase | Pair 1 | Pair 2 |
|---|---|---|---|
| Savanna | Day | 20.150 → 20.179 | 19.675 → 23.000 |
| Savanna | Night | 22.128 → 20.491 | 21.457 → 22.112 |
| Canyon | Day | 9.462 → 14.261 | 10.046 → 13.246 |
| Canyon | Night | 12.543 → 14.242 | 12.301 → 14.253 |

Canyon shows consistent GPU overhead: +3.200–4.799 ms day and +1.699–1.952 ms night. CPU render submission means rise by 0.155–0.334 ms day and 0.220–0.359 ms night. Frame cadence remains near 16.63 ms by day, 16.81–16.82 ms with natural shores at night; cadence is not GPU time. Savanna varies across repeats, including a 3.325 ms day regression; do not claim neutral cost or improvement. Its frame means are 22.90–25.23 ms and p95 40.9–49.6 ms. Raw distributions and all per-frame metrics are retained.

Recommendation: retain the visible natural shoreline, optimize Canyon's overdraw using the previously verified opaque-interior approach, then repeat native A/B. Do not discard attractive variants merely on this cost. No FPS gain established. The benchmark intentionally suspends chunk synchronization and excludes shore-mask construction; separate construction/streaming profiling remains required.

Reproduce Vite 5190, `node tools/experiments/measure-native-water-edges-cost-20261022.mjs`, then `python tools/experiments/audit-native-water-edges-cost-20261022.py`. Visual parity evidence is in native-water-edges-parity/other-biomes and volcano-shore-settled-parity reports. This is not completion of all-biome benchmarking or the global art goal.
