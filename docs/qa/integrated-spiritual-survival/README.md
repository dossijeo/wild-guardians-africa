# Integrated spiritual survival balance — experimental, not approved

Branch: `codex/integrated-spiritual-survival-balance`. Main is unchanged.
This supersedes the proposal to merge unrestricted full-strength individual
magic separately. No complete campaign may approve a partial integration.

## Current checkpoint — 11 October

The historical sections below retain their original source/QA context. Joint
integration is present on this experimental branch; it is **not approved for
main**. The latest native crop resistance is one direct impact (`cd377ab0`),
with shielding, physical area checks and introductory protection retained.
Military pressure candidate v3 and agricultural power candidate 2 remain frozen.
No new prices or invisible losses were introduced in the recent diagnostics.

| Retained observation | Outcome | What remains unproved |
|---|---|---|
| v67, productive no-walls/Shield, seed 712 | Native defeat during night 21 | Other seeds, no-shield control and full strategy coverage |
| v68, good/empalizada/contour, seed 712 | 21 survived; 59 plants, 365 coins; 1,553 paid repairs | Stock declines; no sustainable 100-night or postgame proof |
| v75/v76, passive/good rolling empalizada | Passive defeats after night 12; good 14 ends with 20 plants | Neither ever closes its contour; reject long extension |
| v79/v80, passive/good rolling zarzas | Passive loses centre during night 13; good 14 ends with 163 plants, 476 coins | Passive allocation failure unresolved; one active seed is insufficient |

Good zarzas first records a complete contour on day nine, with 266 actual wall
contacts and 561 paid repair coins by day fourteen. This is physical native
evidence, not a synthetic reduction of crop damage. Both fourteen-night zarzas
cases exactly reproduce their seven-night prefixes. See
[the fourteen-night review](pilot-v79-v80-zarzas-fourteen-review.md),
[the contact/repair review](native-defense-contact-cost-review.md) and
[the retained parameter index](retained-experiment-index-v2.md).

Running at this checkpoint: v81 extends good zarzas to 21 nights; v82 replays
passive zarzas with scalar purchase telemetry. Their live receipts are not
terminal acceptance. Require exact source/prefix or replay equality before
using their results. Do not modify campaign-imported code while either runs.

Remaining gates include coherent 7/14/21 pilots across seeds 712/123/2026 and
both requested biome/culture pairs, all six real strategies, optional rather
than compulsory agricultural magic, responsible 100-night survival, authentic
bad-management defeats, 180-day postgame expansion comparisons, performance,
persisted/UI compatibility and visual QA. Human inactivity below 25% remains
unmeasured; scalar decision windows and shader/effect durations cannot approve it.

The official browser runtime was retried on 11 October and still failed before
creating a surface: `failed to write kernel assets` / missing path (error 3).
This is a QA access limitation, not a native gameplay defeat or a passing visual
test. Existing physical Wake Lock acceptance remains valid and is not reopened.

## Power candidate 1

Separate, frozen daily capacities: Growth 180 seconds (12 × 15 extra seconds
from the original +50% / 30-second spell); Multiply 132 additional coins
(12 × the original 11-coin millet harvest). Farm composition, bank balance,
workers and events never increase those capacities.

With cumulative requested reference power T and budget B, committed power is
E(T) = B T / (B + T). Each legal cast commits E(T + request) − E(T).
There are no refunds, retroactive reductions or cooldowns. Expired or destroyed
effects do not release their commitment. Accounts are indexed by the native
day, initialized once on first application, persisted, and never reset by load.
Requests consume reference power, not a counter of twelve permitted actions.

For equally priced reference plants:

| Distinct applications | Growth committed seconds | Multiply committed coins | Last Growth seconds | Last Multiply coins |
|---:|---:|---:|---:|---:|
|1|13.846154|10.153846|13.846154|10.153846|
|6|60|44|7.058824|5.176471|
|12|90|66|3.913043|2.869565|
|24|120|88|1.714286|1.257143|
|60|150|110|0.422535|0.309859|
|200|169.811321|124.528302|0.048288|0.035411|

The table is an allocation calculation, **not an economic campaign**. This
gentler candidate reaches half of its capacity at twelve reference requests.
It does not implement min(1,12/N) literally or promise full potency for the
first twelve applications. Calibration must decide whether this curve is useful.

Growth requests the plant's remaining lifetime cap of 15 extra seconds. Repeat
applications can help until that cap is committed; crossing dawn does not
replenish it. Nanosecond conservative rounding bounds same-plant accounting
size. Actual advancement is recorded separately; dry plants cannot manufacture
consumption. Fractional new powers retain worker watering checkpoints: an
arbitrarily weak blessing cannot erase unlimited mandatory watering work.
Legacy full-strength active Growth keeps its previous checkpoint behavior.

Multiply requests the original base harvest value once per crop/harvest. Its
entitlement is an absolute additional amount, never amplified again by worker
productivity or favorable-soil modifiers. Individual bonus is below the base
value, hence the maximum final multiplier is ×2. Repeat touches retain visuals
but commit zero. The entitlement follows plant → physical crate → delivery.
Legacy version-1 boolean bonuses retain their previous ×2 entitlement; they
are grandfathered compatibility, not evidence of this candidate's budget.

Power is rational, not fractional money in the ledger. At real delivery,
additional whole coins equal floor(total delivered entitlement for its source
day) minus already paid whole coins. Residual sub-coin potency stays in that
source day's power account. It cannot be withdrawn or recycled. This avoids
minting one whole coin for every arbitrarily small bonus. A late entitlement
may contribute to a subsequent delivery's whole coin; no claim that each tiny
application immediately earns a visible coin. Zero-effect/repeated animations
must not count as useful human work.

For a fixed set of requests, total entitlement is order independent. Individual
allocation follows actual application order: early casts have higher marginal
potency, as required by diminishing returns. Different ordering cannot increase
the total budget, reset a harvest, or generate another payout. Individual crop
choice still matters; absolute identity-invariant distribution would require
retroactively changing already harvested benefits, which is deliberately avoided.

## Evidence and remaining work

Eight focused power tests pass: 200 applications, mixed-price order invariance,
whole-coin settlement, repeated settlement, 100 daily resets against a single
plant, actual consumption, watering, native command/save restoration and a
real worker harvesting and delivering before payment. Twenty-eight combined
power/tutorial-reminder/i18n checks pass. The first power build passes.

Tutorial copy has Spanish/English translations. The initial explanation waits
for hired workers and genuinely watered live plants; Growth precedes Multiply.
A later day supplies an exception fallback rather than permanently blocking
explanations. Specific action hands, final UI/tooltips, automatic strategy
receipts and all historical full-strength expectations still need review.

Still pending: integrated horde/reservation/area-damage branch merge and tests,
performance and browser QA, scaled magic productivity runs, six native policies,
short pilots in both requested biome/culture combinations, early-stop diagnosis,
and only afterwards 100/180-day comparisons with the three city-price variants.
Current native actions are experimental and have not been promoted to main.

Historical 100-night compatibility run (previous unrestricted magic, old main
hordes) finished: sunflower case passed; mixed eight-crop case failed its line-35
assertion after approximately 72 minutes total. Raw output retained under
`../agricultural-single-plant/checks/legacy-100-night-result.txt`. It is neither
approval nor a classified economic defeat for this new integration.

## Joint integration checkpoint

Merged existing experimental `codex/survival-expansion-balance` (6f7ced54)
into this branch only, preserving its source and all historical artifacts.
Resolved snapshot validation for both power and raid state; retained exterior
wave entry, individual leases, physical agricultural area damage and exact
exponential city prices. Six protocol strategies now include passive management.
The runner preserves Q5–Q8 physical labor policies and excludes magic selection
windows from the activity-duration proxy. Each daily row records exact power
accounts; magic receipts include committed powers and actually delivered bonus
income. Provenance hashes include the new power module and native magic policy.

75 joint power/reservation/area/pressure/city-price tests pass. A further 34
policy/finance/contention tests pass after updating the old five-strategy and
area-magic fixtures; the initial two failures remain in joint-policy-first.tap.
The combined Vite build passes in 19.10 seconds on this machine. These are
functional checkpoints, not campaign acceptance. Browser QA remains unavailable
through the previously documented official runtime initialization error.

Pilot v1 was refused before simulation because the generated English message catalog remained unstaged. This is retained as a harness freeze error, with zero native campaign days, not a defeat. Freeze the catalog and use a fresh v2 evidence directory.

## Candidate 2: accounting clarity and concentration cap

All pilots and 50/200/500 fixtures above use frozen 7c274e9e candidate 1.
Do not relabel them as candidate 2 results. Two protected pilots were stopped
cooperatively to inspect CPU routing cost: Sabana day 7 at time 240, Gran Cañón
day 7 at time 31. Neither had an active raid or a native defeat at the stop.
Snapshots, receipts and source hashes remain original.

Candidate 2 explicitly limits one Multiply entitlement to at most 11 additional
coins before diminishing returns, or the base value if cheaper. Thus an
expensive crop cannot absorb most of the 132-coin daily capacity in one touch.
Requests use this cap, independent of farm composition. ×2 remains an absolute
ceiling, not a promised result for every species. This is an announced candidate
change, not an alteration to seed/harvest prices or prior commitments. The
reference-millet table is unchanged; higher-price harvests receive a lower
percentage benefit. New native evidence must use the new source hash.

Power reports now separate genuinely pending effects from expired or destroyed
(forfeited) allocations, without returning any potency to available capacity.
Fractional Growth also respects the original next-checkpoint agricultural-event
tolerance penalty. These fixes do not retroactively alter old evidence.

The first pilot with immediate perimeter construction failed on day 3 after
590 coins of wall purchases, zero crop losses and zero replanting on days 2–3.
This indicates a poor opening defense/capital policy, not proof of excessive
physical attack pressure. Defense postponed to day 6 allowed completed seven-
night passive and expansive Sabana controls and unprotected controls in both
Sabana and Gran Cañón. No-shield Sabana lost 42 plants, Gran Cañón 36.
The protected expansive control lost zero. These single-seed openings do not
prove 100-night survivability or a balanced defense advantage.

Non-magic decision-window inactivity remains approximately 68–81% in those
completed controls; no <25% acceptance or human activity duration is claimed.
The 500-plant single-center fixture remains heavily worker-congested, delivering
only two crates in its measured daylight window. Intensive applications do not
automatically improve throughput: moderate beats intensive in the 50/200 cases.
Diagnose native work scheduling and application strategy before changing prices
or military coefficients. No 14/21/100-night expansion is approved yet.

Two attempted canyon launches used an invalid biome key (`gran_canon`); their
zero-day ENOENT harness failures are retained. Corrected runs use the actual
registered key `gran-canon`. This is not an economic or navigation defeat.

## Candidate 2 scaled native fixture

Fresh repeat frozen at 9fd01ec2; full snapshots, receipts, ledger and hashes in
`native-power-50-200-500-v2/`. No campaign claim: these are explicitly prefunded
plots, identical per-size initial states and the same real workers/navigation.

| Plants | No magic income / deliveries | Moderate | Intensive |
|---:|---:|---:|---:|
|50|484 / 44|579 / 44|564 / 42|
|200|726 / 66|788 / 65|769 / 61|
|500|22 / 2|22 / 2|32 / 2|

Same outcomes as candidate 1 for the millet-only fixtures, as expected: the
new per-plant monetary concentration cap changes expensive-crop allocation,
not millet. Do not attribute nonexistent differences to that change. CPU
measurements are retained per case, but these are different productive workloads
and not an isolated GPU performance benchmark. Candidate-2 focused checks: 22
pass, zero failures. Build: 11.81 seconds on this machine.

Tutorial cross-save ordering now recognizes an already-seen Growth explanation in the player profile, so an unseen Multiply explanation is not stranded waiting for a local-only acknowledgement. Expanded tutorial regression: 21 pass / 3 fail; raw output retained in tutorial-expanded-current.tap. These failures require diagnosis against the new real-watering/sequence requirement before approval, not silent deletion of assertions.

## Guided agricultural tutorial checkpoint

The three prior tutorial failures were old sequence expectations: lessons after
first delivery, lessons during a raid, or never acknowledging a new lesson while
workers delivered. Updated player-flow tests retain native paths, delivery, exact
income and paid wages; all 24 previous tutorial/reminder tests now pass.

The first-day lesson now guides the HUD Magic button, then a concrete valid
plant in the world after selecting the corresponding power. Fresh useful native
applications acknowledge the matching lesson and advance to the next power.
Multiply points to a different valid plant. When none exists, no HUD/world hand
or action pause is created; the optional explanation can finish or be closed.
Later-day fallback explains without a first-day hand pause. No fabricated plant
is added. Global profile history and save reload preserve ordering and targets.

39 guided/tutorial/hand/pause/reminder tests pass (tutorial-guided-final.tap);
build passes in 10.92 seconds. New cases cover watered-state gating, exact hand
target, actual native cast while guided, reload, one-plant exception and profile
history. Real browser visual acceptance remains unverified.

SFX static audit initially could not recognize the new native ternary producer
`wave ? RaidWaveSpawned : RaidSpawned`. Its extractor now records both literal
branches, with branch annotations rather than pretending execution. Five source
audit/extractor tests pass; 100 assigned, 26 unassigned, all 126 original bytes
unchanged. This is a metadata repair, not proof of audible playback.
