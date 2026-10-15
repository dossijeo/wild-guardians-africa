# Native intention planner: ownership and transition contract

This specifies the required API before policy code moves. It is a design contract, **not** a claim that the APIs below are fully implemented. An isolated task prototype has an incremental native entity index, candidate watering/repair approaches and provisional assignment/commit, but it is not connected to game actions or validated against complete real task policies.

## Event-driven planning is the primary objective

The present tick loop calls `reserveAvailableTasks()` after every worker update, even when no task, idle worker, topology or sector changed. A worker with no return route also enters `walkTo()` every tick; before the experimental wait guard this attempted the same route repeatedly. Raid waiters use a timed target-selection retry. These are planning triggers, not movement updates. Moving those calls into WASM unchanged would preserve the polling problem.

Each actor has one logical planning state: `needs_plan`, `route_active`, `waiting_unknown`, `waiting_blocked`, or `action_active`. A new action, completed action, released/invalid target, changed task eligibility, changed lease, relevant topology or sector-residency event transitions to `needs_plan`. A successful native batch selects and reserves a target and returns a route together. While `route_active`, movement follows that route without reselecting or searching. `waiting_unknown` requests the missing sector work once and waits for a sector event; `waiting_blocked` waits for topology/eligibility change. A bounded, low-frequency retry handles dynamic changes without reliable events, and must never turn `unknown` into `blocked`.

The JS bridge must coalesce duplicate invalidations and queue each actor at most once per event epoch. Changes in plant growth, HP with unchanged collision, movement along a valid route and ordinary animation frames do not trigger planning. Native cache lookup happens only after an action request is justified; cache hit rate is secondary to requests per actor/action. Instrument `taskPass`, `taskCandidate`, `attackSelection`, `routeRefresh` and `routeDeferred` per actor and per simulated minute. The acceptance metric is approximately one native planning request per actor/action (every several seconds of gameplay), with documented extra requests tied to explicit invalidations. A mean alone is insufficient: report the worst actor, repeated actor/target pairs and pending-unknown cases.

## Authority

- JS simulation owns money, crops and their growth/harvest state, task creation and completion, animal attack timing/damage, worker contracts, RNG, and the order in which a tick processes units. It emits committed deltas in that same order.
- Wild Engine owns terrain, obstacles, movement profiles, sectors, regions, portals, native routes and their topology/residency generations. After a delta batch is applied it additionally owns a compact read model of live actors, eligible targets, task queue and active leases for navigation planning. This read model is derived from JS; it must never invent or settle economy or damage.
- A planning request may allocate a provisional route and lease, but only `nav_commit_plans(batchId)` can commit leases in deterministic request order after JS accepts the proposed decisions. `nav_discard_plans` must leave no gameplay-visible state. A committed target destruction or actor removal releases its lease in the same event batch. Preview sessions must use a separate namespace or a rollback transaction, never the confirmed lease table.
- Every result carries `worldSession`, `topologyRevision`, `residencyRevision` and `entityRevision`. JS rejects a result if any relevant revision changed before commitment. Save files do not contain native handles; after restore JS replays the live entity snapshot into a fresh session and replans active routes.

## Proposed compact input

`nav_apply_world_changes(records, count)` accepts a contiguous, versioned record buffer. Each record contains operation, numeric ID, object kind, profile, center/group ID, X/Z, radius, status flags, priority/created order, and optional material/geometry ID. IDs are assigned once by a session-local JS bridge; a single table maps the existing string IDs to integers and back. Removals are explicit. Entity updates increment `entityRevision`; physical changes are committed through the existing Wild Engine topology API and increment only native topology/residency revisions. The bridge must reject duplicate/out-of-order sequence numbers and report the last applied event sequence to detect missed deltas.

The native read model needs at least:

| Domain | Fields needed for decisions | Invalidation |
| --- | --- | --- |
| Worker | ID, position, radius/profile, center, status, contract, incapacity, task | Movement/status/contract changes |
| Task | ID, created order, kind, target, center, assigned/blocked status | Enqueue/complete/cancel/reserve |
| Crop | ID, position, species, alive, attack eligibility, shield/group | Plant/loss, shield or HP change |
| Wall/center | ID, geometry, collision, intact status, HP/repair eligibility, group | Build/destroy/door/repair as appropriate |
| Animal | ID, position, species/radius, status, remaining attacks, current target | Movement/attack/retreat/status |
| Lease | Owner, target ID, approach X/Z, reservation kind | Commit/release/destruction |

Topological route cache entries cannot certify dynamic occupancy. Target selection can reuse a geometric route only after checking current eligibility, shield, task priority and leases. `unknown` remains a distinct status; it cannot be cached as a permanent physical block.

## Proposed planning API

`nav_plan_actions_batch(requests, count, flags)` takes requests in the game's deterministic actor-processing order. Each request has numeric actor ID, action type (`EXECUTE_NEXT_TASK`, `ATTACK`, `RETREAT`, `RETURN_HOME`, `MOVE_TO`), optional destination/center and expected entity sequence. A single call resolves eligible target groups, valid interaction positions and route inside WASM. A result row holds `found/blocked/unknown`, cause, target ID, approach ID and coordinates, lease token, route handle, route point count and revisions. The route buffer remains in native memory. JS reads waypoints only when the existing movement implementation requires them; debug/UI may copy them explicitly.

`EXECUTE_NEXT_TASK` must process the **global queue** in ascending `(created, task.id)` order. For each task it tries eligible workers of its center in `(distance to target, worker.id)` order until a valid service route is found. A missing target is skipped; an unresolved route marks the task pending rather than blocked. Committing assigns the worker and removes it from the pool before the next task. An independent worker-by-worker planner would change the result and is prohibited.

`ATTACK` must retain the current crop-group value order, region accessibility/unknown handling, within-region crop distance order, wall nomination rules and structure-group order. It tests target and approach reservations against all earlier committed/provisional results in the batch. Centers may have multiple attackers if approach positions are physically separate; crops and wall pieces have individual leases. A blocked enclosed crop may nominate a reachable wall, while an unknown enclosure cannot be presumed blocked. Discrete route and local physical checks use native profiles. The RNG remains in JS unless the entire deterministic sequence and saved state can be preserved.

`RETREAT`, `RETURN_HOME` and `MOVE_TO` must preserve the current exit, gate, service-point and dynamic-unit rules. The native planner selects a route; the JS movement engine continues to apply continuous position, speed, animation and collision until a separately measured native movement replacement proves equivalence.

## Route handles and invalidation

A handle is `(session, slot, generation)`, never a raw pointer. A slot stores a contiguous route, profile, physical endpoint, relevant topology/residency generations and an actor lease count. A route in active use cannot be evicted. On a topology event, only entries whose dependency sectors or portals intersect the change may remain valid; otherwise invalidate conservatively. Sector unload always invalidates dependent routes. Portal-only commits change their native epoch even when no sector is rebuilt. A construction preview uses an isolated namespace, so confirmed cache entries cannot answer preview queries and preview entries cannot survive discard. Dynamic-unit collisions are rechecked during movement rather than used as permanent route-cache keys.

`nav_step_actors_batch` is conditional. It is allowed only if one authoritative implementation reproduces current continuous movement, timed attacks/tasks, moving door leaves, unit collisions, stuck recovery, speed and save/load determinism. Until then JS movement consumes native route handles via a bounded waypoint read API. Running native and JS movement concurrently would create two authorities and is forbidden.

## Differential migration gates

1. Replay JS task queue and attack selection as an observer, feeding the same committed changes to a native shadow read model. Assert entity sequence and snapshot digest at every tick; report first divergence.
2. Port one complete policy at a time, beginning with global task assignment, then raid target/reservation selection. Compare target IDs, approach positions, statuses, lease order, RNG and resulting state against JS on frozen scenes and save/reload.
3. Test closed/open/nested enclosures, all animal radii, multiple independent center approaches, shield occupancy, worker gate routes, missing sectors, preview/discard, target destruction and route eviction.
4. Only switch a policy's production entry point after full physical replay and sustained `Game.tick` improvement. Remove the corresponding JS cache/selector in the same switch, retaining one authority. Keep a diagnostic comparison build, not two active production planners.

The isolated `spatial-intent-state.cpp` prototype accepts ordered 10-double change records for worker, target and task IDs. It plans the global task queue in one call, including candidate watering and repair interaction points, and supports proposal discard or revision-checked commit. Its leases are internal to the prototype; JS gameplay does not consume them. The record schema, geometry metadata and candidate order are narrower than the contract above and have not passed full policy differential testing. An event guard now prevents repeated failed movement-route searches until topology/residency changes or an eight-second recovery deadline; raid waiters also wake on sector revision, and task assignment is likewise event-gated. This is still not the native event-driven action planner: actual task and attack selection remain JS. Zero native cache hits in sampled real ticks demonstrate why action-level requests matter more than cache hits.

The prototype's record layout is `[operation, entityKind, numericId, centerOrTargetKind, x, z, eligibleOrAssigned, targetId, createdOrYaw, rankOrShape]`. A target kind of 1/2 is ordinary/banana crop, 3 is wall and 4 is work center; a task stores action kind 0/1/2 (direct/water/repair) in `x`. This overloaded layout is for isolated QA only. The eight-double result row holds task ID, worker ID, status, route offset/count, cause and chosen approach X/Z. Before production use, replace it with a typed, versioned ABI that encodes task/target kinds explicitly and rejects stale session IDs. The current prototype rejects mismatched task and target geometry rather than reporting it as a physical blockage.

`spatial-intent-bridge.js` now proves a load-time replay and explicit event-delta feed from a real game state. `createEventDrivenTaskPlanner` gates the whole native task-queue request: after a successful plan it does nothing on ordinary ticks; an entity/task delta wakes it, while an unresolved or blocked plan permits one retry after eight simulated seconds. The caller supplies monotonic simulation time. In the experimental intent-lifecycle branch, `perWorkerPerMinute` counts actual native candidate evaluations for each worker; it does not infer a request from mere eligibility. This gate remains QA-only. Wiring it to production requires a complete committed-event inventory, action lifecycle transitions, target/lease invalidation, and differential tests through actual worker movement. The native animal policy and reservation flow are still outstanding, so this does not yet satisfy the one-plan-per-action objective across both unit classes.
