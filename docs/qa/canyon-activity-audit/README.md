# Gran Cañón activity diagnosis

Status: bounded navigation correction validated in the feature branch. No balance, seed, strategy, renderer or animal-routing change.

The complete 100-night victories remain archived in `docs/qa/campaign-ci/responsible-100-gran-canon-mapungubwe-37866149134` and `responsible-100-gran-canon-saheliana-37868559202`. Victory does not satisfy the separately required activity metric: Mapungubwe has 42.3767% unoccupied daylight; Saheliana has 48.3833%, against strictly less than 25%.

Mapungubwe's recorded idle reasons are budget 8,743 s, space 1,976 s and shift-end 1,994 s. Saheliana's are budget 12,309 s, space 254 s and shift-end 1,952 s. Salary costs consume 34.3% and 32.1% of harvest income respectively. The completed campaigns prove physical crate deliveries, not synthetic instantaneous harvests.

## Bounded reproduction

Three independent one-day native runs at source `fc275f312bbdcd8a6577464f89157db507391b28` used the original seed 712, mixed species, olderFemale strategy, six initially hired workers and unchanged policy defaults. The observer only reads state; it does not query navigation or issue extra commands. Day-one counts exactly reproduce the two archived campaigns.

| Case | First delivered crate (simulated seconds) | Delivered crates | Budget idle | Walking distance summed over workers | Walking observations with no movement |
|---|---:|---:|---:|---:|---:|
| Canyon / Mapungubwe | 193 | 26 | 190 s | 1,266.43 m | 8 / 959 |
| Canyon / Saheliana | 269 | 11 | 229 s | 1,642.99 m | 8 / 1,267 |
| Savanna / Mapungubwe | 175 | 36 | 169 s | 926.29 m | 22 / 686 |

Distance is sampled between successive `onTick` observations for workers currently walking; it is not a complete all-status odometer. Recorded route-length/direct-distance averages are 1.084, 1.571 and 1.047, respectively; they describe planned route samples, not a shortest-path proof. Inter-worker blocking is not widespread in these first-day cases.

## Exact route requiring investigation

Canyon / Saheliana at time 180: watering route from `(-15.10406224583656, 53.49417272598826)` to `(-13.37303336523354, 59.320231353738734)` is 39.0426 m, versus a 6.0778 m straight-line distance. Another initial-watering route at time 47 is 37.6151 m versus 6.8045 m.

The intact center is at `(-20.109218197310216, 59.05401533842087)` with an authored east edge approximately x=-13.94747. Native A* uses a one-meter grid and currently introduces fractional portals only for wall gates. A plausible cause is a continuous narrow corridor between the building and canyon slope which has no integer grid column. **This is a hypothesis, not yet established:** the short diagonal can also intersect the center legitimately.

The hypothesis was subsequently confirmed with the original checkpoint and full native collision checks: both swept segments through `(-14, 54.4)` pass with worker radius 0.28, and total distance is 6.3881 m. `physical-corridor-before.json` preserves the original 39.0320 m route and the independent successful connector. The test fixture preserves the complete original state, not a modified terrain double.

## Correction

`building-route-shortcut.js` supplements an already computed worker route with fractional corner candidates derived from authored center/house polygons. It only runs for detours greater than 1.5 times direct distance and greater than two additional meters. Candidates use outward corner directions, are ranked by their two-segment length, and must pass native `walkable` and both swept `segmentClear` checks with unchanged radius, slope, props and fluid rules. It checks at most 48 candidates. Animal routing is unchanged.

This uses the existing navigation geometry and collision engine, without a finer global grid or a second pathfinding graph. It runs when a route is computed, not every worker frame. A WeakMap retains only authored polygon directions; transitability is always rechecked and existing navigation epochs invalidate route/collision caches normally. No new persistent save data is introduced.

The exact regression now returns a valid **6.2487 m** route. Five authored center cultures at three rotations, a subsequently placed blocking wall, worker avoidance views, physical doors, native fluid restrictions and existing route-cache regressions pass.

## Measured effects and limits

`before/` and `after/` preserve independent full observer reports and the navigation source SHA-256. Rerunning the identical one-day strategy gives:

| Case | First delivery before → after | Deliveries | Planted | Budget idle |
|---|---:|---:|---:|---:|
| Canyon / Saheliana | 269 → 234 s | 11 → 17 | 51 → 73 | 229 → 207 s |
| Canyon / Mapungubwe | 193 → 193 s | 26 → 26 | 90 → 90 | 190 → 190 s |
| Savanna / Mapungubwe | 175 → 175 s | 36 → 36 | 111 → 111 | 169 → 169 s |

The correction improves a demonstrated physical logistics defect. It does **not** establish activity below 25% for either full campaign, and it does not resolve Mapungubwe's independent capacity/budget limits.

`route-benchmark.json` preserves bounded CPU ABBA measurements: each fresh native navigator receives 10 warmup and 64 measured near-identical route queries. Baseline A* + smoothing p95 is 2.308 / 1.417 ms; the same pipeline with the shortcut is 3.352 / 2.263 ms. The extra helper's p95 is 0.614 / 0.310 ms. Cold full queries vary from 21.8 to 52.7 ms baseline and 31.9 to 41.2 ms candidate. These results show a small CPU cost for physically much shorter routes, **not** a CPU speedup or a frametime-stability improvement. Whole-game GPU/rendering is outside scope. Bounded native risk-cache sizes grow from 591 to 744 entries in this stress fixture; walkability-cache size remains 356.

Validation: 150 directed tests across 15 test files pass (22.659 s). Production Vite build passes; ordinary large-bundle advisory remains. Reproduce with `node --test tests/building-route-shortcut.test.js`, `node tools/benchmark_building_routes.mjs OUTPUT.json`, and `node tools/diagnose_canyon_opening.mjs OUTPUT_DIRECTORY`.

The raid fractional-exit experiment is separate: it only handles exhausted animal routes, while these worker routes already exist but take excessive detours.

No 100-night replay, GPU measurement, renderer change or activity acceptance is claimed by this investigation.
