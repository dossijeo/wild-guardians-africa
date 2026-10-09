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

### E: doubled harvest income, original seed prices — rejected

E changes only harvest values to exactly twice the originals. All other 376
runtime/source hashes match the original baseline, except generated balance.
Initial money, seed prices, wages, growth/checkpoints, damage, FIFO, terrain,
policy and reserves are unchanged. The native process fails with exit 1: six
nights completed, defeat on day 7, and paid staff without any delivery on day 7.
Do not label this a completed ten-night case. Both original and failed-state
snapshots are retained byteexact. Own-source integer ledger, maturity/hydration
and 279 paid physical crates pass; survival, daily deliveries and activity fail.
Reported activity is 52.5238% over seven observed rows; the first six complete
jornadas alone have 61.2778% inaction. Neither meets the strict <25% gate.
Income6710 minus seed3440 and wages3390 gives operating cashflow -120; after
centre800, cash is580. No poor-management or 100-night/matrix run is launched
because this candidate lacks a viable responsible signal.

A read-only native attack replay preserves exactly E's final fullstate. It
identifies an important coupling: `attraction()` sums crop harvest values, so
doubling income also doubles threat contribution per plant, before accounting
for additional reinvestment. Noche6 attraction8976 yields three warthogs and a
rhino. Rhino4763 spends eight hits of60 on the centre:600→120, below its126
collapse threshold; the centre becomes ruined at t439. Cash remains1600 at
that event; no repair was requested/applied because all damage occurred during
an active attack. The complete first-zero-centre snapshot and attack trace are
retained in `harvest-double-attack/`, with derived reproducible analysis.

`defend:false` disables the optional wall/capital-reserve strategy. It does not
disable Shield: the unchanged control cast Shield near a crop at(-27,63), while
the centre(-20.109,59.054) lies outside that spell's radius. Cooldown prevents a
second cast before collapse. This is evidence about the unchanged control and
its eligibility/position decisions, not a universal verdict that responsible
players cannot defend. No policy correction or threat decoupling is applied to
make E pass. Future defensive diagnostics must be labelled additional cases
and preserve this exact negative control.

### E2: independent baseline attraction — also rejected

There was no existing real attraction coefficient. This isolated candidate adds
canonical per-crop `base_attraction_value`, generated from optional revision
`crop_attraction_values`. Without the revision the default equals the previous
effective harvest value, preserving main behavior exactly. E2 uses harvest×2
and explicit original attraction for all eight species. The harness receives no
override and the save format is unchanged. Generator default-equivalence passes;
576 native night plans match the frozen legacy planner across every species and
mixtures, counts, introductory days1–5, later guaranteed groups, and magic/pause
flags. Eight-species attraction is invariant under crop growth/water/magic flags.
These are source/functional checks, not survival/activity acceptance.

The native E2 pilot also exits1: six nights completed, defeat day7, and day7
paid staff34/zero deliveries. Own-source376hashes and exact canonical parameter
comparison pass; accounting/hydration/279 physical delivered crates pass. All
survival/daily-delivery/activity gates fail, with the same cashflow, budget
attribution, actors and RNG as E. Recursive fullstate comparison finds exactly
one difference: final `nightPlan.attraction`8888→4444. Therefore the income/threat
coupling exists, but it is not a demonstrated cause of this particular defeat:
both attraction values already select the highest tier (≥2000); the first five
introductory raids also remain unchanged. The candidate fails to change effective
raid pressure here. Original negative E and E2 are both preserved; no 100-night,
matrix, poor-management or promotion follows from this failed short control.
Further balance choices require the demonstrated budget/service limits and
actual effective threat tiers, not an assumption that halving attraction halves
raid damage or that accounting PASS means a playable campaign.

### F proposal — static arithmetic only, no campaign run

Frozen E2 physical receipts repriced from harvest×2 to×3 would yield10065
instead of6710. Keeping its seed3440 and wages3390 fixed gives operating margin
+3235 and3935 cash after initial1500/centre800/recorded wages. A hypothetical
repair after eight half-damage rhino hits costs320, leaving3615 on that frozen
ledger. This is not injected money, a native replay, or a prediction of F:
reinvestment/service/RNG/attack composition can change in an actual run.

`structure_hit_damage` is already a real canonical, generated per-animal
parameter. It applies only to structures; crops separately break after two
attackHits. Proposed10/12.5/17.5/20/30 preserve exact half damage without changing
hit budgets. Native `hitStructure` on an isolated centre fixture demonstrates
that eight hits of30 leave360HP/intact,234 above collapse126; sixteen such hits
would still collapse it. Fractional half-HP values serialize exactly and do not
change integer monetary rounding. The static artifact records these checks and
all unchanged policy/gameplay parameters. No F implementation/simulation or
acceptance is claimed before reviewing this proposal.

### F native pilot — survives ten, activity remains rejected

Source83b1c1ea survives ten nights (day11/resultnull), with paid staff and
physical deliveries every day; own-source376hashes, exact parameter whitelist,
integer ledger/hydration and830 paid crates pass. Native exit0 is not release
approval: inactivity1079/3000=35.9667% fails strict<25. No100/matrix/poor-management
run follows. Income30987−seed18287−wages10590 gives operating+2110 (6.81% of
income), ending2810 after centre800. Centre600 through day8,512.5 after days9–10.
The native pilot has zero repair charges, so half-HP physical repair is proven
by the isolated fixture, not exercised by this campaign. The repairCost×2
support is exact for integer/half HP only; it is not a validation of arbitrary
fractional HP denominators or a globally approved runtime change.

Budget idle880 consists of539 maintenance,324 current-team and17 growing-team
reserve seconds; another199 come from shift end. Day3 has256 budget seconds
(252 current-team) with16 staff/46 deliveries; day6 has171 maintenance seconds
with42 staff/18 deliveries. Days8–9 budget idle is zero. These are native policy
labels and physical outcomes, not a reason to reduce the reserve or bypass FIFO.
A subsequent read-only diagnostic will preserve F's fullstate exactly and
inspect decision timing and available cash while keeping middayHiring:false.
The availability of an optional hiring action must not be conflated with a
change to this control's policy. No further parameter candidate is chosen yet.

### F unchanged-policy opportunity diagnostic

Read-only source2346fbd7 produces exactly the same complete final F state
SHA5fa1a0bebd54299c4abf45f425bc361c46fba12fc5f8c0864145b7528206920f.
Decisions3000 and separate peaceful service samples2999 are retained. Inactivity
is concentrated early: days1–3 71.1111%(640/900), days4–7 30.1667%(362/1200),
days8–10 8.5556%(77/900). Budget categories in those bands are respectively
328 maintenance+252 current-team;211 maintenance+72 current-team;17 growing-team.
The overall35.9667% gate still fails; later good windows do not replace it.

During880 budget-idle seconds, no decision had enough cash to buy the next seed
while preserving every control reserve. Native cash alone would fund one extra
worker during all880 seconds, but only26 seconds also preserve that proportional
fee, tomorrow's expanded team and maintenance reserve. Availability is sampled
separately after each tick; these are arithmetic opportunities, not proof of a
legal plot, available route, arrival before shift end or benefit from hiring.
In particular, much of the late hiring affordability is near the end of day10.
MiddayHiring:false remains unchanged; no employee or plant is added by observers.
Seed+minimum100 cash alone is insufficient to call the original full-reserve
strategy affordable and is never substituted for its existing rule.

Concrete budget rows: day1t47 cash280 versus seed5+team180+maintenance100=285;
day3t1 cash130 versus seed5+team480+maintenance100=585 after paying480 in wages;
day6t10 cash1390 versus seed5+growth-team1290+maintenance100=1395 with436 pending
tasks. Day1 first delivery remains t217. Days2–7 first observed delivery is t26,
yet later service is uneven: day3 delivers46 with16 staff, day6 delivers18 with
42 staff. Initial queues peak at163/109/329 on days2/3/6. Workers' sampled phases
remain dominated by walking/initial/water work; no idle actor phase is seen at
this cadence. Phase totals are approximate actor-seconds outside sampled attack
gaps, not global elapsed durations or substep-perfect task utilization.

This separates the early reserve/cash/service constraint from late improvement
without changing policy or claiming a new price will fix it. No additional
parameter,100-night/matrix run or promotion is chosen. The half-HP repair bridge
in frozen F evidence remains unchanged; main's separately reviewed general
rational repair implementation will be considered only if a candidate is later
promoted, with fresh compatibility coverage.

### Future audit manifest correction

The first-run evidence above is preserved unchanged. The read-only generators
previously enumerated every file in their output folder, which would include
an existing own-source-audit/opportunity-analysis/fatal-analysis file on a
second run and therefore change their own manifest hash. Future tooling now
explicitly excludes its own output from input hashes. No existing evidence,
failed verdict, source receipt or raw snapshot was regenerated for this fix.
F100 separately uses an exact detached83b1c1ea checkout and original native
runner; its source and policy are unaffected by this diagnostic tooling change.

### Terminal F100 audit protocol (not yet a verdict)

Only after the original producer is terminal, run
`node tools/audit_economy_f100_native.mjs FROZEN_CHECKOUT OUTPUT_DIR`, then
`python tools/audit_economy_f100_terminal.py OUTPUT_DIR` from this evidence branch.
The native supplement imports the producer's exact frozen83b1 audit, summary and
snapshot modules; it reconstructs the full summary, validates exact snapshot
roundtrip, checks status/report/state coherence, CampaignWon/GameOver counts and
closed RaidSpawned/RaidEnded counts. It hashes source inputs, raw payloads and
both auditor files. It never calls the simulator. The independent Python audit
retains unchanged first10 and the strict global25% gate and binds its verdict to
the native supplement's payload hashes and gates. A producer failure or missing
summary cannot become approval. This tooling has only been syntax checked while
the original100 remains live; no partial snapshot is accepted.

Final-state crate/hydration/ledger assertions demonstrate end-state consistency.
They cannot independently prove every historical worker route or FIFO ordering;
those claims require the unchanged native producer protocol, production source
and dedicated physical/FIFO tests. Any accepted result still covers only this
frozen case, excluding poor-management, matrix30 and current-main compatibility.

### Frozen F100 terminal: survival verified, activity rejected

The single authorized original native run finished without restart: session45765,
PID20428, frozen83b1c1eaa0235f9a9b34966f88b496f42eeb161b, producer exit0.
Both terminal auditors exit0 verify376 source hashes, clean source, full summary
reconstruction, exact snapshot roundtrip and unchanged first10. Native status
passed means survival/accounting/daily deliveries, not the activity gate.
The actual result is100-night victory/day101,108 raids spawned/ended, one
CampaignWon and zero GameOver. All100 days have paid staff and physical delivery.
18330 crates were delivered/paid;18650 picked,320 still unpaid in transit.
Snapshot SHA256:aa1c07343d598b5a5ea0da25465c571fe258df1069d1fc88e36fa632af44d31e.

Whole-campaign idle is7930/30000 seconds=26.433333%, strictly25% gate FAIL.
It includes all1079/3000 negative initial10 seconds unchanged. Components:
budget1674,space4257,shift-end1999. Day bands:

| Days | Budget | Space | Shift-end | Idle / daylight | Fraction | Delivered |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1–10 | 880 | 0 | 199 | 1079/3000 | 35.9667% | 830 |
| 11–30 | 794 | 0 | 400 | 1194/6000 | 19.9000% | 3396 |
| 31–60 | 0 | 1607 | 600 | 2207/9000 | 24.5222% | 5910 |
| 61–100 | 0 | 2650 | 800 | 3450/12000 | 28.7500% | 8194 |

Cashflow:1500+4138239 delivered income−781667 seeds−546660 wages−800 centre
=2810612 ending balance; repair charges0. Plots/maxLiving both2695, last centre
HP512.5. The measured bottleneck changes from initial cash reserves to late plot
availability/service. More income alone does not address that late constraint.
The domain/plot search and policy are preserved; no geography or strategy was
expanded to manufacture approval. Whether late space is harness-domain or real
world capacity still needs faithful attribution before choosing new parameters.

`f100-terminal/` retains byte-exact original status/report/state/summary under
deterministic gzip, both audit payloads, logs, root's independent partial/source
receipts, and SHA256 manifest in archive-receipt.json. No partial record replaces
the terminal result. No poor6, matrix30, candidate promotion or PR follows this
failed responsible activity gate. Main's general fractional repair compatibility
and physical/FIFO temporal coverage remain separate from this frozen snapshot.
