# Prepared navigation for first incursions in paid populated farms

The entry worker now returns bounded static navigation query results as well as
the entry positions. It previews approaches using live crop and worker positions
from its isolated request. The real simulation still chooses targets, reserves
groups and moves actors; no preview decision is applied. Successful routes are
reused only for an identical start, end, radius, ignored obstacle, actor category
and search margin at the same navigation epoch. Failed search regions are not
imported. Geometry changes invalidate prepared paths, including construction
previews. Returned waypoints are copied before actors can mutate them.

Transfer limits are eight prop chunks, 5,000 walkability answers, 10,000 segment
answers, and 128 successful paths with at most 20,000 waypoints in total. Replies
remain subject to the existing input-key checks both at receipt and actual spawn.
Changes to crops or actor positions can make queries unneeded; they cannot apply
a stale target choice. A missing query uses the original native search.

The original six paid first-day snapshots remain in `../populated-raids/`.
Each `routes-*.json` records four alternating reference/prepared repetitions,
source fingerprints and complete-state hashes at each of twenty native Game
ticks. These sequential biome measurements ran alongside other CPU tests and
the isolated campaign, so absolute times are diagnostic, not phone frame times.

| Biome | Reference first update | Prepared first update | Prepared spawn |
| --- | ---: | ---: | ---: |
| Sabana | 73.60 ms | 1.04 ms | 0.64 ms |
| Gran Río | 58.05 ms | 0.68 ms | 0.41 ms |
| Manglares | 0.96 ms | 1.29 ms | 2.64 ms |
| Volcanes | 10.57 ms | 1.16 ms | 0.81 ms |
| Gran Cañón | 3.05 ms | 1.07 ms | 0.52 ms |
| Desierto | 0.87 ms | 0.83 ms | 0.73 ms |

The new regression test also compares entire states after every step for ten
simulated seconds in each of the six farms. It checks bounded replies, exact
query keys, waypoint ownership, failed-query precedence and geometry invalidation.

`browser-*.json/png` are native WorldScene replays of Sabana, Gran Río and
Volcanes with 66 living crops and six paid workers. Their diagnostic cameras
and resident bounds are determined by the loaded scene. A native module worker
prepares the input, its accepted reply is transferred and used once, and each
replay reaches a real CropHit without errors or changing the balance.

| Browser biome | Worker preparation | Spawn | First/max Game tick | Time to first hit |
| --- | ---: | ---: | ---: | ---: |
| Sabana | 326.7 ms | 1.6 ms | 6.8 ms | 17.65 simulated s |
| Gran Río | 292.1 ms | 1.8 ms | 5.8 ms | 17.65 simulated s |
| Volcanes | 327.1 ms | 2.0 ms | 5.7 ms | 17.85 simulated s |

These browser checks use very-low quality with no audio or HUD. They establish
worker transfer and physical attack behavior for those loaded farms, not an
FPS improvement, physical mobile acceptance, continuous player interaction or
hundred-night balance. The longer time to first hit in these camera views is
recorded rather than hidden by advancing the clock.

Reproduce with a fresh output path:

```
node --test tests/raid-navigation-warmth.test.js tests/raid-entry-preparer.test.js
node tools/benchmark_raid_first_routes.mjs docs/qa/populated-raids/sabana.json NEW_REPORT.json 4
```

Native browser fixture: `tests/browser/populated-raid.html?biome=sabana`.
Production build and web-package validation pass: 586 files, 407,000,520 bytes,
839 relative links and 20 runtime GLBs. Full-suite and mobile acceptance remain
separate gates; this report does not mark the overall project complete.
