# Passive zarzas: purchase telemetry replay

v82 replays v79 using `diagnose-native-purchase-timing.mjs`, which observes the existing immutable scalar callback and executes the same native player policy. **All 13 complete daily rows, all historical source hashes, the native defeat result and the 12 survived nights match exactly.** Only the observer itself adds a provenance hash. No state, money, tasks, RNG or commanded actions are overridden.

Terminal, plant census, worker settlement, rolling allocation and replay-equality audits passed. Original and replay both end during night thirteen with 24 coins, no plants and no operational centre. Source, receipts, snapshots and raw post-decision observations are preserved.

| Day | Post-decision observations able to fund a seed before 280 s | Such observations labelled budget | Budget-labelled observations | Full-crew renewal reserve |
|---|---:|---:|---:|---|
| 6 | 74 | 0 | 199 | 210–240 |
| 7 | 66 | 0 | 208 | 240 |
| 8 | 36 | 0 | 231 | 240 |
| 9 | 75 | 0 | 189 | 240 |
| 10 | 23 | 0 | 242 | 240 |
| 11 | 25 | 0 | 243 | 120 |
| 12 | 11 | 0 | 267 | 30 |
| 13 | 0 | 0 | 280 | 30 |

The rolling defense reserve is zero throughout; an unfinished perimeter is not being treated as a debt. Seed price is five throughout this interval. No early funded post-decision observation is labelled budget. This excludes the earlier whole-contour withholding mechanism for this run, but **does not reconstruct every pre-decision opportunity or prove optimal allocation**. Active observations can contain several native actions, and later evidence may be needed to separate precise construction/seed timing.

The day-six paid renewal leaves two coins and retains a 210-coin next-payroll reserve; real deliveries then provide the working funds. Throughout days six through ten the player policy replants when money arrives while only building partial zarzas defenses. It never closes the enclosure, loses the crop stock by night eleven, then spends 30 on a worker on the final day from 54 coins. Its remaining 24 cannot pass the 30-plus-five seed funding screen. Real attacks ultimately destroy the centre. There is no fictitious replant income or technical timeout defeat.

This is not evidence that agricultural magic must be required. Before changing native damage, wages, prices or magic budgets, test a legitimate **earlier defense-start decision** with the same native material and Q9 policy. Construction is permitted once a centre exists during daytime; day six was a chosen experiment parameter, not a game unlock. Compare an early seven-night diagnostic before any long extension. If early defense produces its own worker or agricultural starvation, retain and diagnose it rather than hiding that outcome.

No ten-second selection credit, human manual duration, productive-effect duration or hundred-night acceptance is inferred from the scalar rows.

Evidence: `pilot-v82-purchase-timing-audit.json`, raw `purchase-decisions.json` in the v82 directory, and its terminal/census/worker/allocation audits. The terminal auditor also retains its exact older v64/v65 horizon replay regression.
