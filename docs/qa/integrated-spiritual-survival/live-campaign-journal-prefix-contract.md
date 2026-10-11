# Accounting observations while the hundred-night campaign runs

`audit-native-campaign-journal-prefix.mjs` reads one captured copy of `days.jsonl` without modifying the campaign. It audits only newline-terminated completed rows; an incomplete concurrent append is excluded and counted. Output creation uses an exclusive write, preserving previous observations.

It verifies consecutive days, unique transaction IDs across days, safe integer currency, category signs, exact subtotals, net movements, opening/closing continuity and agreement with recorded money. Integer sums use BigInt. Three tests include negative cases for duplicate payments, broken continuity, incorrect subtotals/net/saldo, unsafe currency, incorrect signs, unknown categories and discontinuous days.

The preserved `v111-seven-night-journal-prefix-audit.json` captures seven completed rows from the running v111 campaign: 1,130 transactions, opening 700 after the initial 800-coin centre purchase, income 6,045, wages 1,963, seeds 3,271, walls 780, closing 731. It identifies the captured prefix and source manifest with SHA-256. Those totals reconcile as 700 + 6,045 - 1,963 - 3,271 - 780 = 731. The launch remains Sabana/Mapungubwe, seed 123, good management, target 100 nights; its sources and policy have not been changed.

This check is deliberately narrower than terminal acceptance. It does **not** prove physical deliveries, complete observer coverage, attack efficiency, survival for 100 nights, economic balance or human inactivity. The terminal campaign, crop, worker, defense and magic audits remain required when the run finishes. No partial accounting success justifies integration into main.

Validation: `node --test tests/native-campaign-journal-prefix.test.js` (3/3 passed). The live run was independently confirmed active by process ID 51796 during capture. The secondary Canyon pilot also remains active, with six completed rows at the observation; no campaign was restarted or recalibrated.
