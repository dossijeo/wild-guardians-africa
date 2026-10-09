# Isolated connected-packing candidate — not production acceptance

Runtime base: 438305b4 retry/freeze, with additive native RepairApplied receipt cherry-picked as 8911b367. No producer or campaign was run. All original failed entry payloads remain unchanged.

## Native Desert counterexample and repair hypothesis

The original boundary fallback placed bodies west of the opening centre at x95, but the first four warthogs failed all 32 native attack approaches (155 queries, 4.516 s diagnostic, incomplete remaining actors). A walkable footprint or worker delivery route is not proof of animal arrival. The original specific delivery-point test and negative evidence remain.

The old nearby linear layout used a 46.2 m nominal twelve-body span, failed to place more than six bodies, and also encountered disconnected routes. The candidate searches multiple rows around actual centre-boundary anchors, in descending native body radius. A 1.5 m search lattice does **not** set body separation: every accepted pair retains radiusA + radiusB + 1 m clearance. Five distinct radius classes use actual reachableApproach, including centreBoundaryPoint and shield rules. Connectors and retreat segments require native clearance in both directions. Earlier escape corridors cannot be obstructed by later bodies. Retreat endpoints fan through eight native directions, with no teleport or reduced footprint.

Preserved experiments:

| Evidence directory | Outcome and scope |
| --- | --- |
| desert-local-packing | Original layout attribution: at most six bodies; 34 anchors; state unchanged |
| desert-connected-first | 4.2 m lattice failed; at most nine placed |
| desert-connected-adaptive | Finer lattice reached twelve at some anchors but rhino escape failed; rejected |
| desert-connected-corridors | Incremental escape protection, old sync four-search allowance: rejected |
| desert-connected-worker-budget | Old allowance32: twelve packed,25 searches; packing only |
| desert-geometry-capped-sync | New work-unit cap: pending after256 geometry checks,zero yielded searches |
| desert-geometry-capped-worker | Twelve packed:37051 geometry checks,25 yielded searches,1315 native yields,40 approach calls |
| desert-capped-native-arrival | Twelve actual native attack approaches, reversible path segments and full-group unobstructed reversible retreats; passed, original state SHA unchanged |
| desert-capped-sync-timed | Sync geometry cap helper8.7744 ms, whole cold opening1587.4051 ms; pending, not a frame-time benchmark |

`desert-capped-native-arrival` measured chooseRaidEntry at329.8555 ms and total diagnostic2102.6601 ms, including world opening. These are single CPU observations, not GPU, frame stability, mobile or performance acceptance.

## Work-unit budget and caches

The wrapper preserves native `path()` and its prepared/query/failure caches. It bounds calls to walkable/segmentClear and native findPathSteps yields rather than guessing whether a path will use A*. Native A* yields every eight visited nodes; counting at those boundaries permits the initial up-to-seven-node work before the first yield. Geometry checks are separately capped. Allowance exhaustion throws through path(), so an interrupted search is never memoized as a proven failed path; generator finally closes its iterator, and all own/prototype method descriptors are restored. Cached and prepared routes are accepted with zero search and zero geometry allowance.

Sync defaults: four yielded searches,32 yield boundaries,256 geometry calls. Worker preparation:32 yielded searches,50000 boundaries,100000 geometry calls. All counters are descriptive work units, not timing guarantees: one native terrain sampling call may itself be expensive. Existing worker warmRaidApproaches occurs after entry preparation and is not covered by the entry allowance. Its lifecycle/total cost needs broader validation.

## Tests and open gates

Four budget tests passed: native cached/prepared reuse, interrupted A* without failedPaths poisoning, geometry exhaustion, generator cleanup and unrelated exception restoration. Native Desert preparation/receive/spawn test passed: original state untouched during preparation, twelve unchanged species/radii, one used prepared reply, exact preferred-side first draw and twelve native hit-budget draws, native arrival/retreat checks, disposal cleanup. The first version of this latter test failed due to a nonexistent fixture `strikes_range` field; corrected to production hit_budget_min/max. This was a fixture error, not a runtime rejection; both facts are retained here.

The retry/freeze commit438305b4 was independently reviewed by root with21/21 tests. New packing is a distinct runtime change and must not inherit that acceptance automatically.

Still open: native regressions in all other biomes, old preparer parity assertions affected by the explicit sync/worker split, worker-disabled cooperative progress, actual traversal/raid completion, permanent valid-farm entry failure, cold/warm frame stability, target-reservation/unused-hit observations and campaign balance. In Node fixtures without Worker, the capped synchronous search may remain pending; this is explicitly incomplete and cannot be used to approve a campaign. A future producer must use real worker transport or reviewed cooperative progress, never raise main-thread limits to manufacture a pass. No campaign, matrix, balance promotion, PR, main merge or gameplay performance claim is made.
