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

## Gate work and historical entities

The frozen day-12 snapshot contains 1,282 crop records, of which 118 are
alive, and 1,150 delivered crates. A diagnostic-only variant dropped the dead
crops and delivered crates before creating the native projection. After 30
simulated seconds the active-state SHA-256 was identical
(`50de2cd1f6e566e57c29f2297a20abd09b6c43abfb56549137a79375e5b94d6e`).
In separate-process A/B/B/A runs, the tick totals were 364.7/393.9/357.1/381.2
ms, respectively (A = intact history, B = pruned). This sample does not show
a consistent tick improvement from pruning; it does show unnecessary saved
history. Do not infer that historical records are the main cause of slow ticks
from their count alone.

A CPU profile of the same frozen state over 120 simulated seconds instead
identified repeated gate-swing calculations in `gateTriggerRadius()` and
`advanceGateLeaves()`. Each gate's 24-point sweep was already cached, yet
every worker/gate proximity query remapped all 24 vertices and computed their
distances. The trigger radius is now cached with the sweep and reused once per
gate per leaf update. Position, orientation, scale and material changes retain
the existing geometry key, so they recompute the polygon and radius together.

Using `tools/experiments/profile-frozen-native-tick.mjs` on
`tests/fixtures/sabana712-day12-worker-connector.json.gz`, four unprofiled
120-second runs produced 979.1/978.2 ms with the change, 1,172.5/1,166.5 ms
with the original code, and 983.6/973.6 ms after restoring the change. The
median of the two original runs is 1,169.5 ms versus 978.3 ms for the four
changed runs, about 16% less `Game.tick` time **for this gate-heavy frozen
window**. All six runs ended with the same active-state SHA-256
(`84018e72787d6b47838e25872c4cfdf8c9cfaf2a6e96376cc8697afbb497b77b`).
This is neither a whole-campaign speedup nor evidence that historical arrays
can remain indefinitely. The new geometry regression checks cache refresh
after placement, yaw, scale and material changes; worker gate and closure
tests also pass.

A subsequent real V1-pressure Sabana/712 campaign completed 14 nights with
verified physical raid evidence and zero observer issues. Comparing its first
12 days with the prior route-connector-fixed run, **every daily serialized
state hash and cumulative native task-route count matched**. On that identical
trajectory, cumulative `Game.tick` time was 123.4 s before the gate change and
108.5 s after it (12.1% lower). This is evidence of sustained benefit through
day 12 on one machine and campaign; it does not establish the same gain for
other biomes or a 100-night run. Days 13–14 of the new run took 22.2 and 17.3 s
respectively, finishing with 115 living crops, 868 coins and no terminal result.
The full new report is archived as
[`diagnostic-gate-radius-sabana712-14.json.gz`](diagnostic-gate-radius-sabana712-14.json.gz).

A second historical-entity check used the frozen Sabana/712 day-15 state at
time 150 ([fixture](../../../tests/fixtures/sabana712-day15-worker-routes.json.gz)),
with 1,646 plant records, 1,453 crates and 24 workers. Two
separate-process 120-second continuations, intact versus pruning dead plants
and delivered crates before session creation, ended with the same active-state
hash (`42ec582c962fa6614c825a1cc96dc50ced8648ac42c6d1bf708d5bf7f2b21b67`)
and 212 native task-route queries. Their `Game.tick` sums were 2,981.2 and
2,979.2 ms. This again fails to support retired records as the cause of slow
ticks in the tested window. Eight one-second ticks exceeded 100 ms and
accounted for 68.5% of its tick time; the largest was 634.8 ms. The native
task-route counter increased by eight during that tick, but this correlation
does not isolate the expensive native function. Reproduce both arms with
`node tools/experiments/profile-frozen-native-tick.mjs
tests/fixtures/sabana712-day15-worker-routes.json.gz 120` and the same command
with `--prune-history`. The raw timing captures remain local; no balance or
physical rule was changed.

## VFX check

The native campaign runner does not create a Three.js renderer, so its `Game.tick` delays cannot be caused by GPU draw calls or scene objects. `AgricultureVfx.update()` removes expired effects, and `NativeVfx.dispose()` detaches the group and disposes its geometry and materials. A regression test creates 48 simultaneous agricultural spell effects and verifies that the manager, library, and scene return to zero instances after expiry. Each effect already uses instanced sprite and rigid geometry. Batching **across separate spells** is a distinct render optimization; it needs frame-time and draw-call measurement in the interactive client before changing shaders and effect timing.
