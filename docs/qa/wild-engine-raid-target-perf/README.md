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
A complete 14-night Sabana/712 `good` campaign finished in 324.7 seconds on
this branch, with 14 completed nights, 135 living plants and 730 coins. A
same-commit `main` control is being run separately. Do not treat this as an
exact paired speedup until the control finishes; the older 388.7-second
campaign came from a different revision.

The selected 80 navigation/raid tests pass, covering gates, local breaches,
reconstruction, reservations, contention and save/reload. The new focused
tests also verify that unknown connectivity is not treated as blocked and that
a sector revision refreshes shared decisions. `npm run build` and
`npm run verify:balance` pass.
