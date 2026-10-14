# Wild Engine: raid service-point connectivity

This experiment is isolated from the evolutionary balance lab and does not change
prices, combat damage, military budgets, worker speed, or virtual-player policy.

## Frozen reproduction

The input is the day-13 Savanna/seed-712 raid snapshot in the evolutionary lab
(`docs/qa/evolutionary-balance/profile-sabana-712/evolved-sabana-712-day13-raid.json`).
Both variants execute 50 one-second `Game.tick` calls from the same saved state,
with a resident radius of one chunk. The profiler records the exact serialized
state hash after those ticks.

| Variant | Total tick ms | `approachPath` | `regionConnected` | Final state |
| --- | ---: | ---: | ---: | --- |
| Main baseline | 3,762 | 4,151 (4,128 blocked) | 125 | SHA-256 `564e1ddce43daaac19dc968db55150afc374ff1e261c8994e8d913a6e34ef355` |
| Native connectivity before route | 2,828 | 23 | 4,276 | identical |
| Shared native region decisions | 2,276 | 23 | 217 | identical |

The baseline spent nearly all failed route calls on structure service points.
Some single points were retried 299 times despite returning blocked every time.
Only 25 crop-approach attempts occurred. A native `regionConnected` result of
**blocked** now skips a detailed route to that service point. `unknown` still
performs the route search. Resolved service-region decisions are shared by
animals with the same origin/destination graph regions and movement radius,
and are refreshed on native sector revision or navigation topology change.
The existing scope bounds the decision map at 2,048 entries.

This is a conservative decision: a failed route is no longer the basis for
skipping other points; only the native graph's explicit `blocked` result is.
An accessible point still uses the usual route planner and physical movement.

The snapshot measures a specific expensive raid, not sustained campaign speed.
A paired 14-night Sabana/712 `good` campaign used the exact parent `main`
commit `143685e0` as control and this branch as candidate, with the same
runner, seed and parameters. Both completed all 14 nights. **Every daily
result field except measured wall time matches exactly**, including money,
living plants, planting, delivery, destruction and action counts. They finish
with 135 living plants and 730 coins. The 50-tick serialized snapshot hash
also matches exactly.

| Measure | Parent `main` | Candidate | Ratio |
| --- | ---: | ---: | ---: |
| Total campaign wall time | 457.4 s | 324.7 s | 1.41× |
| Accumulated `Game.tick` | 447.5 s | 315.7 s | 1.42× |
| Day 13 `Game.tick` | 53.3 s | 29.2 s | 1.83× |
| Completed nights | 14 | 14 | equal |

These are sequential wall-clock runs on a shared host, so the exact speedup
can vary with load. The large reduction in detailed native queries on the
frozen snapshot and the identical daily campaign results support the
mechanistic explanation. The older 388.7-second historical campaign is kept
as historical context only; it came from a different revision.

The paired original reports are stored as gzip JSON in this directory.

A separate frozen Gran Cañón/seed-123 day-7 replay (50 ticks) retained the
same serialized state hash and the same 33 detailed approach routes in both
versions. This scene has no repeated blocked-service-point storm, so the new
decision does not eliminate work there. First measurements were 329 ms for
`main` and 353 ms for the candidate, with only ~3 ms of selection difference;
short ABBA repeats varied widely (including a 430 ms outlier). We therefore
make no speedup claim for this sparse case and keep it as a regression control.

The selected 80 navigation/raid tests pass, covering gates, local breaches,
reconstruction, reservations, contention and save/reload. The new focused
tests also verify that unknown connectivity is not treated as blocked and that
a sector revision refreshes shared decisions. `npm run build` and
`npm run verify:balance` pass.
