# Investment and losses by crop species

The summarizer now partitions seed investment into living, physically picked and destroyed plants. Delivered harvest income comes from the actual ledger; the species seed prices must reconcile with its recorded total purchase debits. A mismatched historical price total causes an error rather than silently producing a new financial attribution.

The reanalysis is saved in `intensive-profile-comparison-20/species-investment.json`. These are the original four 20-night campaigns, with their original provenance; they have not been rerun or reclassified as current 100-night acceptance.

| Workforce | Cotton seeds | Cotton income | Cotton seeds destroyed | Banana seeds | Banana seeds destroyed | Banana seeds still alive |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Older men | 3800 | 3456 | 900 | 3150 | 1950 | 1200 |
| Older women | 600 | 0 | 600 | 450 | 450 | 0 |
| Young men | 1900 | 384 | 1600 | 1950 | 1950 | 0 |
| Young women | 400 | 0 | 400 | 300 | 300 | 0 |

No banana crate was delivered in these four campaigns. Eight banana plants remain alive in the older-men campaign, so its entire seed expenditure is not an irreversible loss. Harvest minus seed costs excludes wages and repairs and is not a final profit measure for plants still growing.

Losses with pending watering describe the plant's state at destruction, not a cause of death. For example, both bananas in the young-women campaign were destroyed without a pending watering. These snapshots do not retain placement and destruction timestamps for every plant; they cannot establish how much of the result comes from late planting, work backlog or individual animal targeting.

The approved rules explicitly freeze growth and water tolerance at night. Changing this rule to make these crops mature faster would contradict the plan. Further balance decisions need recorded task and crop timelines and the ongoing full-size campaigns.

There is a separate, narrower counterexample to universal crop failure: the `mixed eight-crop farm` test in `tests/active-farm.test.js` passed in Validate game run 37260824546 on `dba3b69`. It uses ordinary native terrain and worker actions, completes 100 nights and asserts at least one physical delivery for each species, including banana. Its strategy restricts itself to 16 plots and diversifies later. This proves that the crops can complete their full lifecycle under the approved rules; it does not satisfy the requested intensive expansion test or establish acceptable profitability and pacing in a large plantation.

Verification: the archived native mixed campaign reconciles all eight species against the ledger. Its 21 bananas account for exactly 3150 seed coins, split into 1200 living and 1950 destroyed. A deliberately changed historical debit is rejected. The normal opening, paid midday hiring and bad-management-defeat checks also run through the same summarizer.
