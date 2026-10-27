# Wild Engine: blocked worker route retries

Baseline: `origin/main` at `b00a2cdf1894d0b7b158f3154587911f93fb08c9`.
Input: Manglares seed 123, day 10 raid snapshot, SHA-256
`8bcc3d672cd8029fec13c4b009b0c2230b843e61ccfa51f98d2a7bdbe94d0494`.
The snapshot is in the evolutionary-balance laboratory at
`docs/qa/evolutionary-balance/management-search/profile-manglares-123-day10/evolved-manglares-123-day10-raid.json`.
The laboratory commit `7f358aad` has the same `game.js` and native movement
adapter as this baseline.

The original 50-tick radius-4 profile found 11,500 `workerPath` calls (2.73 s),
9 `path` calls (3.57 s), and no `approachPath` calls. All 23 active workers are
fleeing with a null path to the same village. `Game.tick(state, 1, nav)` advances
ten substeps, and `walkTo` retries a null path every substep. Instrumenting the
first native tick found 230 worker calls, all `blocked`, plus 9 distinct `found`
routes for the cold animal path workload. No dynamic unit occupancy is involved
in `routeActor`; moving gate leaves are checked during movement.

The prototype retains only exact native `blocked` worker results. Its bounded
proof set expires on any physical topology change or native chunk add/remove.
`unknown` results are never retained. Generic `path` remains uncached because
building previews route through temporary barriers. The route geometry,
collision tests, movement rules, and saved state are unchanged.

Reproduce with `node tools/experiments/benchmark-native-worker-null-path.mjs
<snapshot.json> 10`. The [AB/BA report](benchmark-abba.json) uses four fresh
native sessions and compares the original planner (cache disabled) with the
candidate, with 81 resident chunks in each run. It verifies identical serialized
state hashes after ten ticks.

| Measure | A1 | B1 | B2 | A2 |
| --- | ---: | ---: | ---: | ---: |
| Native blocked worker routes | 2,300 | 23 | 23 | 2,300 |
| `workerPath` time, ms | 548 | 12 | 11 | 553 |
| Ticks 2–10, ms | 728 | 219 | 237 | 702 |
| First tick, ms | 3,856 | 3,808 | 3,778 | 3,709 |

The first tick remains dominated by the 9 cold `path` calls. This experiment
does not establish a safe optimization for those routes. Whole-frame rendering,
mobile GPU behavior, and campaign economy were outside this benchmark.

Validation: 20 focused native navigation/raid tests passed. The CI `Validate
game` checks passed locally: asset, web asset, audio, plan, balance and browser
syntax verification; 186 playable tests; Vite build; web package verification;
and itch ZIP creation with CRC verification. The full historical `npm test`
suite reported 4,286 passing and 46 failing assertions out of 4,332. The
workflow deliberately uses the playable subset while historical assertions
are migrated; this experiment did not attribute those 46 failures.
