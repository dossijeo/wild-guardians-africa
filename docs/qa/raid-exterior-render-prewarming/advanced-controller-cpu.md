# Advanced controller calls and unchanged-ready overhead

This additional directed CPU observation leaves all implementation from frozen `0085d5e281edad1d8061e2ac86ca89b4d4cbe4f0` unchanged and retains its prior originals/receipt. Run details and full per-call samples are frozen under `advanced-controller-cpu/`. `python tools/audit_raid_exterior_controller_advanced.py` checks 458 sources, two raw payloads and independently recomputes counts/totals/percentiles/violations from the 941 retained calls.

The exact same historical farm gzip SHA is `1b0f1a153aaf9c7adcb91b394d232886016124316570f3e90df01bb280bb4a0b`: 103 paid wall structures, 865 living crops. The controller prepares all five canonical radii, then receives 120 calls with the same state and already-prepared geometry. No Game.tick, actor command, simulation/camera/geometry mutation, renderer, GPU or campaign runs. Initial/final serialized state SHA remains `746c086e2df46a2857adc528eca4b56ad60baff968459964f6546f6e715aa999`.

External diagnostic wrappers time the existing `geometry.update`, `geometry.pump` and controller frame calls. They record only CPU durations/primitive counters; the same iterator, ordering and implementation remain intact. Their overhead is included and they are not a zero-cost profiler. Percentiles use sorted samples at `ceil(p*n)-1`. This is one descriptive tight-loop observation without ABBA or real RAF spacing.

| Preparation, 821 calls | Total CPU ms | p50 ms | p95 ms | p99 ms | Max ms | Calls over soft2ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Controller frame | 1326.38 | 1.238 | 2.798 | 3.318 | 34.409 | 221 |
| Update | 405.98 | 0.412 | 0.871 | 1.238 | 6.043 | 1 |
| Pump | 918.12 | 0.778 | 2.058 | 2.546 | 33.939 | 171 |

Measured preparation wall duration is 1329.07ms including the fixture driver. Real work remains 89,220 iterator steps, one job, one whole-result adoption and no main graph construction. The largest native iterator step is 32.11ms at `boundary-props-scatter`, the maximum internal pump is 33.93ms. Do not compare this total to the earlier unwired prototype's 1039ms as an accepted improvement/regression: this controller performs an additional live-key update per call and diagnostic wrappers, on a single unpaired run. Both observations remain retained.

| Already prepared, 120 calls | Total CPU ms | p50 ms | p95 ms | p99 ms | Max ms | Calls over soft2ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Controller frame | 45.489 | 0.351 | 0.453 | 0.910 | 0.936 | 0 |
| Update | 45.348 | 0.350 | 0.452 | 0.909 | 0.934 | 0 |
| Pump | 0.0255 | 0.0001 | 0.0006 | 0.0020 | 0.0036 | 0 |

Those steady calls execute no new iterator steps, jobs or adoptions. They still call `RaidExteriorPrewarmer.updateInputs` and `raidExteriorInputKey` to establish freshness; almost all observed CPU is in that update path. The signature scans/project-serializes structures, villages, suppression, active shield geometry and terrain/profile/version inputs with JSON.stringify. This is not proof that JSON.stringify alone owns the whole measured update duration, because it was not separately instrumented. During preparation, pump performs its own signature/field check too. The first update additionally clones/freezes the owned request snapshot, so its peak differs from a ready-key hit.

The exact indivisible geometry path is `boundaryEdgesSteps` → `Navigation.propsAt` → `Navigation.chunk` → native `scatterWorld` for uncached procedural chunks. The generator yields before propsAt, but cannot interrupt that call. Native array sorts, final freeze/adoption and other helpers also remain indivisible; native raid-entry A* is not part of this geometry-only call sequence. No implementation was changed to hide these limits or pursue an artificial 2ms threshold.

Lead time remains unresolved. The actual source connection schedules one pump per existing render iteration; this driver did not render or space calls in time. At hypothetical 60 iterations/second, 821 pumps imply about 13.68 seconds before completion, with the same negative indivisible-step risk. That arithmetic is not measured FPS/readiness and cannot guarantee prewarming before an actual raid. Camera/group changes retain the physical geometry job; wall/structure/shield geometry, navigation revision/terrain profile or field replacement invalidate it. Repeated physical edits can consume lead time again.

Activation stays OFF. A cold deadline still invokes original synchronous fallback, without pausing/discarding/deferring the raid. Root renderer/visual measurement and deadline/fallback/resource review remain necessary; this observation closes only the missing advanced CPU and steady-update evidence, not those production gates.
