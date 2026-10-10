# Frozen strike attribution and mathematical parameter screen

This is read-only QA on the original paired20 pilot from `e040ea6f9edf62c7924e3b32bd34b28780c39e5f`, runtime88ebf647, seed712/GrandCanyon/Saheliana. No game simulation, new campaign, parameter implementation, CI or main modification runs here. Original evidence under `docs/qa/horde-self-consistent-pilot-e040ea6f-20/` remains byte-identical.

## Reproduction and runtime fidelity

`git worktree list` identified `C:/Users/PC/.codex/worktrees/campaign-horde-proposal/wild-guardians-africa` at bd679cc8. All394 recorded source hashes match that real worktree, including the exact historical raid/target/cash logic. The read-only original native auditor there also exited0, reproducing both summaries and original false defeat/100night gates. Later main was not imported as the historical runtime.

```
python tools/audit_horde_threat_trace.py docs/qa/horde-self-consistent-pilot-e040ea6f-20 docs/qa/horde-threat-audit-e040ea6f/read-only-strike-consumers.json --frozen-root C:/Users/PC/.codex/worktrees/campaign-horde-proposal/wild-guardians-africa
python tools/horde_mathematical_screen.py --self-test
python tools/horde_mathematical_screen.py docs/qa/horde-self-consistent-pilot-e040ea6f-20 docs/qa/horde-threat-audit-e040ea6f/mathematical-screen.json
```

The first script checks the original manifest, frozen source bytes and optional actual runtime; then reconciles each actor/event with retained strike receipts and terminal physical exits. It records consumer categories and target IDs without advancing the clock. Five meaningful mathematical tests check conservation, bounds, allocation constraints and coin units. Generated JSON is a derivative, never replacement evidence.

## Where the allocated attacks actually went

| Consumer | Responsible | Neglect |
|---|---:|---:|
| Unshielded crop strikes / CropHit |177|183|
| Shielded crop strikes |76|85|
| Expired-shield misses |2|0|
| WorkerHit / WorkerIncapacitated |4 /2|10 /1|
| Total allocated and consumed |261|279|
| Unused at physical exit |0|0|
| Structures hit |0|0|
| Plants destroyed |81|86|
| Shield casts |22|25|

Every retained logical hit targets a crop; no logical-hit consumer is a centre or wall. Both arms lose plants and workers are hit, so the incursions are not purely decorative. Approximately29.1%/30.5% of all allocated strikes are absorbed by shields on crops. Frozen raids.js287-311 decrements the strike before resolving shield protection; a shielded logical hit therefore consumes budget but applies no CropHit. All other allocated strikes are reconciled, and every actor has zero remaining budget at its physical exit. Retreat did not leave unused budget in this pilot.

Frozen targetForSteps raids.js237-255 tries reachable crop groups before defensive structures. Structures become fallback targets when crops cannot be reached. That source branch plus actual crop-only hit evidence explains why a numerical structure-damage increase alone need not matter; it does not establish which historical path crossed a gate/gap. The report retains completed-hit presentation positions and late/exit poses, not original spawn positions or complete trajectories. No crossing, interior spawn, reservation-time exposure, repair cancellation cause or wall efficacy is reconstructed from terminal coordinates.

The original one-time paid enclosure has103 pieces/two gates/25 omitted slots and191 terminal living crops outside. Prior terminal gap probes are useful geometry observations, not a history of animal ingress. No paid repair occurred. Consequently defensive efficacy, maintenance survivability and lack-of-defence defeat are unidentifiable from this pilot.

## Static mathematics and units

Fixed inputs: start1500, centre800, elder30, young40; crop destruction requires two damaging hits. Initial declared strategy hires seven elders for210 and begins with native reserve forecasting. Candidate productive crop values and all legal composition caps come from the captured generated balance.js, not outdated base JSON.

For allocated strikes B, spent/contact fraction q, crop-target fraction c and shielded fraction s:

`effectiveCropHits = B*q*c*(1-s)`; fresh-crop deaths=`effectiveCropHits/2`.

The screen computes a late-stage legal allocation distribution by enumerating actual threat costs, unlocked species, budget rolls, ceil(stageScale*roll),75% minimum spending, per-species caps and actor cap. It averages uniform legal compositions per original uniform budget roll. It adds0.1 of the eligible daylight-raid expectation; a separate stress ceiling includes one entire daylight raid irrespective of its10% probability. This is arithmetic, no night advancement or RNG replay.

Late night legal maximum is63 strikes, not the loose12*8=96 bound. Its uniform-budget/composition mean is37.2454; possible daylight maximum22 adds a daily extreme of85. Aggregate fresh-crop deaths are at most42.5 in that extreme. Already-one-hit crops can suffer up to85 deaths on one day; that is a stock sensitivity, not a perpetual two-hit rule bypass.

Retained twenty-day operating margins before walls are15,810.05/16,188.30coins per day; seeds average24.53-24.55 and paid crates117.35-120.02. At these *mean unit values*, even85 entirely damaging strikes on already-injured crops leave approximately4,107coins/day in the aggressive incremental-loss stress. This rules out a simple current-cap crop-only economic pressure story under this stationary average-value approximation. It is **not** an impossibility proof for every crop mix: targeted high-value bananas can lose up to150seed+2082.6potential female harvest with multiply/+30%event. Allocation, actual completion, target selection and timing determine whether that upper opportunity value is ever lost.

For each paired scenario both arms share identical productivity inputs. `net = scaled observed paid income - scaled seed spend - unchanged paid wages - incremental destroyed crops*(replacement seed + lost realized-payout proxy) - paid responsible maintenance - amortized paid walls`. Incremental kills subtract the retained destruction baseline; this is a stress budget, not a fitted no-attack counterfactual. Foregone harvest is opportunity cost, never booked as a ledger debit. Repair estimate uses damageHP*(wallCost/wallHP) with a service/replacement penalty; native charges ceil on arrival and actual task interruption/delay remain unmodelled. Removing an intact wall refunds ceil(cost*remainingHP/maxHP); ruined/collapsing walls refund0. The model credits no repeated refund income and no phantom repair payments to neglect.

The144-row grid explores hit budgets x1/2/4/8, crop payouts x1/.75/.5/.35, structure damage x1/2/3 and seed prices x1/1.25/1.5. Conditional ranges deliberately retain uncertainty: spent fraction.7-1; responsible crop exposure.15-.35 versus neglect.65-.9; shield fractions.25-.4 versus.15-.35; harvest loss.5-1; repair service factor.5-1. None of those defensive intervals is a historical measurement. **Zero candidates satisfy responsible positive at every named endpoint and neglect negative at every endpoint.** The unconditional shortlist is also empty, because observed zero structure exposure and unknown protection cannot justify a robust contrast. Lost-harvest0/zero-contact degeneracies remain explicit. This grid filters these hypotheses; it does not prove that no better design exists.

Shield20seconds/cooldown90 starts at activation; multiply15/120 and growth30/90, simulated-time pauses freeze them. A20/90 duty cycle is neither a percentage of farm area nor a guaranteed fraction of blocked contacts. Harvest money is paid only on physical crate delivery. Delayed delivery, occupied workers, water checkpoints, collision, damage clustering, interrupted repairs, fluid boundaries and stock composition are absent from static cash averages.

## Last centre: distinguish check timing from defeat condition

User C07 requires an immediate defeat check on loss of the last centre, if applicable, before dawn/economy/victory. Its wording does not by itself establish that every loss must ignore money. Historical e040 raids.js349 and reviewed currentmain7d98 raids.js298 actually require *no operational centre AND cash<800* at raid end. Current game.js567 then applies dawnMinimum (missing centre800 +reserve30 +seed5 if no resources), before the100night victory. Thus centre collapse alone is not modelled as automatic loss under existing source. The centre collapses at126remainingHP:474damage from full600. The late legal maximum1080 concentrated structure damage could cross that threshold **if** enough attacks reach that centre; this never occurred here.

Keep two verdicts separate in the next specification: (a) observed implemented economic/reconstruction guard; (b) requested immediate-last-centre rule, if explicitly corrected/approved. Neither zero structure hits nor large cash establishes which future rule should be adopted. No runtime fix is made in this branch.

## Proposed next pilot, awaiting approval

1. Keep centre800/start1500/wages30/40 and one identical productive staffing/planting/magic policy in both arms. Preserve the accepted global activity criterion<25%; do not force identical cash, harvest schedules or free crops after expenses diverge.
2. Before selecting damage numbers, use an independently named bounded **exposure diagnostic** at existing parameters: responsible pays legal native defences/replacements and requests actual FIFO repairs; neglect omits that paid defence/maintenance only. Both retain the same shield/growth/multiply rules so the comparison does not silently become magic versus no magic.
3. Responsible must maintain verified coverage of its current planted region, accounting for river traversal, all omitted slots, automatic gates and expansion. Record natural obstacles rather than assume every nominal rectangle is closed. Do not fund illegal/free wall pieces. If a valid region cannot be defended within native purchase/reserve constraints, report failure instead of changing the policy retrospectively.
4. Record original initial entry coordinates, full planned boundary approach and bounded path/target change receipts, actual boundary crossings, reservation acquisition/release, attack consumer, damageHP, CropDestroyed species/value range, repair request/interruption/arrival/payment and delivered income timing. This adds evidence to a separately approved pilot, not reconstructs missing history here.
5. Retain paired opening5 and late-stage planted-state exposure fixtures before100night execution. Require actual paid structure hits/repair arrivals on the responsible arm and measurable unprotected loss exposure on neglect. A fixture can diagnose threat without being labelled a campaign victory. Keep all failures and original source/seed receipts.
6. Re-run only the *static* screen with measured exposure bounds and a narrower economically viable payout/seed range. Current mean-unit gains greatly exceed current crop-only damage; reducing payouts, increasing seed cost, or increasing strike allocation may help only if it leaves opening liquidity, expansion and repair reserves viable. Increasing structure damage is useful only with demonstrated structure contact and an explicit last-centre rule. Do not recommend hundreds of strikes per actor just to force a negative spreadsheet.
7. Only after a conditional feasible interval exists should root authorize a new short paired native pilot, then a multi-seed/culture100night matrix with responsible survival and negligent defeat distributions. A single seed's twenty-night results cannot estimate those probabilities. Positive stationary margins do not imply100night survival; negative margins do not imply native defeat before100.

No candidate parameters are promoted. The next actionable result is exposure measurement and last-centre semantics, not another long run of an unidentifiable damage grid.
