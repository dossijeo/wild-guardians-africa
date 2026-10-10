# Repeated native wall collapse in defended pilots

The protected 2026 and 712 campaigns survive 21 nights, but their productive
inventories decline during days 15–21. Inspecting terminal raid observations
shows substantial physical wall interception and repeated collapse:

| Seed | Wall contacts | Wall HP lost | Wall collapse events | Distinct collapsed wall IDs | Plants destroyed | Repairs paid | Center contacts |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2026 | 364 | 9,138 | 84 | 42 | 223 | 1,010 | 0 |
| 712 | 391 | 10,176 | 91 | 27 | 160 | 1,083 | 0 |

These are native observed attacks and actual ledger debits, not estimated damage
or a maintenance tariff. All recorded ruined IDs resolve to wall structures in
the corresponding retained snapshot. Each raid is ended, daily loss counters
match raid destruction counters, and each day's ledger reconciles. Both campaigns
share frozen source hashes. The audit records snapshot SHA-256 and daily rows.

Collapse events count repeated destruction of repaired/rebuilt pieces; they are
not counts of unique walls bought. Paid repairs may address the preceding night's
damage and must not be treated as a same-night invoice for HP lost. An intact
wall in the final snapshot cannot establish that it remained intact all night.

The evidence supports testing stronger material before weakening animals: zarzas
are physically taking hits, but many pieces collapse repeatedly. It does not
establish the exact chronology of breaches and crop attacks; aggregated counters
alone cannot prove that every lost plant was reached through a particular breach.
Nor does it show that all choices of defensive layout have equivalent results.

The ongoing seed-2026 empalizada pilot changes only the chosen wall material,
using its existing native price and HP. Compared with zarzas, trajectories may
diverge after the higher initial investment because productive purchases, pressure
and subsequent RNG consumption depend on the resulting state. This is a matched
initial-seed policy experiment, not identical attack rolls after divergence.
Wait for terminal native evidence and audit before accepting the material choice.

No prices, attack budgets, production rules, imported simulation modules or
production assets changed for this inspection. Evidence:
`pilot-v34-nightly-wall-attrition-audit.json`.
