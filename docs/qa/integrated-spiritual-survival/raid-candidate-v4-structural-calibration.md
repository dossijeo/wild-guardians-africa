# Candidate 4: structural attack power only

Candidate 3's frozen good/Q15/cashflow/shore campaign on Sabana/Mapungubwe seed 123 ended in a native loss on night 36. The perimeter intercepted nearly every attack on crops from night 7 through night 34, but the animals removed 37,447 wall HP in 36 raids. The player paid 3,592 coins in wall repairs on top of 820 coins for the original 82 pieces. Once money ran out, 44 pieces were ruined, crops were exposed and the work centre fell. The [retained baseline](campaign-v148-q15-good-sabana-123-hundred/review.md) includes all three strategy outcomes, ledgers and native raid receipts.

This first calibration changes only one authorized dimension: **damage per structural hit**. The animal count, composition, hit budgets, crop damage, attack radii, area caps, shield, navigation, player strategies, crop prices, wages, crop HP, wall HP, wall prices and repair formula are unchanged. The pressure formula and five introductory nights are unchanged. For nights 6 onward:

`structureDamage_i = Math.round(originalStructureDamage_i * (1 + 0.5 * P) * scale_i)`

| Species | Scale | Example damage at P=0.25, v3 → v4 |
| --- | ---: | ---: |
| Warthog | 0.50 | 23 → 11 |
| Hyena | 0.60 | 28 → 17 |
| Buffalo | 0.85 | 39 → 33 |
| Lion | 0.85 | 45 → 38 |
| Rhino | 0.90 | 68 → 61 |

Weak, numerous species caused most of the recorded wear: warthogs accounted for 1,209 of 1,520 species-attributed structural contacts in the losing good run. Strong animals retain most of their structural threat. These scales are an **experimental candidate**, not accepted balance or a target damage quota. Actual animal contacts, wall interception and paid repairs must be measured again with the native engine. A no-walls farm should retain its crop-damage threat because no agricultural attack parameter changed.

Saved candidate-1, candidate-2 and candidate-3 night plans retain their original complete recipes. New nights use version 4. A real active version-3 checkpoint from the retained day-13 Q15 pilot is copied byte-for-byte to `tests/fixtures/raid-pressure-v3-active.json.gz` (SHA-256 `66ff9b496ae87cc29d27191fd0ea508052558093493bd7b8f7a8a9debb0f7c61`). Its existing actors, structure damage, RNG and serialized state survive reload; the following new night adopts version 4. Directed tests also compare versions 3 and 4 across several pressures and nights, requiring identical animal counts, crop-damage envelopes, species composition, hit ranges and attack radii.

Next gates: run the frozen good/no-walls/bad short pilots on seed 123 with this single change, check physical wall/crop/centre receipts and ledger parity, then test further seeds/biomes. Do not extrapolate the per-hit table into a 100-night victory. The branch remains experimental and is not merged into `main`.

Pre-pilot checks: the Vite build and `npm run verify:balance` pass. The expanded raid test set passes 68/69 checks; the sole failure is the historical `native-raid-capacity-audit.test.js` source-hash pin to `src/simulation/rules.js` (`ab87a9b7...` recorded versus `8a185248...` now). This candidate does not edit `rules.js`, and the capacity values themselves still reproduce. The directed pressure, migration, lifecycle, plan, agricultural-impact and composition checks pass. Keep the historical evidence immutable rather than rewriting its hash to certify newer source.
