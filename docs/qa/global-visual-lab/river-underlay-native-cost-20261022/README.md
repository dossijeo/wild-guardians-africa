# Native River underlay ABAB cost

Run `node tools/experiments/measure-river-underlay-native-cost-20261022.mjs`, then set WG_BENCH_OUT to this directory and run `python tools/experiments/audit-canyon-native-composition-resident-cost-20261022.py`.

Intel UHD ANGLE D3D11, Chrome headless, 1280x720, media, seed 712. Same coverage, geometry and looping 4-unit camera motion. A excludes underlay and mask work; B enables native persistent underlay. ABAB, day/night; each GPU and separate cadence pass uses 60 warmup + 90 samples. 720 GPU samples valid, no disjoint/errors, camera/calls/triangles exact per corresponding frame, simulation unchanged. Resident streaming suspended during timing; no screenshots concurrent.

Mean milliseconds (A / B):

| Pair | CPU render submission | GPU | RAF interval |
|---|---|---|---|
| Day 1 | 4.996 / 5.231 | 16.620 / 15.611 | 18.349 / 18.548 |
| Night 1 | 4.792 / 4.788 | 16.890 / 16.832 | 19.102 / 19.130 |
| Day 2 | 5.500 / 4.849 | 15.468 / 15.585 | 18.906 / 18.469 |
| Night 2 | 5.010 / 4.968 | 15.982 / 16.395 | 18.914 / 19.590 |

Baseline GPU itself shifts by 1.152 ms day and .909 ms night. Do not claim the first-pair GPU reduction as an optimization. Second-night overhead is .413 ms GPU and .676 ms interval; CPU differences are mixed. RAF interval is refresh/scheduling constrained, not uncapped throughput. P95 and raw samples are retained in summary.json / benchmarks.json.

Recommendation: RETAIN the opt-in visual improvement. Cost is modest in this resident fixture but not proven zero, and there is no stable FPS improvement. It adds 25 R8 masks (235225 texel bytes here) plus equal-sized CPU scratch and unmeasured JS cache overhead; no new geometry/draws/passes. Cold rebuild and fast streaming cost remain outside this benchmark. Previous native parity and lifecycle evidence supports visual correctness. Next resume artistic review across biomes; do not spend further iterations trying to rebrand this improvement as a speedup. Defaults/main unchanged.
