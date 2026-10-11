# Passive three-worker opening: reject long extension

v91 uses the existing Q7 player policy (three initial paid workers and physically delivered, funded incremental hires) instead of Q9 (six initial workers plus workload downsizing). All frozen source hashes match passive Q9/v77. Seed 712, Sabana/Mapungubwe, cashflow crops, shore zarzas from day six, rolling funding, breach-first repairs and 1.5 fluid clearance are unchanged. No magic, price, damage, production, task ordering or navigation modifications were made.

The native observation survived seven complete nights, with 71 coins, 147 live plants and center HP 600. Reconciliation: `700 + 2063 income - 777 wages - 1905 seeds - 10 walls = 71`. There were 49 crop losses and 69/69 native strikes used. Only one wall piece was paid; the unfinished contour quote is 730 coins, with no completed contour or paid repairs. This cannot prove effective defense.

| Day | Coins | Live plants | Staff at renewal | Wages paid | Bought | Delivered | Crop losses |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 123 | 85 | 3 | 117 | 84 | 0 | 0 |
| 2 | 218 | 84 | 4 | 120 | 34 | 35 | 0 |
| 3 | 154 | 143 | 4 | 120 | 107 | 48 | 0 |
| 4 | 122 | 165 | 4 | 120 | 48 | 26 | 0 |
| 5 | 112 | 155 | 4 | 120 | 0 | 10 | 0 |
| 6 | 150 | 177 | 3 | 90 | 100 | 58 | 20 |
| 7 | 71 | 147 | 3 | 90 | 0 | 1 | 29 |

Day-one wages include a real fractional-day additional hire (27 coins), not a changed elder wage. The purchased count is native seed placements, not a quota or invented activity. Large live stock is not necessarily productive stock: the terminal snapshot contains **88 plants awaiting their first watering**, exactly matching 88 initial tasks, plus 12 later-water tasks and 30 harvest tasks. In particular, day seven delivered only one crate. Plants awaiting first watering have not started normal growth; their 1,617-coin total base harvest potential is not cash or guaranteed revenue.

Terminal, population, workforce, wall allocation/cost and magic-delivery audits passed; `terminal-workload-review.json` verifies the snapshot counts and source equality. The progress PNG was inspected. Seven-night survival is not sufficient to extend this policy to fourteen or one hundred nights. Retain it as a negative capacity/allocation diagnostic. Reducing initial payroll alone did not produce a robust passive policy: real planting outpaced service capacity, while wage reserves left little money for defense. Investigate achievable worker throughput and purchase timing before changing military parameters or fixed crop prices.

The experiment is not a native defeat and must not be labelled one. It does not prove magic mandatory or a navigation bug; pending tasks alone cannot establish why all delays occurred. Human manual inactivity and GPU performance remain unmeasured. Main is unchanged.

## Static access diagnosis

`tools/audit-native-initial-water-routes.mjs` subsequently checked **all 88** pending initial-water plants against the native `wateringRoute` and actual `canWaterFrom` predicate, starting at each plant's associated center service point. All 88 had a valid route and reachable watering stand-off. The original serialized simulation state remained unchanged; no tasks, water, growth, movement, hiring or income were applied. Every frozen campaign source hash matched current files. The evidence records the snapshot and diagnostic-tool hashes plus individual destinations and path lengths in `initial-water-routes-review.json`.

This excludes static disconnection from the tested service points as an explanation for those 88 pending tasks. It does not establish reachability from every dynamic worker pose, collision-free simultaneous service, total shift capacity or absence of other navigation delays. The CPU-only query pass took approximately 207 ms in this run; this is not a frame-time or GPU benchmark. Do not change prices or military damage to mask the unresolved service/allocation problem.
