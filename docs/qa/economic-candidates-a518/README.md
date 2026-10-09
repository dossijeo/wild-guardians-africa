# Isolated real-parameter candidates on a5184191

This branch starts at main `a51841917f0bff6b73a5dbfe81aac1057b98d03d`. Earlier archives and rejected candidates remain unchanged. No loading/UI/library source is modified.

The root's Canyon/Sahelian ten-night native baseline survives but records 77.5333% inactivity: 2,127 budget-idle seconds (1,731 maintenance reserve, 396 current-team next-day wages) plus 199 shift-end seconds. The original complete state and hashes are retained under `docs/qa/canyon-budget-f5e796c2/`.

`tools/run_economy_candidate.mjs` executes at most ten nights with the identical responsible policy and seed712. It records the native report/full state/physical ledger audit/summary and the same read-only scalar budget attribution. The first baseline invocation must exactly match the archived complete baseline state; parameters are then changed only through separate immutable canonical/generated runtime commits. Initial1500, wages30/40, policy maintenance100, growth/watering/FIFO/service/damage/seed/geography stay fixed unless a later explicitly documented experiment changes a real game parameter. No reserve or activity assertion is weakened.

Initial hypotheses: A increases every harvest by `ceil(value×1.25)` while preserving seed costs; B lowers every seed price by `ceil(cost×0.75)` while preserving harvest values. A is a current-routing control for the previously rejected revenue-only candidate, not an assumed solution. B changes working capital without raising attraction through harvest value. Neither can be promoted from a short pilot, and neither is claimed to solve late physical turnover. Long campaigns and all30 responsible combinations remain required, together with ordinary poor-management defeat and current-source regression checks.

No GPU benchmark is used to approve domain economics. Every result, including failures and activity above25%, remains recorded. Runs and source provenance are kept separate; there is no reroll or hidden strategy adjustment.

## Retained short pilots and independent gates

The baseline observer reproduced the complete original state byte for byte, SHA `c6fd00eff33940158e69aa72f3719c674974248099e5c04024a2ca53b69d3f31`. Every parameter candidate has a distinct immutable runtime source; generated balance checks passed before execution. All are Canyon/Sahelian/seed712/ten nights with the same responsible strategy. Initial1,500 and wages30/40 remain unchanged.

| Pilot | Source | Inactivity over ten nights | Ending coins | Maintenance idle | Current-team wage idle | Daily physical delivery gate |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Baseline | 8541cbf0 | 77.5333% | 804 | 1,731 | 396 | Pass |
| A: harvest+25%, original seeds | c33fff11 | 74.6667% | 1,167 | 1,388 | 621 | Pass |
| B: seed cost75%, original harvest | 8561f788 | 76.2000% | 633 | 1,635 | 446 | **Fail: day1 zero delivered** |
| C: A+B | cb7f4ebb | 69.0667% | 1,240 | 1,520 | 357 | **Fail: day1 zero delivered** |
| D: harvest+25%, seed cost50% | e36f9152 | 63.9000% | 1,276 | 1,280 | 439 | **Fail: day1 zero delivered** |

B additionally records six growing-team idle seconds; A has eight growing-team and27 minimum-reserve seconds. The original100 maintenance reserve is retained, not discounted. Seed prices are rounded upward to whole coins; none becomes free.

`tools/analyse_economic_candidates.py` independently verifies each pilot's recorded hashes against its own Git source, snapshot hashes, own-source seed costs versus actual debits, integer ledger, growth/hydration before pickup, stored crate ceiling credits, and no unpaid delivery credited. The game/task runtime hashes match across all candidates: no FIFO, locomotion, geometry or strategy change accompanies the parameter candidates. Raw logs/fullstates/summary/provenance are preserved.

The initial strict independent audit found an additional gate the small observation wrapper had omitted: B/C/D have paid employees but no physical delivery on day1. Its assertion failure is preserved in `comparison-working-day-negative.log`. The comparison now records all gates explicitly and **still exits1** for these failed working days. The producer is corrected to enforce that invariant for future runs. The old source-pinned diagnostic exits0 only indicated observed completion/accounting; they must not be retrospectively described as all-gate passes. No simulation has been rerun to conceal this result.

Total day1 paid plants are73/80/59/59/71 for baseline/A/B/C/D. Therefore “more final planted crops” is not an established cause. A larger batch before the first affordable-delivery feedback may alter FIFO service, but intrajornada phases/queues must establish this rather than guessing. Missing delivery on day1 is the authoritative negative; the full recorded state is untouched.

Each row survives the requested ten nights and passes physical monetary accounting. Every ten-night activity window is above25%; that does not mathematically prove a later100-night average must fail, and none demonstrates100-night or matrix acceptance. B/C/D are nevertheless blocked by the daily-delivery invariant. C's separate ordinary poor-management matrix has three real losses (Sabana, Great River, Volcano at night8); Mangrove/Canyon/Desert survive ten nights, and those survivals remain intact. D poor-management coverage is pending. No candidate is promoted, no PR is opened and no new100-night job is launched from these pilots.

### Paired service and first-cohort observation

The read-only observer reran the retained original-price and D cases without
changing policy, seed, FIFO, actor movement or runtime service. Both complete
final states match their original archived states byte for byte. The structured
comparison is `service-pair-comparison.json`; original callback traces and all
first-eight-plant transitions are preserved in `baseline-cohort/` and
`seed-half-cohort/`. These are ten-night diagnostics, not 100-night or matrix
acceptance. Every gate remains explicit: original prices pass daily paid staff
and physical delivery but fail activity; D fails both daily delivery and activity.

Both cases hire six workers on day 1. The first eight plants are placed and
receive their initial water at identical observed times (38–47 s); their first
checkpoints also occur at identical times (108–117 s). The later service diverges:
original-price checkpoint watering is observed at 151–181 s, maturity at
178–187 s, and all eight are delivered during day 1 (217–259 s). D checkpoint
watering moves to 233–268 s, with maturity held until that water; their physical
collection and delivery occur on day 2 (29–38 s). This is a real delayed-water
and queued-harvest case, not unpaid logical harvest or missing initial watering.

The final day-1 totals are 73 vs 71 paid placements, so a larger daily total is
not the explanation. Before the first original-price delivery, 48 placed events
are observed; D reaches 72 before any income. At t100 initial work remains for
18 vs 42 plants; at t200 the original has 14 mature plants while D has zero,
11 initial and 42 water tasks. D has 27 mature/queued-harvest plants at t299,
but workers have spent all sampled actor time on initial/water/arrival phases,
with no harvest or carrying phase. Original-price sampled actor time includes
277 harvest and 19 carrying seconds. FIFO was not modified: the larger early
purchase batch precedes the same checkpoint timings and delays later water and
harvest service. This observation supports service saturation by the purchase
sequence; it does not establish a new viable price or prove a late-campaign cause.

Task ages are first-observed lower bounds. Durations are one-second left-endpoint
actor-seconds, not global elapsed seconds. Transition times are observed at native
callback cadence; no substep-perfect timestamps are asserted. The initial seed
precedes the first callback but its retained placement event is included, which
explains why observed early placements include one more than the daily counter
whose baseline is captured after the initial seed. No new parameter candidate,
policy correction or promotion is justified by these diagnostics alone.
