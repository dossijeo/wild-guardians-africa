# Wild Engine: persistent intent lifecycle (experimental)

This branch starts from `main` after PRs #49 and #50. PR #51 remains a separate draft about crop-group protection notifications. This work does not merge into `main`.

## Authority audit

| Responsibility | State on `main` | Intended authority |
| --- | --- | --- |
| Worker task order and nearest eligible worker | `src/simulation/tasks.js::reserveTasks` in live gameplay; native global task batch in `spatial-intent-state.cpp` is experimental | Native global planner after differential validation |
| Native worker/target/task read model | `spatial-intent-state.cpp`, fed by `spatial-intent-bridge.js` in campaign spatial advice and tests | Wild Engine projection of confirmed JS entities |
| Worker route and movement | JS stores path arrays and walks them; native task proposals copy transient route points | Native route handle; JS retains continuous movement |
| Animal target and approach | `src/simulation/raids.js::targetFor` and `reachableApproach` | Native selection and reservation, after separate military policy parity work |
| Spatial advice for virtual player | Native services are used in `tools/native-campaign-runner.mjs` | Wild Engine spatial services |
| Crop group protection notifications | PR #51 draft; not in this branch's `main` base | Shared native event projection when integrated |

The event-gated planner in `spatial-intent-bridge.js` is exercised in tests, but live `Game.tick` still calls JavaScript `reserveTasks`. `spatial-action-planner.cpp` is a shadow comparison API, not the live planner. Therefore the implementation in this branch must not yet be reported as eliminating gameplay polling.

The existing `Game.observeGameEvents` observer supplies committed `CropDestroyed`, `CropPicked`, `WallRemoved`, `StructureRuined`, `PlacementCommitted`, `WallChainBuilt` and `RepairApplied` facts. It does **not** publish each task enqueue, assignment, release or completion. This branch adds an internal `observeTaskChanges` feed at the task mutation sites and routes task-array replacements through `replaceTasks`. The experimental planner can subscribe, queue confirmed deltas, and project them in one batch at an action boundary without a tick scan. Worker status, task and roster transitions also publish snapshots for the native read model. Idle worker positions that changed while waiting are projected only when another event requires an actual planning batch. This is still an experimental projection, not a live handoff; worker movement and task execution remain authoritative in JavaScript. Animal attack completion is delayed until the clip's damage frame in `raids.js`; tactical invalidations must be applied after that transition, not in the middle of a committed strike.

The experimental gate can also subscribe to committed game events. It queues relevant crop and structure changes, projects them at the next deterministic event boundary, and reconciles topology after confirmed wall, gate or ruin changes. A confirmed crop destruction invalidates its pinned native route in the focused test. This subscriber is not yet attached to the live `Game.tick` loop. Replanning proposals are not yet applied transactionally to live JS tasks and reservations.
The same projection tracks the physical crate created by a harvest, its position when dropped, and its removal on confirmed delivery. `CropPicked` now carries the crate ID as presentation-independent event metadata; this does not change harvest value or payment.

## Implemented first stage

- A committed native global task assignment now creates a persistent per-worker intention and pins its route in a session-scoped slot/generation handle.
- Native inverse indices map targets and tasks to affected workers. A confirmed removal or deactivation invalidates only those intentions, releases their routes, and emits a deterministic change row.
- A topology event can invalidate active route handles while retaining the original task and target. At the event boundary, a dedicated call replans those same targets from projected current worker positions. `unknown` and `blocked` remain separate states.
- Explicit action-start and finish transitions are available. Normal reads of an active intention do not invoke pathfinding.
- Session reset invalidates old handles. The bridge exposes change draining and bounded point access without reconstructing all routes on each ordinary tick.
- The bridge has an event-boundary entry point that applies confirmed entity deltas, reconciles a topology event and reroutes affected same-task intentions. Native metrics count actual candidate evaluations by actor, not every idle worker present during a batch.
- An experimental batch commit adapter now preflights each native task proposal against the current JavaScript task, worker and target facts, including positions, then checks the native revision-bound commit before publishing all JS leases. It copies route points once when an action starts. A duplicate worker, stale target or stale native proposal cannot partially assign the JS queue. Live crop lookup uses the existing `activeCrops` index, so historical destroyed plants do not enter the action-boundary scan. This adapter is not yet called by live `Game.tick`.
- The experimental event boundary can reconcile native intention changes into an already assigned JavaScript worker: a moved crate replaces the route for the same task; a pending route parks the worker while retaining its reservation; a destroyed crop or delivered crate releases the worker and removes the obsolete task. A controlled fixture exercises the moved-crate reroute without a second global task-selection pass and both target-loss releases. The live tick has not adopted this reconciliation yet.

The topology hook is currently conservative at whole-graph revision scope. Sector/portal inverse dependencies and committed-attack deferral are **not implemented**. The bridge is still experimental. No animal intention registry, native animal target selector, live-worker handoff, or automatic end-to-end event dispatch is wired into gameplay yet. A committed crop deletion makes a worker eligible for the next global planning batch, but JavaScript must still apply that batch transactionally. These are acceptance gaps, not validated features.

## Reproduce the current focused checks

With Emscripten configured, run `bash tools/build-spatial-savanna-wasm.sh`, then set `WILD_ENGINE_NATIVE_ROUTE_WASM=src/world/hierarchical-wasm/spatial-savanna.wasm` and execute:

```sh
node --test tests/spatial-native-intent-index.test.js tests/spatial-native-intent-bridge.test.js tests/spatial-native-intent-differential.test.js
```

The focused checks cover global FIFO assignment, event-driven target invalidation, unaffected worker preservation, topology route invalidation with same-task replanning, stale route handles, save-style reset, and no replan on ordinary intent reads. One real Desert watering assignment is now committed into the JavaScript worker state, serialized/restored, then moved through the continuous controller along native-static-clear segments to a valid watering point without another path request. This proves that controlled path only; it does not establish campaign equivalence, other work kinds, or sustained performance.

## Next integration gates

1. Publish confirmed task/worker/action events directly from the simulation without scanning every entity per tick. Apply native proposals atomically with JS task reservations and preserve all worker policy tie-breaks.
2. Track sector/portal dependencies so a local topology change invalidates only routes and tactical decisions that can be affected. Defer changes to attacks whose damage frame is already committed.
3. Move animal target, reservation and retreat planning to the same native authority with differential policy tests; retire the replaced JavaScript selector.
4. Verify save/load, speculative previews, sector residency, prolonged campaign determinism and physical validity. Benchmark planning calls per actor/minute, navigation time and `Game.tick` before declaring the polling removed.
