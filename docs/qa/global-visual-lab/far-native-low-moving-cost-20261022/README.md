# Native smooth transition: moving low-quality ABAB

Intel UHD 0x9A60 / ANGLE D3D11, Chrome headless, 1280x720, seed712 Mangroves, low quality. Full native distant impostors and mountain backdrop. Separate loaded worlds alternate original/smooth/original/smooth. Each pass: 60 warmup +90 samples; GPU timer queries and CPU/cadence collected separately. Simulation paused, 24-unit lateral camera motion, syncChunks suspended during sampling; far adapters remain active. This excludes streaming latency.

720 valid GPU samples, no disjoint/discarded/pending queries, no browser or GL errors. Every sampled pair has identical camera and workload after subtracting the observed opaque split. No unexplained draw/triangle deltas. The observation traversal runs in both arms and is included in CPU timing.

| Phase | Run | Variant | GPU mean / p95 ms | CPU mean / p95 ms | Interval mean / p95 ms |
|---|---|---|---|---|---|
| day | 0 | original | 20.19 / 22.39 | 5.88 / 8.40 | 24.83 / 29.30 |
| night | 0 | original | 21.26 / 24.04 | 5.84 / 8.40 | 27.03 / 31.70 |
| day | 1 | smooth | 19.20 / 22.97 | 5.98 / 8.80 | 25.12 / 32.30 |
| night | 1 | smooth | 20.32 / 23.52 | 6.10 / 8.60 | 26.97 / 31.20 |
| day | 2 | original | 19.54 / 22.93 | 5.44 / 8.80 | 23.19 / 29.30 |
| night | 2 | original | 20.52 / 24.22 | 5.88 / 8.40 | 26.62 / 31.00 |
| day | 3 | smooth | 20.60 / 25.24 | 5.48 / 7.60 | 24.48 / 28.10 |
| night | 3 | smooth | 19.54 / 23.01 | 5.00 / 7.00 | 22.87 / 25.00 |

Daytime paired GPU deltas: -0.99 and +1.05 ms. Night: -0.94 and -0.98 ms. CPU and intervals vary; the final nighttime run is substantially faster beyond the isolated material cost. Reload/system variance remains: do not claim a causal FPS optimization. No consistent daytime GPU penalty is demonstrated in this scene.

Recommendation: retain the smooth option for its visual benefit. This modest-profile result does not justify rejecting it for performance, but it is one biome and one local moving path. Cross-atlas partial overlap, standby ordering and full obstruction coverage remain limitations. No global default change in this commit.

Reproduce with `node tools/experiments/measure-far-native-low-moving-cost-20261022.mjs` followed by `python tools/experiments/audit-far-native-low-moving-cost-20261022.py`, Vite port5190. Raw timing, device, memory and per-frame workload metadata are in benchmarks.json; summary.json validates pair differences.
