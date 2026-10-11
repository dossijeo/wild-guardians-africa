# v116: native economic defeat after 30 nights

The requested 100-night campaign finished naturally at the dawn of day 31.
Receipt: `observed-native-defeat`; actual result: `defeat`. Session 79392 exited
with code 1 and PID 45724 disappeared after writing terminal evidence. This is
neither a timeout, cooperative interruption nor a navigation/harness failure.

The final native snapshot has no living crops, 32 integer coins and an intact
work center with 177 HP. The native `dawnMinimum` is 35: one minimum daily wage
of 30 plus a cheapest seed of 5. `RaidEnded` precedes `GameOver`; all 30 raids
ended and all 1,502 assigned strikes were consumed. Observed entry transport,
deliveries and raid auditors report no lost coverage or technical issues.

## Economic evidence

The daily ledger begins with 700 coins after the initial 800-coin center purchase.
Daily recorded income totals 23,176; wages 10,445; seeds 9,507; new walls 1,040;
repairs 2,852. The exact closing balance is 32. Physical crate delivery receipts
match every recorded income. No hypothetical income, synthetic loss or charge
was introduced. Originals, including the 9 MB report and compressed state, remain
in `campaign-v116-q15-good-sabana-123-hundred/`.

The live prefixes and their charts remain historical evidence. The terminal
chart shows an expansion to about 250 living crops followed by contraction.
Across post-introduction nighttime exposures, 122 of 2,868 exposed crop counts
were destroyed (4.254% weighted loss). This repeated-exposure metric is not the
percentage of unique crops lost, a causal wall comparison or a guarantee of
protection. The protected reference curve yields 3.628%; it was not applied as
damage. Despite comparatively low protected losses, cash flow became fragile.

## Concrete policy defect to resolve before another full campaign

On day 30, the farm started with zero crops and 187 coins. It paid 30 wages and
125 actual repairs, bought no seeds and received no income, leaving 32 coins.
The defense history records `protectedCash: 35` at the general policy level but
only 30 in breached-perimeter repair funding. `breachRepairFunding` deliberately
relaxes the full crew renewal reserve to the minimum wage; it fails to include
the seed needed when the farm has no remaining economic resources.

The discrepancy is verified in `v116-economic-defeat-classification.json`.
Correct the repair allocation to preserve actual native recovery before changing
military intensity. Then test empty-farm recovery, paid repairs and native seed
placement together. A five-coin reservation correction alone does not establish
100-night survival: the earlier contraction, renewal decisions and replenishment
still require short native recalibration and comparable strategies/seeds.

The harness's unoccupied-time proxy is 79.21%, failing its 25% check. This is not
a measurement of a human player's activity. No activity acceptance or responsible
100-night survival is claimed. No balance change has been merged into main.

## Separately validated QA optimization

`native-stable-plan-perimeter-proof.mjs` exposes the metadata candidate as an
explicit opt-in module. It has no production or campaign importer. Its native
copied-v115 test performs real deliveries and the final paid wall purchase;
both copies retain identical state/ledger/RNG and paid native IDs, and fresh
worker proofs match. The 45.58-second test includes two cold physical proofs.
This supplements the prior 84-test regression and warm-check diagnostics.
It does not change the protocol under which v116 ran.
