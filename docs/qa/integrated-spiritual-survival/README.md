# Integrated spiritual survival balance — experimental, not approved

Branch: `codex/integrated-spiritual-survival-balance`. Main is unchanged.
This supersedes the proposal to merge unrestricted full-strength individual
magic separately. No complete campaign may approve a partial integration.

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
