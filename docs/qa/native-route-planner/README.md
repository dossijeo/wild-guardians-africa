# Wild Engine: native route and action-planner investigation

Experimental branch `codex/wild-engine-native-route-planner`, based on `origin/main` at `dd71c144`. Game balance and player policy are unchanged. The candidate route and task kernels remain opt-in and the shipped `spatial-savanna.wasm` is unchanged. This branch now also changes the JS simulation's scheduling of failed route and task retries as a transitional polling-removal experiment. It is a **partial prototype**, not a completed native action-planner migration.

## What PR #43 established

[PR #43](https://github.com/dossijeo/wild-guardians-africa/pull/43) found stale JavaScript navigation answers after sector unload and portal-only construction previews. It also showed that moving only the discrete-route cache to C++ lost to a correctly invalidated JS cache in complete ticks. This branch tests a different question: whether moving fractional endpoint connection and whole-route reconstruction into C++ changes that tradeoff. The Manglares frozen state is copied from PR #43, unmodified (SHA-256 `764D2D569EA6F893F8D074EEFB155D7255CB40CBE7400CCF9F4D2516AC144364`).

## Implemented candidate

`spatial_world_route` receives fractional world coordinates, uses native physical predicates for direct motion and grid connectors, calls the existing sector graph, and expands automatic-gate portal crossings in one native operation. Gate connector selection is likewise native; JS supplies only the gate's authored world points. `spatial_world_route_cached` uses a bounded, direct-mapped 1024-slot table keyed by exact float32 coordinate bits, movement profile and a native graph revision. Route vectors stay in the cache on hits; `spatial_world_route_batch` accepts up to 4096 queries and returns contiguous route points and status rows. `unknown` is not retained as a negative proof. Sector creation/removal/rebuild and portal commits advance the native revision. The cache has no persistent saved state, so a fresh WASM session begins empty after load.

The subsequent `nav_plan_tasks_shadow` proof accepts compact worker, target and task buffers and evaluates a whole queue in one native call. It preserves `(created, task ID)` priority, `(distance, worker ID)` selection, one worker per task and distinct pending `unknown` versus blocked status. It returns assignments and contiguous routes without writing JS task state or leases. The directed test compares its decisions against `reserveTasks()` and checks repeated planning has no side effects. This **only supports direct target service points**; JS currently computes eligibility and writes the buffers, while watering/repair points still require their real policies. It is not a replacement for task assignment in the game.

An additional isolated `spatial-intent-state.cpp` prototype keeps live worker, target and task records inside WASM through ordered incremental change batches. It evaluates the global task queue in one call, provisionally reserves each selected worker, and either discards or commits the whole proposal after checking entity, route-graph and movement-profile revisions. The test covers ordered replay after reset, rejected missing/duplicate event sequences, target removal, profile invalidation and exclusive assignment. This prototype is **not wired into gameplay**. It has no raid policies, real task leases, route handles, actor movement or measured production speedup. Its per-delta batch is capped at 4096 records; the total indexed population is not capped.

The native index now also generates the ordinary/banana watering offsets and center/wall repair approaches from target metadata, then returns the chosen fractional approach and route in the same result row. Watering checks the same worker-versus-crop height tolerance, including the Gran Cañón river floor. A controlled WASM test places a crop and a physical wall, confirms the watering point passes the game's `canWaterFrom()` interaction rule, and confirms the repair point is outside the wall. This is still **prototype geometry**, not full policy parity: JS's watering shortcut can choose another valid point, real target metadata is not synchronized into WASM yet, and the result is not used by actual workers. Closed/open gates, center footprints, mixed task queues, save/reload and campaign performance still require differential replay before this can replace `work-points.js`.

The first frozen differential checks use a Desert day-15 state with one eligible worker and a real nearby crop, and a Gran Cañón day-1 state with one worker released to a pending watering queue. On the controlled Desert action, both JS and native choose the same task and make one route query. In the canyon, both leave all 14 tasks pending; native stops after the first unknown service point per task, matching JS's 14 attempted candidates instead of probing 94 alternative angles. These deliberately controlled actor states are **not** a campaign or broad equivalence claim. Run `WILD_ENGINE_NATIVE_ROUTE_WASM=.cache/native-route-prototype.wasm node --test tests/spatial-native-intent-index.test.js tests/spatial-native-intent-differential.test.js`. The candidate binary is 304,300 bytes versus 247,815 bytes distributed; that increase includes all earlier route/action prototypes, not just this service-point addition.

The current JS wrapper still creates `{x,z}` point objects because the game's active movement path format requires them. It retains the caller's exact final destination after native float32 planning, preventing harmless rounding from changing worker state. The batch API is experimental; there are no route handles or native movement yet. Direct mapping has bounded storage but can evict useful routes on collisions; no claim of optimal hash architecture is made.

## Polling audit and transitional scheduling

Optional `nav.planningObserver` records planning events by actor and simulated time. A failed `walkTo` plan now waits for changed destination, topology or native sector-residency revision, with an eight-second fallback for dynamic situations. **Resumable fractional-exit and worker-return searches are exempt** while their bounded search cursor is active; the first full suite run caught this distinction, and its night-25 exit/reload cases pass after the correction. A waiting raid animal reselects on topology, sector, lease or hit-progress change, with the same bounded fallback. Worker task assignment runs when the queue reference/length, task lease revision, idle-worker set, topology or sectors change, or after eight seconds; active paths continue moving normally. A released task lease therefore wakes assignment even if the queue array is unchanged. The wait state is transient and a load gets a fresh plan. The benchmark's `polling` argument disables the two JS wait guards, while `legacy` disables assignment-route handoff; these are QA switches, not game settings.

Frozen 20-second Gran Cañón watering state (`watering-gran-canon-saheliana-detour-10.json.gz`), one control and one event-driven run:

| Metric | Polling control | Event-driven guard |
| --- | ---: | ---: |
| Task assignment passes | 200 | 20 |
| Worker/task candidate route evaluations | 4,878 | 518 |
| Route calls crossing JS→WASM | 151 | 151 |
| `Game.tick` total | 138.1 ms | 97.8 ms |
| Serialized state hash | `a44860c16d87…` | `a44860c16d87…` |

These counts are from the pre-handoff commit `9527f73b`: [`ticks-watering-gran-canon-saheliana-detour-10-a-polling.json`](ticks-watering-gran-canon-saheliana-detour-10-a-polling.json) and [`ticks-watering-gran-canon-saheliana-detour-10-a-pre-handoff.json`](ticks-watering-gran-canon-saheliana-detour-10-a-pre-handoff.json). A second ABBA sequence at that commit gave polling 130.0/138.2 ms and guarded 119.1/103.5 ms with identical hashes, retained in [`polling-watering-abba.json`](polling-watering-abba.json). This is a short trace, not sustained campaign evidence. Task candidate attempts remain high because the current selector is still JS and repeats the pending queue at each legitimate retry. The next native milestone must replace this whole selection/reservation/route operation, rather than cache each candidate.

The per-actor audit makes that limitation concrete: in the event-guarded 20-second trace, `worker-16` still receives 306 worker/task candidate probes (918 per simulated minute) and `worker-12` receives 197 (591 per minute). Many are repeated blocked or pending tasks in the same queue, not new worker actions. The requested goal of roughly one action plan per unit/action is **not met** by this transitional JS guard or by the shadow native batch. A native action request must internally evaluate and coalesce the queue without exposing each candidate as a new JS→WASM request, and pending region decisions must persist until a relevant event.

The next diagnostic split the 20-second task wakeups by cause: 18 queue changes, 14 lease changes, seven idle-worker changes and one initial pass; there were no topology or sector-residency wakes. The ordinary selector then retried 512 physically blocked worker/task approaches and found six routes. A narrow per-task/worker wait now defers the same failed approach while its target, worker neighborhood, topology and sector residence remain stable, with an eight-second retry. It does not treat a deferred failure as a fresh blocked proof. In a paired **200-tick** Gran Cañón replay, real candidate route attempts fell **7,191 → 1,568**, JS→WASM route calls **2,528 → 794**, while both arms ended with the same serialized hash (`cbfd93c4…`). Single-run `Game.tick` totals were 637.4 versus 520.4 ms and should not be read as a stable throughput estimate. The raw arms are [`candidate-wait-200-control.json`](candidate-wait-200-control.json) and [`candidate-wait-200-guarded.json`](candidate-wait-200-guarded.json); `tests/spatial-task-event-planning.test.js` replays the same 200 ticks against the distributed WASM and asserts exact state equality and fewer route requests. The busiest worker still made about 162 candidate requests per simulated minute. This remains a transitional guard, not the requested one-native-plan-per-action architecture.

The assignment path now hands the selected worker the route produced by the eligibility check, including the chosen watering/repair service point. A same-version QA switch retains the former "check, reserve, then rebuild" behavior. In the frozen 20-second Gran Cañón trace, the legacy switch rebuilt six assigned interaction routes, while the handoff rebuilt zero; both had 151 full route calls and the **same final serialized hash** (`c9ad93d4…`). Single-run tick times were 111.8 and 95.9 ms, respectively; this is evidence of redundant work removed, not a stable campaign speedup. The raw paired traces are [`ticks-watering-gran-canon-saheliana-detour-10-a-legacy.json`](ticks-watering-gran-canon-saheliana-detour-10-a-legacy.json) and [`ticks-watering-gran-canon-saheliana-detour-10-a.json`](ticks-watering-gran-canon-saheliana-detour-10-a.json). The native planner must eventually produce and retain this whole assignment transaction itself.

In a 30-second Manglares raid state, the prior polling trace made 6,909 failed movement-route attempts and 210 target selections. The transitional wait made 101 attempts and 28 selections; 32 full `routeActor` calls were unchanged. This trace has a different end-state hash because waiting animals reconsider targets later. Its route-only CPU time was within run-to-run noise. The old observer recorded 300 entries into `reserveAvailableTasks`, even though raid mode immediately returned; they were **not** 300 task searches. Thus these results establish a large reduction in redundant planning attempts, not action-policy parity or a complete performance win. The pre-change trace is retained in [`ticks-manglares-123-d10-raid-state-abccba.json`](ticks-manglares-123-d10-raid-state-abccba.json).

A continuous Sabana/seed 712/good campaign on source `71e1c95658abf4ab6b52889c0ca740c051305d57` completed 14 nights in 399.3 wall seconds; the complete report is [`campaign-sabana-14.json`](campaign-sabana-14.json). Summing its 14 day bands gives 151.0 seconds in `Game.tick` and 196.4 seconds in virtual-player decisions. Decision time rose to about 52.7 seconds on day 12 and 52.2 seconds on day 14. This run predates the isolated native entity-index prototype and does not compare an activated native action planner. It shows sustained campaign progress but also a distinct virtual-player decision bottleneck; it is not evidence of a viable 100-night runtime or of gameplay balance.

The 14-night Sabana campaign was repeated with the per-candidate wait guard on source `7eb88542` using the same seed and virtual-player policy. It completed in 401.8 wall seconds, including 151.8 seconds of `Game.tick` and 198.4 seconds of virtual-player decisions. Its per-day result rows match the earlier run **except for measured wall times**; the day-14 money and live-crop count remain 958 and 110. The full report is [`campaign-sabana-14-candidate-wait.json`](campaign-sabana-14-candidate-wait.json). This establishes no sustained speedup: the 200-tick Gran Cañón gain addresses a localized repeated-candidate workload, while this Sabana run is dominated by other worker/navigation and virtual-player decision costs. It would be wrong to extrapolate the short trace to a 100-night campaign.

## Frozen measurements

Run `SPATIAL_WASM_OUTPUT=.cache/native-route-prototype.wasm bash tools/build-spatial-savanna-wasm.sh` with Emscripten activated, then:

```
WILD_ENGINE_NATIVE_ROUTE_WASM=.cache/native-route-prototype.wasm node --test tests/spatial-native-world-route-prototype.test.js
node tools/experiments/benchmark-native-world-route.mjs
node tools/experiments/benchmark-native-route-ticks.mjs tests/fixtures/desierto983-d15-partial-state.json.gz 2
node tools/experiments/benchmark-native-route-ticks.mjs tests/fixtures/manglares-123-d10-raid-state.json.gz 30
```

The first benchmark alternates A/B/C/D over four rounds, 48 exact queries per fixture and worker/facóquero profile. A is the current JS fractional planner, B native without cache, C native with cache, D native batched. Median warm milliseconds per 48 queries:

| Frozen state | Profile | A | B | C | D |
| --- | --- | ---: | ---: | ---: | ---: |
| Gran Cañón d6 | Worker | 2.029 | 2.150 | 0.780 | 0.790 |
| Sabana d14 | Worker | 2.136 | 1.547 | 0.873 | 0.784 |
| Manglares d10 | Worker | 5.493 | 5.470 | 0.698 | 0.662 |
| Desierto d15 | Worker | 1.236 | 1.087 | 0.426 | 0.376 |
| Manglares d10 | Warthog | 3.263 | 3.261 | 0.692 | 0.720 |

The remaining profile results, first-pass timings, source hashes and setup costs are in [`initial-ab.json`](initial-ab.json). All 384 frozen query/profile comparisons had identical status, reason and route points within `1e-4`; the bounded-cache and batch outputs were also checked against fresh JS routes. The candidate WASM was 259,231 bytes versus 247,815 bytes distributed (+11,416 bytes). This microbenchmark intentionally repeats exact queries, favoring caches.

Paired real `Game.tick` results with independent state/session per arm (milliseconds, two runs per arm):

| State and duration | A current | B native uncached | C native cached | Native hits | Hashes |
| --- | --- | --- | --- | ---: | --- |
| Desierto d15, 2 ticks, 866 route calls | 1057.9 / 1008.8 | 1040.3 / 1065.2 | 1011.6 / 1076.8 | 0 | Identical |
| Manglares d10, 30 ticks, 32 route calls | 5055.5 / 4623.4 | 4855.6 / 4671.8 | 5075.1 / 5322.7 | 0 | Identical |
| Sabana d14, 2 ticks, 13 route calls | 30.5 / 13.3 | 19.0 / 18.3 | 13.8 / 14.2 | 0 | Identical |

These are smoke benchmarks, not campaign evidence. The 81-chunk setup and total tick costs vary, and Gran Cañón's sampled ticks make no route calls. The native cache gets **zero hits** in these actual ticks because origins move or the queried pairs change. It therefore does not establish an improvement to total simulation time. `Game.tick` includes all game work, while the query table isolates route work; neither table alone proves a 100-night gain. The original JS cache remains active in A where its ordinary path uses it.

## Correction and ownership

The tests exercise fractional routes, worker gates and animal profiles; a local barrier add/remove; sector unload/reload; and a portal-only revision. After each topology mutation, cached native answers are compared with a fresh JS route. The test also demonstrates that unknown is not stored as blocked. The **route-only** per-tick AB/BA runs produced equal serialized hashes after preserving the exact final JS endpoint. The later scheduling experiment changes when unresolved raid animals reconsider targets, so those earlier hash comparisons do not establish parity for the new guard. Physical movement still belongs to the existing JS motor and was not replaced.

Current JS ownership relevant to the requested action planner:

| JS area | Current responsibility | Migration requirement |
| --- | --- | --- |
| `spatial-local-route.js` | Fractional connectors and path assembly | Candidate implemented in C++; JS still rebuilds point objects. |
| `spatial-world.js` | Crossing JS↔WASM, gate projection | Candidate moves connector choice and crossing reconstruction native. |
| `spatial-navigation-movement.js` | `workerPath`, blocked-route proof, unknown handling, dynamic gate leaf | Route proof can move native; dynamic leaf and behavior remain until equivalent native state exists. |
| `watering-route-cache.js`, `work-points.js` | Watering service points, priority and copied routes | Cannot remove before porting work-point policies and active movement format. |
| `tasks.js` | Global task order, eligible workers, nearest/ID tie-break, reservations | Must migrate as a **batch over all pending tasks and workers**, not one independent call per worker. |
| `raids.js` | Region/group priority, shields, wall nomination, approach choices, unknown budget | Requires synchronized target groups, enclosure and dynamic reservation state. |
| `raid-target-reservations.js` | Per-target and physically spaced approach reservations | Needs transactional native commit/release in animal iteration order. |
| `actor-motion.js`, game movement | Dynamic collision and timed continuous motion | Stay JS until a single native movement authority passes equivalent physics tests. |

The detailed intention/ownership contract is in [`action-planner-contract.md`](action-planner-contract.md). The new user requirement changes the objective from a route cache refactor to policy-preserving native action planning. The current measurements advise **against activating or merging the route-only cache**; they do not decide whether a full intent planner can save the repeated JS↔WASM work inside target selection.

## Open acceptance work

The native prototype does not yet select **real** task service points or raid targets, own reservations, return stable route handles, synchronize living entities incrementally, or move actors. No campaign, stress test, native Windows package, browser mobile profile or complete parity suite has been run for an action planner. PR #43's JS-residency and preview fixes must be reconciled independently; this branch does not silently incorporate them. The recommended next experimental milestone is a differential native batch for the **entire real task queue** including watering and repair geometry, followed by raid target groups and physical playback. Only after that has reproducible full-tick benefits should redundant JS caches and selectors be removed.

The explicit prototype test passed 3/3 with `WILD_ENGINE_NATIVE_ROUTE_WASM` pointing to the candidate binary. After the scheduling experiment and incremental-search fix, `npm run test:playable` passed 187/187 and `npm run build` passed. The targeted fractional-return and night-25 reload tests passed 16/16. These checks do **not** validate a native action planner because it is not wired into production. The prototype test is skipped in normal CI until the candidate WASM is built and selected explicitly; the QA commands above run it without skipping.
