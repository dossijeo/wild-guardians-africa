# Native campaign terminals at 3324d17d

All nine campaigns used immutable source `3324d17dd2305ea8595aea311c518cc6db2404ad`, original seed 712 and the existing responsible reinvestment strategy. This batch contains six 100-night victories and three incomplete incursions. No campaign was restarted, cancelled, rerolled or locally rerun.

| Case | Run | Outcome | Unoccupied daylight |
|---|---|---|---:|
| Savanna / Musgum | 37876645055 | 100-night victory | 19.4367% accepted |
| Grand River / Musgum | 37876651200 | 100-night victory | 18.8400% accepted |
| Volcanoes / Musgum | 37876663525 | 100-night victory | 18.6767% accepted |
| Savanna / Ethiopian | 37876683606 | 100-night victory | 20.0367% accepted |
| Grand River / Ethiopian | 37876690010 | 100-night victory | 19.4667% accepted |
| Volcanoes / Ethiopian | 37876707745 | 100-night victory | 19.8600% accepted |
| Desert / Musgum | 37876676998 | Unfinished incursion on day 69; 68 nights completed | Not evaluated over 100 nights |
| Desert / Ethiopian | 37876722341 | Unfinished incursion on day 73; 72 nights completed | Not evaluated over 100 nights |
| Desert / Swahili | 37876754661 | Unfinished incursion on day 71; 70 nights completed | Not evaluated over 100 nights |

The activity threshold is strictly below 25%. CI success alone does not establish that threshold; the six complete snapshots independently reproduce their entire archived summaries and the accepted activity values above.

## Failure observations

All three terminal failure snapshots retain `time=600`, `result=null` and an unresolved raid. Their recorded money is 164,676 / 203,330 / 231,020 coins: these are not recorded economic defeats. The original runner threw after its 2400 simulated-second daily limit.

- Musgum: warthog `animal-289921` is retreating with zero hits, 71 path points and first waypoint (23, 8), at (21.04094, -2.06062). Terminal workers: 62 fleeing / 172 home.
- Ethiopian: hyena `animal-301214` is retreating with zero hits, 91 path points and first waypoint (23, -7), at (23, -7.43551). Terminal workers: 50 fleeing / 171 home.
- Swahili: lion `animal-226523` is walking with two hits, no target and no path, at (98, -17.03047). Terminal workers: 24 fleeing / 121 home.

These are observations, not a demonstrated physical root cause. Congestion, terrain, route availability and path reuse require separate bounded replay investigation. No archival finding is replaced by a future fix or rerun.

Heartbeats are wall-clock throttled and precede terminal snapshots by 373 / 2202 / 395 simulated seconds respectively. Ethiopian's heartbeat still shows daytime work at time 199; its actual terminal snapshot is at time 600. Verification preserves both clocks and worker status sets, rather than treating stale heartbeat data as terminal state.

## Verification and preserved material

Each case checks all **320 recorded source hashes** against the immutable Git commit via `git archive`. Independently retrieved GitHub run metadata agrees with artifact job identity, commit and terminal conclusion. Each complete original state, status, job/process output, responsible-job log and available report/summary is gzip archived with byte-verified decompression and original SHA-256/size receipts. No final report or summary exists for the three failure artifacts; that absence remains explicit.

`tools/audit_intensive_artifact.mjs` verifies victories, native crop/water/maturity/crate-delivery and persistence invariants, exact integer accounting, resolved raids, all 100 daily records and full summary reproduction. `tools/audit_failed_intensive_artifact.mjs` verifies the complete failure state and frozen sources without advancing simulation; failure counts are derived from the snapshot and are not independent final-report counts. The Ethiopian directory also retains the first auditor assertion failure from the corrected heartbeat-equals-terminal assumption, clearly separate from the gameplay failure.

This is domain evidence for `3324d17d`, not later-main replay, rendering/GPU QA, mobile acceptance or complete 30-case matrix acceptance. Other campaigns still running when this batch began were left untouched.
