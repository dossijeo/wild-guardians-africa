# Localized removed-prop restore (experimental, stacked on native intents)

The [current-source Manglares day-ten profile](../../wild-engine-intent-lifecycle/manglares-day10-quote-profile.md)
assigned 214,945 of 223,295 samples under `quoteWallChain` (96.3%) to
`restoreRemovedProps` during automatic-door and worker-access previews.
Previously `spatial_restore_removed_props` replaced the whole suppression
set and rebuilt **every resident chunk for every movement profile**, even
when only a few prop IDs changed.

This candidate computes the symmetric difference of the old and requested
prop-key sets. It derives each changed key's deterministic world position
using the existing biome spacing and scatter hash, then rebuilds only loaded
chunks intersecting a conservative 16-unit prop radius plus the indexed
movement margin. Each selected chunk still receives the ordinary complete
prop-raster and sector rebuild, including neighbor borders; no physical
collision test, route algorithm, game rule or virtual-player choice was
removed. The 16-unit bound exceeds the largest generated prop radius after
scale in the current six-biome generator. Identical input sets return
without touching navigation.

Control and candidate were compiled from the same stacked PR #54 source
using Emscripten 6.0.12 and 16 MiB initial memory, with only this C++ change.
The control WASM SHA-256 is
`110ccb71c8785687e747d855b9264f23abf680074b61c6b4c5fa688806607414`
(458,973 bytes); the candidate is
`3597c9d91095a1e5736b12af705c15237d1bcdb4e711bd72948c2fb6c0d58b6b`
(460,557 bytes). The comparison reports record the common source commit
`0cc3c91f`; the candidate source and binary are committed with this report.

`node tools/experiments/compare-removed-prop-refresh.mjs <control.wasm> <candidate.wasm> <report.json>`
compared the six biomes, four resident chunks, worker/hyena/rhino profiles,
seven suppression stages per biome, visual prop lists, removed-prop state,
cell walkability, prop occupancy, edges, physical routes and connectivity.
All **71,190 comparisons matched exactly**. Across its alternated restore
operations, control took 6,893.91 ms and candidate 2,618.45 ms. The full
inputs and per-stage durations are in `qa-prop-local-differential.json`.

An ABBA sequence of the actual three-night Sabana/712 native enclosure
preview returned the same `ready` plan: 66 group crops, 35 modules,
350-coin cost, one gap and 109 placement checks. Plan times were:

| Order | Control A | Candidate A | Candidate B | Control B |
| --- | ---: | ---: | ---: | ---: |
| Plan time | 6,442 ms | 2,834 ms | 2,798 ms | 6,532 ms |
| Preview mutation | 6,079 ms | 2,401 ms | 2,401 ms | 6,152 ms |

The four complete reports are `qa-prop-controlA.json`,
`qa-prop-candidateA.json`, `qa-prop-candidateB.json` and
`qa-prop-controlB.json`. These are short functional and focused timing
checks, not claims about 100-night performance.

A paired continuous Manglares/712 campaign ran the same ten nights with
native worker/animal intentions, spatial advice, event-driven expanding
defense and decision profiling. Both runs verified ten raids with zero
issues. **All ten daily serialized hashes and the final hash matched**;
both ended with 79 live crops, 582 coins, one operational center and
960 coins spent on walls. Native task-route query totals also matched at
3,749. Only the WASM binary changed:

| Measure | Global rebuild | Localized rebuild |
| --- | ---: | ---: |
| Elapsed runner | 278.38 s | 210.16 s |
| Bot decisions | 180.83 s | 112.81 s |
| `Game.tick` | 81.63 s | 81.57 s |
| Day-ten wall quotes | 147.83 s | 81.97 s |

The 68.21-second elapsed gain is a single paired result, supported by the
ABBA preview and differential checks; it is not a cross-seed or cross-biome
campaign estimate. The two full reports are
`qa-prop-manglares-control.json.gz` and
`qa-prop-manglares-candidate.json.gz`.

The candidate passed the dedicated cross-chunk restoration regression,
the targeted spatial/native-intent suite (82 passed, 28 intentionally
skipped), 196 playable tests, the web build, asset verification and web-package
check locally. The complete repository suite finished with 4,351 passes,
32 failures and 51 skips among 4,434 tests. Failures span historical
100-night victory expectations, copy/audio/UI tests and simulation tests;
they are not claimed as passing. The reserved-wall failure in
`acceptance-defensive-reservations.test.js` was reproduced with the prior
control WASM as a first baseline check. The full list is retained in the
local `full-test-prop-restore.log`, with the names and totals committed in
`full-suite-failures.txt`; the branch cannot claim a green full
suite from this run. This remains
on draft PR #54, stacked on the native-intent planner. There is **no merge
to main** and no default activation of native intentions. More biomes,
larger resident worlds and a longer campaign remain useful before final
integration with that planner.
