# Slow `Game.tick` during defensive repairs

This investigation uses the current Sabana/712 military-pressure candidate and the native-intent campaign runner. It does not change economy, damage, raids, spells, or the virtual player's spending policy.

## Cause

The existing campaign report records 50.1 s of `Game.tick` on day 14, 343.6 s on day 15, and 51.0 s on day 16. In an instrumented 16-day reproduction, two consecutive one-second ticks around day-15 time 150 each took about 110 s. The state had 24 workers, 37 active spells, and **no animals** in either tick. Phase timing placed the delay in worker task processing, including repair completion.

The frozen state immediately after the first slow tick is in [`tests/fixtures/sabana712-day15-repair-overlap.json.gz`](../../../tests/fixtures/sabana712-day15-repair-overlap.json.gz). Its ruined walls `structure-2327` and `structure-11377` have workers standing within the area that the repaired wall or its gate post would occupy. Native local occupancy probes show that neither variant can preserve every worker's physically valid position. Trying to convert other walls into gates cannot fix that overlap. The previous `planRepairAccess()` nevertheless tried many gate candidates using speculative topology previews and routes.

The repair check now asks Wild Engine for worker/center reachability in one batch and rejects a wall/gate pair immediately when both would newly occupy a required worker or center position. Repairs whose worker access is plainly preserved no longer need per-worker JS route searches or a provisional world mutation. Unresolved native results still use the existing physical-route fallback.

## Reproduction

```powershell
node tools/experiments/profile-repair-access.mjs tests/fixtures/sabana712-day15-repair-overlap.json.gz 1
node tools/experiments/profile-repair-access.mjs tests/fixtures/sabana712-day15-repair-overlap.json.gz 2
```

The first command checks `structure-2327`; the second checks `structure-11377`. On this machine the fixed check returned `blocked` in 7.1 ms and 7.8 ms respectively, with zero legacy route calls and zero speculative previews. The fixture load, about 0.55 s, is reported separately. A day-14 frozen-state A/B/B/A comparison of a legal repair measured 1,386/1,410 ms with the previous code and 9.6/10.0 ms with the batched native check. After applying that legal repair, all 24 workers still had physical routes home.

The same seed, biome, candidate, and defended bot then completed a fresh 16-night run. `Game.tick` took 15.9 s on day 15, 18.5 s on day 16, and 202.9 s across all 16 days. The older V1 run recorded 343.6 s on day 15 and 645.8 s across its first 16 days. Both runs used the same WASM SHA-256 (`0e91794a9ba549bde8d84d1b0c3ad39c8f0366b79a83213112d8ad3442aeedf6`), but different source revisions and different farm trajectories; these campaign totals demonstrate sustained playability, **not** isolated algorithmic speedup. The frozen-state measurements above isolate the repair check.

The fixed run still spent 13–23 s in `Game.tick` on days 8–16. Day 12 recorded 199,491 native worker-task route queries and 28,716 candidates, unlike adjacent days with hundreds of queries. A second frozen-state diagnosis isolated the cause: worker `worker-11648` stood at `(102, 2.15049)` beside a wall. That position and the neighboring cells `(101,2)`, `(103,2)`, and `(103,3)` were physically valid, but the route planner considered only floor/ceil connectors at x=102, all occupied by the wall. It returned `unknown` with reason 1 (no start connector) for all 87 unassigned tasks. The 8-second recovery retry and ordinary task events repeated those answers.

The native route planner now checks an adjacent 3×3 ring **only when none of the ordinary connectors is physically usable**. It still validates each connector and each route segment with the existing worker profile and static collisions. On the frozen state, the home route changed from `unknown` to `found` (83 physically valid segments), and one task-planning pass dropped from 486 route queries/87 candidates with 87 `unknown` results to one query/one candidate with one valid assignment. This is a correctness fix as well as a reduction in work; it allows a legal worker to perform an ordinary task. The compressed state is [`tests/fixtures/sabana712-day12-worker-connector.json.gz`](../../../tests/fixtures/sabana712-day12-worker-connector.json.gz).

In a new 12-night run, the serialized state hashes and cumulative native route-query counts matched the preceding run **exactly through day 11**. On day 12, when the valid connector matters, route queries fell from 199,491 to 320 and candidates from 28,716 to 239. `Game.tick` for that day measured 20.46 s versus 19.87 s. That modest time difference is the measured result; the 99.8% query reduction must not be presented as a 99.8% simulation speedup. The newly reachable worker changes the day-12 state and money, so subsequent campaign totals are not strict speed comparisons. The rebuilt WASM SHA-256 is `1dd9f4e386e8f5c03edcafc43615e23ca3a76d4417678a84f57969add74e5454`.

The older Emscripten compiler available on this host emits an otherwise unused WASI `proc_exit` import. The JS loader now supplies a throwing stub for it, while also accepting existing binaries that do not import it. The raw WASM increased from 487,913 to 632,167 bytes; its gzip size decreased from 164,949 to 162,778 bytes. The build keeps 16 MiB initial linear memory.

None of these timings validates balance or proves a 100-night victory.

## VFX check

The native campaign runner does not create a Three.js renderer, so its `Game.tick` delays cannot be caused by GPU draw calls or scene objects. `AgricultureVfx.update()` removes expired effects, and `NativeVfx.dispose()` detaches the group and disposes its geometry and materials. A regression test creates 48 simultaneous agricultural spell effects and verifies that the manager, library, and scene return to zero instances after expiry. Each effect already uses instanced sprite and rigid geometry. Batching **across separate spells** is a distinct render optimization; it needs frame-time and draw-call measurement in the interactive client before changing shaders and effect timing.
