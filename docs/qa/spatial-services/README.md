# Experimental Wild Engine spatial services

Branch `codex/wild-engine-spatial-services` is stacked on the experimental native-intent branch at `d903d827`; neither branch is merged into `main`. This avoids maintaining a second live-entity index while the action planner is under review. The production WASM and player policies are unchanged. All measurements below use a separately built candidate WASM.

## Implemented experimental read services

The shared native target index now accepts structure HP, status and material deltas. Two ordered sets hold damaged walls and damaged work centers separately by descending damage ratio, then numeric structure ID. HP-only updates advance a separate damage revision; they do not change Wild Engine's topology or action-planning revisions, nor wake the event-driven task planner. Removing a structure clears it from the index. A rejected batch leaves the native index unchanged, and the JS bridge replays authoritative state.

`getDamagedWalls()` and `getDamagedCenters()` return IDs, HP, damage ratio, status, material, revision and the exact `repairCost()` rational calculated by the game's economic authority. The `paidCoins` field is the integer debit that `transact()` would settle. A ruined module is reported separately through its status and quoted at full reconstruction cost. These queries are for **advice**: ordinary game commands still decide permission, affordability and whether a repair is actually completed.

The bridge is still experimental. A full-state replay occurs once after load; later updates require committed `structureDamage` or target events. The normal game does not emit those events into this bridge yet. No bot decision has been switched to the endpoint.

`getUnprotectedCropGroups()` now maintains a cached native grouping of living crops using the game's 1.7 m, same-species adjacency rule. Group IDs derive from the lowest numeric crop ID and remain stable until membership changes. The C++ index receives crop species and original harvest value as confirmed deltas, so the aggregate is independent of current money. A query selects each of the five animal movement profiles in Wild Engine, reads its weak-region closure certificate, and returns `protected`, `unprotected` or `unknown` with a revision and the crop IDs. No `unknown` is certified protected. Crop changes invalidate grouping; structure HP-only changes do not. Topological changes invalidate the per-profile closure certificate through Wild Engine's native revisions. This is an advisory read model; it does not decide how much to spend or automatically build walls.

`findPlantingSite(centerId)` now has an experimental nearest-first native search over resident chunks. It uses a persistent bounded-work priority queue, a live-crop occupancy grid, native terrain/prop/barrier placement checks, and native worker routes in both directions from the actual center service point. A found site can receive a provisional lease so consecutive requests do not return the same position. Releasing an unused lease reopens the search; confirming a paid `Game.plant()` call is separate from the lease and still requires the ordinary game command. Results distinguish `found`, `pending`, `blocked`, `no-space` within the resident window, and `unknown` when spatial data is absent. A missing resident chunk cannot be called exhausted. The site finder is **not connected to the campaign bot**; its search-window expansion and event scheduling still need validation before adoption.

The physical regression builds a paid ring and automatic worker door, plants inside it, confirms all five profiles classify the crop as protected, then removes actual wall modules until the graph observes a breach. The native group result then ceases to be protected. A second regression compares every group member with the existing game grouping on a frozen day-15 state, including save/load and crop-removal invalidation.

Planting regressions compare hundreds of resident Desert candidates and samples from all six biomes against `nav.placement()` and reject every false positive. A frozen day-15 state obtains two distinct reserved sites, verifies actual outward/return worker routes, then makes a real paid plant command and confirms the next native result does not overlap it. These directed checks do not establish full equivalence across all cultures or geometry changes.

## Reproduction and early evidence

Build the candidate with `SPATIAL_WASM_OUTPUT=.cache/spatial-services-prototype.wasm bash tools/build-spatial-savanna-wasm.sh` in the configured Emscripten environment. Set `WILD_ENGINE_SPATIAL_SERVICES_WASM=.cache/spatial-services-prototype.wasm` and run `node --test tests/spatial-native-damaged-services.test.js`. The test checks ordering, exact repair quote, HP-only invalidation, reconstruction, removal, rejected deltas and replay after save/load. The inherited native-intent tests also pass on this binary.

`tools/experiments/benchmark-spatial-damage-service.mjs` compares hot JS filtering/sorting with the candidate endpoint using frozen states and ABBA order. In two 5,000-query runs on the Desert day-7 repair state (58 structures, four damaged walls), JS arms ranged 10.9–17.0 ms and WASM arms 12.5–22.0 ms; initial native read-model synchronization took 13.7–16.9 ms and a damage delta 0.26–0.31 ms. These tiny query timings are JIT-sensitive and show **no established throughput advantage**. The current candidate WASM with crop grouping and planting prototype is 347,687 bytes; the earlier damage-only binary was 309,698 bytes. A second Desert day-15 state has 118 structures and zero damaged walls; it likewise showed mixed order-sensitive timings. Neither microbenchmark measures the player's actual decision loop or an entire campaign.

An opt-in, read-only decision profiler now separates plot placement, outward and return routes, wall strokes, previews, placements, builds and other bot work. Reproduce with `node tools/experiments/profile-spatial-player-decisions.mjs 14 .cache/spatial-player-decisions-baseline-14.json`. On Sabana/712, good strategy, 14 nights, this branch measured **5.29 s** total `act()` time. Selected nights (milliseconds):

| Day | Decision | Plot search | Defense | `Game.tick` |
| --- | ---: | ---: | ---: | ---: |
| 3 | 413.5 | 193.0 | 100.5 | 17,088.2 |
| 4 | 365.3 | 160.6 | 65.5 | 17,362.7 |
| 12 | 362.2 | 84.6 | 20.9 | 26,858.4 |
| 14 | 231.5 | 30.5 | 19.9 | 21,761.7 |

This does **not** reproduce the reported 196 s player-decision / 151 s tick campaign: the source revision, policy, or workload differs. It is a new local baseline, not evidence that the original bottleneck is solved. Route and wall timings are nested within plot/defense time and must not be added a second time.

Before claiming a performance win, reproduce the 196 s workload or freeze its exact state, measure synchronization and queries during normal bot actions, then compare sustained campaigns. The **remaining requested endpoint**—`planCropEnclosure(groupId)` with incremental wall reuse, validated automatic doors and two-phase paid confirmation—is not implemented. Production event integration of any endpoint remains open. Wall-chain preview/build duplication is untouched. The native advice endpoints must not yet replace game commands or represent completed economic optimization.
