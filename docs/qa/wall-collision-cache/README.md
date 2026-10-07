# Reuse rigid wall collision geometry

Point collision queries previously recalculated wall trigonometry; segment queries also rebuilt four expanded polygon vertices on every test. The navigator now shares a WeakMap-backed frame and caches polygons by actor radius. Every access checks position, yaw, horizontal scale, gate identity and material, so edited/proposed walls cannot reuse stale geometry. Each wall retains at most eight radius polygons. Weak keys allow discarded navigation snapshots to be collected.

Worker gate-frame and swinging-panel collision paths remain separate. This does not change wall placement, water/lava rules, procedural props, route smoothing, task ordering or collision margins. The gate's rigid animal envelope retains its previous material scale.

All 84 directed tests passed: 2,000 exact original polygon/segment comparisons, point decisions, mutable geometry inputs, bounded radius caching, native gate frames and articulation, mixed gates/closures, navigation bounds/neighbors/segments, crop navigation epochs and raid navigation. The build passed with the existing bundle-size warning.

`benchmark.json` compares the full prior point and segment collision methods imported from Git revision `f63d82db`, with identical wall objects and query order. Terrain is allowed and props are empty to isolate wall collision; this is not a full terrain/pathfinding benchmark. Every batch performs 10,000 point and 10,000 segment queries. Two warm-up pairs precede twelve alternating measured pairs. All paired result sums match exactly. Normal background campaigns remained running.

| Walls | Reference median (ms) | Candidate median (ms) |
| --- | ---: | ---: |
| 1 | 43.702 | 35.246 |
| 20 | 483.950 | 384.268 |
| 100 | 979.398 | 749.136 |

The measured local CPU reduction is about 19–24%. It does not establish an equivalent integrated frametime/FPS gain, memory reduction or physical-mobile improvement. Cache memory and cold construction are not measured here; the initial equality pass populates the cache. Large-farm rendering and route-search costs remain separate work.

Reproduce: `node tools/benchmark_wall_collision.mjs f63d82db .cache/wall-collision-benchmark.json`. The report retains source hashes, all measured rows and exact-result checks.
