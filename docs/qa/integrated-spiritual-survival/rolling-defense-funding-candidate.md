# Rolling defense investment: explicit QA player choice

Use `--defense-funding rolling` with funded/routed/shore defenses. The default
remains `contour`, preserving the historical complete-unbuilt-perimeter saving
preference. No production code, price, damage, crop rule or worker rate changes.

Rolling rules:

- Do not reserve the full future cost of unbuilt contour pieces as debt.
- Protect current next-payroll reserve and one seed before wall decisions.
- Keep native breach-first repair requests and actual pending repair quotes.
- Spend at most half of the cash left after those protections on new walls.
- Buy only legal native partial strokes; verify actual preview cost against
  allocation. The count reduction is bounded by the existing chunk-piece cap.
- Record actual wall debits, crop debits and repair payments. The allocation
  itself never debits or credits the ledger.

This is a new automated management policy, not a game mechanic or a promise of
balance. It may leave incomplete defenses longer; actual attacks must measure
that risk. There is no plant quota or fabricated forecast income. Q9 hiring
and existing daily magic budgets remain unchanged.

18 funded-defense, breach-funding and CLI tests pass; 11 comparison-integrity
tests pass. A native fixture verifies a real 40-coin partial wall purchase and
a subsequent five-coin replant, retains unpaid contour metadata without
reserving it, and checks exact debits. The first two test runs exposed a
shadowed funding-option name; it is now distinct from the local repair-funding
object. No campaign was launched on those failed versions. Default contour
regressions continue to pass.

Protocol, source manifest and final policy report record the chosen funding
mode. Comparison plots reject mismatched funding modes, including legacy
reports whose absent field means contour. Short paired seed-712 good/passive
campaigns are required before extending this candidate or changing military
calibration. Keep all previous failed funding candidates and native results.
