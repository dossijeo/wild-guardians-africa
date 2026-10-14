# Volcanes/907: matched defenses on corrected raid-entry runner

Three native campaigns were run sequentially on **one source revision** `545e04bac4c76b82551e85a3adbdb7be299064f9`, after PR #39 was merged into main. They share biome, seed, 14-night horizon, default v2 genes, agricultural spell schedule and cash policy. The arms vary only wall building/repair and Shield. `results/config.json` records exact module hashes; compressed full reports, daily progress and `summary.json` preserve the results. All ledger rows reconcile. The earlier Volcanes cohort belongs to an older raid-view version and is historical, not a fourth arm.

| Arm | Native stop | Final cash | Live crops | Delivered crates | Crops destroyed | Income | Seeds | Wages | Walls | Repairs |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Walls + Shield | defeat in night 11 (10 completed) | 219 | 7 | 484 | 72 | 6,317 | 2,815 | 3,335 | 470 | 178 |
| No walls + Shield | defeat in night 10 (9 completed) | 339 | 8 | 485 | 156 | 6,323 | 3,245 | 3,439 | 0 | 0 |
| No walls, no Shield | defeat in night 10 (9 completed) | 169 | 2 | 414 | 163 | 5,449 | 2,895 | 3,085 | 0 | 0 |

The defended arm lasts one more night and loses fewer crops, but **all three lose natively before night 14**. The no-wall+Shield arm is no longer a technical censor under the corrected runner. Financial totals cover different numbers of completed days; compare the daily ledger and raid traces before attributing the difference to defenses alone. Shields contacted animals 20/22/0 times respectively; the report does not count activation commands directly.

In the defended arm, the night-9 raid had 14 animals, attraction 726, 34 wall hits, 711 structural HP lost, seven structures ruined, and two crops destroyed. Night 10 had 15 animals, attraction 715, **42 crops destroyed and zero wall hits**; night 11 had 14 animals, attraction 352, 25 crop losses and one wall hit. This is consistent with a compromised perimeter, but wall-hit counts do not certify an access route, its timing or why targets were chosen. No-wall+Shield had attraction 715/407 and 36/28 crop losses on nights 9/10, with 14/15 animals. Different crop values cause different legal raid pressure even with the same seed and military rules. A QA-only Wild Engine enclosure replay will classify protection, exposure and unknown without replacing these physical raid observations.

This cohort tests local defensive value and engine stability. It does not establish a general win probability, a 100-night strategy or a balance parameter recommendation. Production prices, salaries, damage and raid composition formulas were unchanged.
