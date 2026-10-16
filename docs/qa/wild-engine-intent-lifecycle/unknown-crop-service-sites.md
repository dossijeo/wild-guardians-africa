# Unknown crop service sites: full-roster differential

The existing queue differential used three workers in the frozen Gran Cañón watering fixture. With all six workers and all 19 queued tasks, the old native planner disagreed with the JavaScript control on two assignments: JavaScript assigned `task-112` (water `plant-24`) to `worker-12`, while native planning left that task `unknown` and assigned the same worker to later `task-114` (water `plant-28`). The first native service-point route for `task-112` was inconclusive. Native planning stopped there, although another of the eight bounded interaction sites could be reached. `unknown` for one site did not establish `unknown` for the whole crop.

The planner now continues through the remaining bounded sites after an inconclusive route. The regression uses all six workers. The code does not change task priority, reservations, movement constraints or the `unknown`/`blocked` distinction; if no site resolves, the task remains `unknown`.

The previous WASM was downloaded from native-intent CI run `38934441241`; the candidate WASM was compiled by CI run `38935854645`. The expanded test fails against the previous binary with two differing assignments and passes against the candidate. The candidate's full native-intent CI job passed. `npm run test:playable` passed 196/196 locally. The probe preloads the same nine-by-nine chunk area around the village in both variants.

The differential probe also checks each leg of every selected native worker route against `nav.segmentClear` with the worker profile. All selected routes in both frozen states passed this physical check with the corrected WASM. This checks static clearance of the planned legs; it does not establish a complete campaign outcome.

| Frozen fixture | Previous native queries / mismatches | Candidate native queries / mismatches | ABBA native planning milliseconds, previous / candidate / candidate / previous |
| --- | ---: | ---: | --- |
| Gran Cañón watering, 6 workers, 19 tasks | 44 / 2 | 212 / 0 | 16.39 / 11.85 / 9.84 / 10.49 |
| Desierto day 15, 42 workers, 115 tasks | 14,282 / 0 | 14,902 / 0 | 155.68 / 168.98 / 148.41 / 145.94 |

These are short, process-level differential probes, not sustained-campaign timings. The extra route queries occur only when earlier service points are inconclusive; the four-run timings do not establish a broad speed gain or regression. The correction prioritizes a valid, previously missed assignment and stays in draft PR #53 for further campaign validation.

Additional daytime states were probed with the corrected WASM: Gran Cañón day one (6 workers, 29 tasks) and Sabana day two (12 workers, 32 tasks) had zero assignment discrepancies and zero invalid physical route legs. A Manglares raid snapshot at `time=510` initially appeared to have 23 discrepancies, but the game does not assign worker tasks during an active raid; invoking the JavaScript reservation helper directly there is an invalid differential. The probe now rejects raid and out-of-shift states before planning. An older Manglares day-65 snapshot could not be used because its historical prop identifiers are incompatible with the current spatial session constructor. Neither snapshot is evidence of a native assignment regression.

The [paired Gran Cañón/123 campaign](service-sites-canyon123/README.md) diverged from the first day. The corrected WASM reached day nine with more crops and cash, but lost the last center one night earlier after more valid day-ten center hits. This single-seed result is a survival caveat, not an invalid-route finding or a matched speed result.

A second [paired Sabana/712 campaign](service-sites-sabana712/README.md) also diverged from day one. The corrected WASM completed 14 nights with 14 verified raids and no observer issues. The previous WASM stopped at a technical error in the day-13 raid: one exhausted buffalo remained in retreat with no route. The divergent states do not prove that the service-site correction fixes that separate retreat condition; the failure snapshot is preserved for reproduction.
