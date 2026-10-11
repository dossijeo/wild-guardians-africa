# Raw force and healthy-crop HP are different reference quantities

The frozen v3 pressure budget records H × D × weighted reference area. Native crop impacts instead consume at most the plant's remaining HP. Since crops now have one HP, central force above one includes overkill. A buffalo with five assigned hits, D=2 and a reference area of 1.5 records 15 force points. With one central plant and one half-damage peripheral plant per hit, the same hypothetical healthy geometry has only 10 consumable HP points. No animal receives additional hits or losses from this calculation.

The separate read-only `diagnose-native-raid-reference-overkill.mjs` reconstructs this distinction from saved per-species hit budgets and reference envelopes. It verifies the original raw sum and the recorded source hashes for balance, health and pressure. It does not change simulation or observers imported by either running campaign.

`v105-stopped-reference-overkill-diagnostic.json` preserves the partial archive SHA and includes only ended native raids. Introductory nights 1–5 are excluded because they do not carry the same pressure reference envelope. Results:

| Night | Recorded raw force | Healthy reference HP | Reference overkill | Observed agricultural HP |
| --- | ---: | ---: | ---: | ---: |
| 6 | 27 | 27 | 0 | 27 |
| 7 | 34 | 34 | 0 | 0 |
| 8 | 49 | 44 | 5 | 0 |
| 9 | 59 | 54 | 5 | 0 |

Reference HP still assumes the saved reference lattice: it is not a count of available real targets, a guaranteed destruction budget or a prediction of actual casualties. Real positions, remaining wounds, repeated strikes, obstacles, workers and shields affect the outcome. The healthy-reference ratio therefore must not be interpreted as pure route efficiency or causal defense effectiveness. The original efficiency and raw observations are retained unchanged. No pressure recalibration is performed during the priority hundred-night campaign.

Validation: two tests verify saturation, unchanged inputs and observed zero damage, exclusion of introductory profiles, and rejection of unfinished raids, inconsistent raw totals, unknown recipe versions and invalid reference areas. Archived nights 6–9 reproduce their raw sums exactly. Full campaign acceptance still requires native terminal evidence, not this mathematical diagnostic.
