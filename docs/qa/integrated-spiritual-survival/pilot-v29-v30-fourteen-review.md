# One-hit crops: two more completed Q9 pilots

These are terminal native campaigns, not projected losses. Both completed
fourteen nights without defeat. Their source hashes match the earlier Q9
campaigns frozen at `6c4fbf3d`; report-only commits do not change those rules.
Settings remain Sabana/Mapungubwe, Q9 renewal, cashflow crops, shore defenses
from day6, zarzas, fluid clearance1.5, pressure v3, HP1 and protocol v6.

| Seed | Strategy | Coins | Living | Destroyed cumulatively | Delivered income | Wages | Seeds | Walls | Repairs |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 712 | Walls and Shield | 570 | 186 | 101 | 13,471 | 5,138 | 6,990 | 740 | 733 |
| 712 | No walls or Shield, earlier Q9 control | 390 | 55 | 521 | 13,391 | 5,332 | 8,369 | 0 | 0 |
| 123 | No walls or Shield | 272 | 33 | 574 | 12,704 | 4,952 | 8,180 | 0 | 0 |

Every center ends at600 HP. The new protected712 and unprotected123 campaigns
consume490/490 and521/521 native strike budgets respectively. No preparation
failures, missing raid windows or unobserved budgets are reported. Actual raid
composition can differ between strategies because pressure depends on the
resulting agricultural value; the generator and rules are identical.

`tools/audit-native-terminal-campaigns.mjs` audits all five terminal Q9 cases.
It verifies identical source hashes, complete receipt/report/day counts,
daily cash continuity, unique economic entry IDs, exact integer reconciliation,
every income entry against an observed physical crate delivery, verified raid
coverage and assigned/consumed/unused strike totals. The machine-readable
result is `pilot-v29-v30-terminal-audit.json`. No campaign state is modified.

Protected712 retains over three times as many plants and loses420 fewer plants
cumulatively than its unprotected control. This reinforces the physical defense
advantage seen in seed2026. However, all three unprotected Q9 controls survive
fourteen nights; neither their population losses nor their low cash establish
irreversible insolvency or hundred-night balance.

The matched protected123 campaign is running separately, with the same frozen
configuration. It must finish before the complete three-seed comparison and
the next recovery pilots. Human input-time inactivity remains unmeasured;
the automated idle proxy must not be reported as human activity acceptance.
No production merge or hundred/180-day approval follows from this report.

The paired712 money/population/loss/paid-defense charts are saved as
`pilot-v29-q9-sabana-712-fourteen-final-charts.{png,svg,csv,json}`. The rendered
PNG was inspected. Its axes correctly say native day because neither campaign
contains a terminal defeat. The plotting utility's ten regression tests pass.
