# Native campaign terminals at 3324d17d

All seventeen campaigns used immutable source `3324d17dd2305ea8595aea311c518cc6db2404ad`, original seed 712 and the existing responsible reinvestment strategy. This batch contains thirteen 100-night victories and four incomplete incursions. No campaign was restarted, cancelled, rerolled or locally rerun.

| Case | Run | Outcome | Unoccupied daylight |
|---|---|---|---:|
| Savanna / Musgum | 37876645055 | 100-night victory | 19.4367% accepted |
| Grand River / Musgum | 37876651200 | 100-night victory | 18.8400% accepted |
| Volcanoes / Musgum | 37876663525 | 100-night victory | 18.6767% accepted |
| Savanna / Ethiopian | 37876683606 | 100-night victory | 20.0367% accepted |
| Grand River / Ethiopian | 37876690010 | 100-night victory | 19.4667% accepted |
| Volcanoes / Ethiopian | 37876707745 | 100-night victory | 19.8600% accepted |
| Grand Canyon / Musgum | 37876657370 | 100-night victory | 45.5700% not-accepted |
| Mangroves / Musgum | 37876670889 | 100-night victory | 19.5967% accepted |
| Grand Canyon / Ethiopian | 37876700277 | 100-night victory | 42.8400% not-accepted |
| Mangroves / Ethiopian | 37876714803 | 100-night victory | 19.0933% accepted |
| Grand Canyon / Mapungubwe | 37876728540 | 100-night victory | 43.0700% not-accepted |
| Grand Canyon / Saheliana | 37876735136 | 100-night victory | 41.7067% not-accepted |
| Desert / Mapungubwe | 37876742125 | 100-night victory | 37.6533% not-accepted |
| Desert / Musgum | 37876676998 | Unfinished incursion on day 69; 68 nights completed | Not evaluated over 100 nights |
| Desert / Ethiopian | 37876722341 | Unfinished incursion on day 73; 72 nights completed | Not evaluated over 100 nights |
| Desert / Swahili | 37876754661 | Unfinished incursion on day 71; 70 nights completed | Not evaluated over 100 nights |
| Desert / Saheliana | 37876748172 | Unfinished incursion on day 100; 99 nights completed | Not evaluated over 100 nights |

The activity threshold is strictly below 25%. CI success alone does not establish that threshold; the thirteen complete snapshots independently reproduce their entire archived summaries. Eight pass activity; all four Grand Canyon campaigns and Desert/Mapungubwe fail activity despite surviving 100 nights.

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

## Grand Canyon activity attribution

`canyon-activity-attribution.json` is generated by `tools/analyse_campaign_activity.mjs` from the original, already audited reports and summaries. It retains their SHA-256 identities, five 20-night bands, staffing, physical deliveries, planted counts, cash and recorded idle reasons. It advances no simulation.

Across the four cultures, days 1-20 have 69.75-74.58% unoccupied daylight and days 21-40 have 64.00-65.95%. Budget dominates both early bands; recorded space idle is zero through day 60. Days 61-80 improve to 13.55-22.92%, then days 81-100 rise to 27.27-35.15% as space becomes the dominant reason. This supports investigating early liquidity/delivery throughput and late placement capacity separately; it does not demonstrate which physical path or economic parameter causes those limits.

Recorded operating margins are 5.30-10.07%; wages consume 33.56-34.86% of harvested income. Static break-even ratios hold spending fixed and cannot predict reinvestment, inventory, delivery timing or a changed campaign. No balance, hiring policy, seed or acceptance threshold was adjusted.

The committed failure auditor was also rerun as its actual CLI on the original Musgum artifact: exit 0, all 320 source hashes checked. `failed-auditor-cli-reproduction.txt` preserves that output. Desert/Mapungubwe subsequently completed and is preserved with its activity rejection. Desert/Saheliana subsequently failed on its original day100 incursion:99 nights completed, no final report/summary or victory/activity verdict. Its original full terminal state and responsible-job log are preserved separately, without replacement.

## Final original terminal: Desert / Saheliana

Job113646986727 ended with failure on2026-10-09T05:35:37Z. The unfinished day100 incursion retains one retreating zero-hit warthog with null path, cash343700 and resultnull. The failed-artifact CLI checks all320 frozen source hashes and complete intrinsic persistence/ledger invariants. No physical cause is inferred from this archive. All17 original runs are now terminal:13 victories (8 accepted activity,5 rejected) and4 incomplete incursions. No campaigns were restarted.
