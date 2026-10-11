# Native settlement of agricultural magic

The new read-only `tools/audit-native-magic-deliveries.mjs` audits completed reports without changing native simulation, live campaign imports or historical evidence. It matches each recorded magic bonus to the exact native crate delivery event and its unique daily ledger payment. It rejects duplicate bonuses, missing payments, mismatched events/dates, fractional settled coins, negative or excessive bonuses and totals that differ from the observed report. Three tests exercise cross-day settlement and invalid evidence.

| Terminal case | Delivered income, coins | Included Multiplicar bonus, coins | Actual reported growth seconds advanced |
|---|---:|---:|---:|
| v79, passive, 12 survived nights / terminal night 13 | 5,674 | 0 | 0 |
| v80, good, 14 nights | 13,252 | 1,287 | 1,120.647 |
| v81, good, 21 nights | 21,338 | 1,984 | 1,741.737 |
| v87, good, seed 2026, 14 nights | 13,827 | 1,289 | 1,143.953 |
| v88, early passive, 11 nights | 1,969 | 0 | 0 |

All five real terminal audits passed. Bonus amounts are already part of delivered income, not another income stream to add to the ledger. Growth seconds are observed simulated advancement, not human activity or proof of a particular number of extra harvests.

## Commitment day differs from settlement day

For v80/v81, the first five delivery days contain bonus income of 75, 15, 83, 85 and 152 coins respectively, totaling 410. The current-day power counters alone report a different number because older commitments can settle later. Day five exceeding a 132-coin daily *commitment* budget is not automatically a budget violation: payments attributed to earlier commitment days must not be mistaken for new day-five allocations. The auditor deliberately joins delivery events rather than summing the current-day `paid` field. It does not replace the separate allocation/persistence budget tests.

The paired v79/v80 first-five-day incomes are 2,209 and 3,433; 410 of the latter is explicitly delivered Multiplicar income. The remaining difference also includes growth, changed purchase timing, staffing, crop composition and future production. Subtracting the bonus from the active report cannot construct a counterfactual passive campaign. Preserve both real native paths; do not infer that magic is compulsory, or compensate by altering fixed prices.

These audits prove observed settlement consistency. They do not approve long-term balance, human inactivity, browser rendering, 100-night survival or main integration.
