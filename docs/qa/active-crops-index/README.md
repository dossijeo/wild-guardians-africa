# Active crop index for the daytime growth loop

Production change based on main `c443ecc1`: a WeakMap keeps the living subset of each append-only crop history array. The first query scans history once; later planting reads only appended entries. Harvest pickup and the second animal strike mark the subset for compaction over its active entries. Save records, order, identifiers, crates, ledger, tasks and FIFO remain intact. Restored/replaced arrays get separate indexes; truncation rebuilds. Gameplay never revives dead plants or replaces individual history members in place. Editors doing either must call the explicit invalidation helper. The existing alive guard remains in the growth loop.

Scope is only the daytime growth iterable. Other consumers still receive full history. This avoids changing target lookup, attack selection, attraction, save compatibility or delivery bookkeeping as part of this optimization. A new index retains references to live plants, not cloned gameplay state, and is not serialized.

75 directed tests pass: index append/order/compaction/restoration/editor invalidation, actual domain harvest pickup before crate delivery, actual two-hit destruction, automatic harvest, lifecycle, task FIFO, raid reload across species/cultures and introductory attack quotas. Native one-day farming retains its recorded full-state regression hash. Build passes (12.39 s), with the existing large-bundle warning.

The comparison tool creates a reference module differing only in the growth-loop iterable, resolving its other imports to the same production modules. Four calibration runs precede eight counterbalanced full/active runs per historical native save. Each run ordinarily hires staff, executes five cold-route ticks, then times 100 ticks of 0.1 simulated seconds. No crop history is removed in either arm. All twelve complete serialized-state hashes match within each case, including two Sabana pickups and three Gran Río pickups. These short continuations have no crate delivery; the separate directed harvest test checks that delivery still occurs after removal from the active subset.

| Historical case | Plants in history / initially live | Full-loop median of run medians, ms | Active-loop median of run medians, ms |
| --- | --- | --- | --- |
| Sabana / Mapungubwe | 20,443 / 546 | 2.391 | 1.307 |
| Gran Río / Mapungubwe | 13,541 / 557 | 1.847 | 1.334 |
| Manglares / Saheliana | 12,201 / 215 | 0.976 | 0.353 |

Concurrent campaigns and browser work remain active. Individual p95 values are noisy and some active runs have worse tails; no consistent tail, GPU, render-frametime, mobile, RAM or FPS claim follows. This is evidence for the bounded CPU optimization, not replay of current 100-night campaigns or full visual acceptance.

`receipt.json` binds production/tool/test sources and archived reports/logs. Reproduce with `node tools/compare_active_crops.mjs OUTPUT.json SOURCE`, where SOURCE is `crop-lifecycle-eight-100`, `intensive-river-rejoin-100` or `intensive-mangrove-shield-100`. Next checks: integrated rendering/memory and native current campaigns at larger scale, without changing the saved history to obtain a faster result.

Follow-ups: the [rendered farming comparison](../active-crops-rendered/README.md) preserves per-frame drawing counters and complete state while reducing simulation CPU; it does not establish better RAF cadence. The [full local regression](../full-regression-bc1b750f/README.md) completed with 2,816/2,816 passing tests and unchanged captured runtime hashes. Neither replaces the separate intensive campaign matrix or physical mobile acceptance.
