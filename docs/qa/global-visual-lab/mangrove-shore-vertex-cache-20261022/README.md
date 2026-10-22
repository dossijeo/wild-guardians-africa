# Shore boundary vertex preparation reuse

Each nonindexed triangle vertex was read, allocated and formatted twice for its two incident edges. The boundary builder now prepares its coordinate pair and rounded key once, reusing them within the same map build. Edge counting, bins, segment distances, sampled heights, resolution and shader stay unchanged. Temporary arrays live only during construction; no persistent cache or per-frame work is added. Canyon bypass still skips vertex extraction.

Real-game Mangrove ABAB, seed 712, medium 1280x720, day/night round trips. Same instrumentation. Day includes initial map builds; night is warm. CPU map-construction totals, not GPU or frame times:

| Run | Phase | Builds | Total ms before → after | Max ms before → after |
|---|---|---|---|---|
| 1 | Day | 45 | 448.9 → 396.5 | 23.3 → 21.5 |
| 1 | Night | 25 | 231.7 → 219.7 | 18.3 → 17.5 |
| 2 | Day | 45 | 460.7 → 384.9 | 22.7 → 20.1 |
| 2 | Night | 25 | 239.8 → 199.5 | 18.3 → 15.6 |

Retain: saves 52.4–75.8 ms day and 12.0–40.3 ms night over the path. All twenty corresponding RGB captures are exact. No browser/WebGL errors. Packed-map comparison passes for positive/negative chunk origins with and without Canyon bypass; texture ownership/opt-in tests also pass. No FPS improvement claimed. Other biomes use the same algorithm but their timing benefit is not yet measured.

Reproduce `node --test tests/canyon-shore-build.test.js tests/natural-water-edges.test.js`; Vite 5190, `node tools/experiments/profile-mangrove-shore-vertex-cache-20261022.mjs`, then `python tools/experiments/audit-mangrove-shore-vertex-cache-20261022.py`. Remaining: height sampling and boundary-distance costs, modest-profile validation and global visual work.
