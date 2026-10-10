# Counterfactual global raid budget study

Read-only planning study of sixteen recorded post-introduction encounters from the native twenty-one-night unprotected campaign. It changes only the global reference-budget multiplier among 1, 1.25, 1.5 and 2. Quantity, original hit ranges, pressure, species unlocks, damage profiles and radii stay fixed. The native planning function is reused; no RNG is rolled, no damage is applied, and no ledger or campaign state is changed.

| Night | Multiplier | Composition (warthog / hyena / buffalo / lion / rhino) | Reference mean HP | Global Q |
|---|---:|---|---:|---:|
| 6 | 1 | 10 / 1 / 0 / 0 / 0 | 34 | 46 |
| 6 | 1.5 | 9 / 1 / 1 / 0 / 0 | 46 | 69 |
| 14 | 1 | 11 / 2 / 0 / 1 / 0 | 57.5 | 75 |
| 14 | 1.5 | 11 / 1 / 1 / 1 / 0 | 73.5 | 110 |
| 21 | 1 | 12 / 3 / 0 / 2 / 0 | 81 | 105 |
| 21 | 1.5 | 12 / 2 / 2 / 1 / 0 | 100.5 | 150.5 |

At all sixteen sampled pressures, 1.5 and 2 retain the same original species composition and require no downgrading adjustments. Thus 2 does not increase actual generated capacity over 1.5 in this study: Q is a ceiling on composition, not an invisible damage grant. A 1.5 ceiling may be worth the next native pilot because it removes the existing composition downgrades while retaining the original full hit rolls. It is not approved and not a promise of 50% greater damage, target losses, or economic insolvency.

The 64 rows reproduce exactly in a second run. Its multiplier-1 compositions are asserted to equal the actual native spawn receipts. Every alternative retains the exact unit count and its full-range maximum fits the proposed Q. The first script is retained with a matching source hash; v2 adds the explicit native-baseline assertion and retains its own source hashes. No existing native campaign is modified or restarted by this study.

Runtime configuration remains canonical multiplier 1. No candidate switch is allowed while the protected twenty-one-night process is still executing. After that process is terminal, any native candidate must explicitly update configuration/version, tests and source freeze together. This calculation cannot replace physical calibration or the 100/180-day acceptance battery.
