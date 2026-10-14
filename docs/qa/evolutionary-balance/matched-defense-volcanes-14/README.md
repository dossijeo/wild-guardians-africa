# Fresh-biome matched defense diagnostic: Volcanes/907

This seed and biome were reserved in the aborted seven-night search and had not been evaluated there. The three arms use the same frozen v2 genes, current agricultural magic schedule, production balance, and source `7fd6c1bcb0c725da7b8449bbb2514859eb5a92f1` as the Manglares/123 matched cohort. The configuration and exact module hashes are in `results/config.json`.

| Arm | Outcome | Last recorded cash / live crops | Crops destroyed | Income | Seeds | Wages | Walls | Repairs | Shield contacts |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Walls + Shield | Native defeat on night 12; 11 complete | 110 / 2 | 90 | 5,883 | 2,675 | 2,968 | 470 | 360 | 34 |
| No walls + Shield | **Technical raid-entry failure** before night 10 | 396 / 16 after day 9 | 138 through day 9 | 6,038 | 3,090 | 3,252 | 0 | 0 | Unavailable at failure |
| No walls, no Shield | Native defeat on night 10; 9 complete | 208 / 5 | 173 | 5,671 | 3,040 | 3,123 | 0 | 0 | 0 |

The no-walls-with-Shield run returned `Error: Native raid entry failed` in `run-ga.mjs` during day 10. Its compressed report contains the partial serialized state and receipts, rather than a terminal result. It must not be counted as a defeat, victory, or a 14-night survivor. All available daily ledgers reconcile. The two terminal losses are genuine native defeats. The wall arm spent 830 coins on construction and repair yet also lost most of its crops; this biome remains a serious challenge for the frozen policy.

This cohort cannot support a complete ranking of the three arms due to the entry failure. It does, however, show that the no-defense arm lost earlier than the wall+Shield arm under the same source and seed. It does not prove a general wall advantage or disadvantage, nor identify the cause of the entry failure. Further independent seeds must separate military balance from terrain/entry robustness. Shield contacts are observed; exact Shield activation counts are not available in these reports.

| Compressed report | SHA-256 |
| --- | --- |
| `matched-walls-current-magic-volcanes-907-14.json.gz` | `db9870f7aec2ec7db21ebf8c59ad27c05841a9acc34740edf9fc3b142252c26a` |
| `matched-no-walls-current-magic-volcanes-907-14.json.gz` | `9feb237d1f7638b1cba1d68b34ec10bc98810c7ccaabcee14924867d827c1969` |
| `matched-no-defense-current-magic-volcanes-907-14.json.gz` | `6e644610e70401ba2b9c1c17337d8a6dfef05251372611988f7ea7cac2e49271` |
