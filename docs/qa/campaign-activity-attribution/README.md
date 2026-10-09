# Attribution of rejected activity metrics

Read-only analysis of four already audited, frozen 100-night campaigns. `analysis.json` records their immutable source revisions and hashes of the decompressed report and summary. It does not rerun a campaign or approve a balance change. Reproduce with `node tools/analyse_campaign_activity.mjs OUTPUT.json ARCHIVED_CASE_DIRECTORY...`.

| Frozen case | Nights 1–20 idle | 21–40 | 41–60 | 61–80 | 81–100 | Operating cash margin |
|---|---:|---:|---:|---:|---:|---:|
| Canyon / Mapungubwe | 70.65% | 64.20% | 24.70% | 19.17% | 33.17% | 6.92% |
| Canyon / Saheliana | 76.45% | 66.27% | 59.98% | 21.05% | 18.17% | 3.93% |
| Canyon / Suajili | 68.55% | 57.73% | 19.57% | 20.50% | 28.05% | 7.60% |
| Desert / Mapungubwe | 75.60% | 68.05% | 26.83% | 8.38% | 7.02% | 3.48% |

The slow early expansion dominates the failed whole-campaign activity result, while later Canyon saturation also introduces space-related idle. These are different constraints. Additional income alone cannot be assumed to fix both: a faster expansion may reach the same spatial limit sooner.

Operating cash margin is `(delivered harvest income − seeds − wages − repairs) / delivered harvest income`. Construction is reported separately in the original cashflow. The static break-even income multiplier holds all recorded spending fixed and is diagnostic only. It cannot predict changing inventories, future staffing, delivery timing, crop destruction, liquidity or the feedback from reinvestment. A positive final balance does not establish a good paced campaign.

Next action: compare the already dispatched, unchanged-policy current-main campaigns against these frozen results. Investigate early physical task throughput and working capital separately from later planting-space exhaustion; validate any necessary game-parameter change with responsible campaigns and genuine poor-management defeat tests. Do not replace these rejected results with a different policy or seed.

This analysis does not support a current-main activity acceptance, GPU claim, new parameter value or complete release acceptance.
