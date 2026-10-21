# Ambient worker clearance at large roster sizes

Baseline: `origin/main` at `b8a2058f5` (PR #194). Windows, Intel i7-11800H, Node 20.11.0. That change made ambient walks respect coworker bodies, but each moving worker scanned the full roster every simulation step. This experiment keeps the same physical clearance and roster order while querying a 10 m bucket index. The index is created only when an ambient walk occurs with at least 96 workers and 16 idle candidates, then updated after each worker's turn. Smaller rosters and sparse idle crews retain the original scan.

The reproducible microbenchmark is `node tools/experiments/benchmark-idle-clearance.mjs`. It warms each variant, runs mirrored A/B/C/C/B/A orders for four rounds and 200 updates per arm, and asserts equal final movement. Actors are deliberately 30 m apart, so it measures the overhead of correctly rejecting distant bodies without mixing in detour searches. Times below are medians for the whole arm, in ms. `control` omits body clearance solely as a cost reference; it is not a shippable rule.

| Workers | Control | Full scan | Buckets |
| ---: | ---: | ---: | ---: |
| 10 | 0.32 | 0.73 | 2.80 |
| 50 | 1.42 | 4.73 | 10.17 |
| 150 | 4.14 | 24.84 | 29.15 |
| 300 | 9.46 | 99.75 | 61.06 |

The bucket setup is not worthwhile for a small isolated idle loop. The game also performs other worker bookkeeping, so a temporary three-arm `Game.tick` probe used the same frozen 712 village state, 100 ticks per arm, mirrored order for three rounds, and the same positions in every arm. It temporarily switched between no clearance, the baseline full scan, and buckets; **those QA switches were removed from production code**. Its median times were:

| Workers | Control | Full scan | Buckets |
| ---: | ---: | ---: | ---: |
| 10 | 1.39 | 1.87 | 1.79 |
| 50 | 4.75 | 9.67 | 9.10 |
| 150 | 18.98 | 72.81 | 29.44 |
| 300 | 75.00 | 380.88 | 100.81 |

This is a synthetic upper-load test: every worker is walking an ambient route continuously and all are spread far apart. It is not a legal campaign, browser frame measurement, or proof of the same gain on a typical farm. `Game.tick`'s 300-worker improvement is about 3.8× for this workload, but the control column shows that other simulation work still grows with roster size. Heap samples from `process.memoryUsage()` were too sensitive to collection timing to establish a reliable memory delta. Buckets hold at most one index per worker plus transient local query arrays; they are discarded after the worker pass, never saved.

`tests/actor-motion.test.js` compares the indexed candidate list against the full scan through 100 workers, negative coordinates, different radii, home transitions and bucket crossings. `tests/idle.test.js` runs 120 ambient walkers with and without the index and compares their entire worker state after 20 updates. A `Game.tick` test exercises the 100-worker indexed path with a close coworker. Existing directed actor, idle and raid regression tests also pass.

The 14-night native Sabana/Mapungubwe/712 replay finished with the same serialized state SHA-256 as `origin/main`: `2224d0ea4889a693d5b396704b444b3dc383a44e02dd2db507d096c08741ec05`; it also had 1,317 deliveries, 899 coins and 145 living crops. Its final staff was 23, so this replay verifies no regression in ordinary small-roster behavior, **not** the large-roster index. It ran alongside the full test suite, so its wall-clock time is not comparable. The synthetic result does not establish campaign speed or all navigation behavior.
