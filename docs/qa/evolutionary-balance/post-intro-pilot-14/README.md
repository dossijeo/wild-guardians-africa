# Fourteen-night post-introduction policy pilot

This is the first primary-horizon diagnostic after the seven-night technical screen. It freezes three legal virtual-player genomes: default with planned walls, the same genes with no walls (Shield remains), and a planned-wall variant that directs half of agricultural spell choices to Crecimiento. Sabana/411 and Gran Río/626 were already used for the seven-night screen, so they are **development seeds**, not untouched holdout. All use unchanged production balance and the same post-PR39 Wild Engine runner.

The run is sequential. The 60 s daily `Game.tick` and 15-minute case wall-clock ceilings are cooperative technical cost stops, never native defeats. Each case records a full compressed native report, daily progress, source and module hashes, and exact config. The versioned `post-intro-v1` diagnostic measures day-6-onward deliveries, paid ledger, destruction, terminal production and recovery trend. No empirically calibrated delivery floor is yet supplied, so the raw score is provisional and **cannot select a final strategy**. A survivor with collapsed production will be shown as such, and no-walls receives no direct penalty.

After these development pilots, derive an activity reference from native controls and freeze it before a new genetic search. Use new seeds and biomes for reserved validation. Escalate to 21/30 nights only if the native behavior and compute cost justify it.

## Completed development pilot

The six native cases completed 14/14 nights without a technical error or computational cost stop on source `401f2d00ef6b9806e210c245798cf7ae9818a7bf`. Every daily ledger reconciled. `results/integrity.json` records the SHA-256 and byte count of each compressed full report; `results/config.json` records the source, module hashes, genes and budgets. Daily progress is retained beside each report. All figures below are **nights 6–14**, except final state and total delivered where indicated.

| Biome / seed | Genes | Lost crops | Income | Seeds | Wages | Walls | Repairs | Final 3-night deliveries / day | Final crops | Final cash |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Sabana / 411 | default-walls | 52 | 13,371 | 6,093 | 6,062 | 410 | 786 | 107.7 | 146 | 872 |
| Sabana / 411 | default-no-walls | 403 | 11,320 | 6,290 | 5,610 | 0 | 59 | 71.0 | 25 | 591 |
| Sabana / 411 | growth-half-walls | 94 | 11,979 | 5,344 | 5,569 | 260 | 797 | 93.7 | 56 | 737 |
| Gran Río / 626 | default-walls | 48 | 13,589 | 6,222 | 6,200 | 310 | 768 | 119.3 | 149 | 912 |
| Gran Río / 626 | default-no-walls | 380 | 11,192 | 6,155 | 5,586 | 0 | 0 | 78.3 | 42 | 619 |
| Gran Río / 626 | growth-half-walls | 76 | 12,220 | 5,515 | 5,625 | 440 | 701 | 104.0 | 86 | 755 |

The default defended genome outperformed the other two on crop retention, terminal deliveries and cash in **both development scenarios**. These two seeds were used in the seven-night screen and are not an untouched holdout. All six survived only to the 14-night horizon; none establishes 100-night viability. The no-wall policy remains a legitimate unpenalized control. Its initial cash advantage reversed as repeated physical crop losses reduced terminal deliveries. `repairs=59` for Sabana/no-walls is repair of a non-wall structure, not wall spending.

The growth variant executed 261 Crecimiento and 259 Multiplicar applications during nights 6–14 in each biome; the default arms used 520 Multiplicar and zero Crecimiento. It achieved 247.4/282.1 seconds of completed growth advancement in Gran Río/Sabana, so the gene was active. Lower income and more crop losses cannot be attributed solely to magic: changed production also changes attraction, animal composition, wall spending and exposure. These reports do not establish an optimal spell split.

The provisional score printed in `summary.json` used a null delivery floor and is **not a final fitness ranking**. To avoid making the wall-using baseline itself the eligibility standard, calculate a low viability reference from **all six** development controls, including no-walls: sorted terminal delivery rates are 71.0, 78.3, 93.7, 104.0, 107.7 and 119.3 boxes/day. Their interpolated 25th percentile is 82.17 boxes/day. That scale also has an economic interpretation: at each no-wall arm's actual terminal sale value, its paid seeds, wages and repairs would require 81.1 or 85.5 boxes/day respectively to break even. It is an evaluation threshold, not a game rule or a fitted optimum.

Floor sensitivity on these same six observations: 0 or 70 boxes/day retains 6/6 productive arms; 82.17 retains 4/6; 95 retains 3/6; 110 retains 1/6. This threshold was derived **after viewing** the development cohort, so freeze it before new cases and never present this cohort as unbiased selection evidence. The raw no-wall survival, losses and production remain visible even if it is below the competitive floor; systematic no-wall dominance would still be reported as a design concern. Report `productiveAtEnd`, terminal deliveries, paid obligations, native result and eligibility separately. Native defeats remain physical defeats even when terminal production collapses.
