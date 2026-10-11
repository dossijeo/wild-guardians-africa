# Q13 labour funding candidate

This opt-in QA helper addresses the unfunded nonempty-field contracts observed
in v66. It changes automated player choices only, never native wages, worker
productivity, crop growth, military settings, income or repair prices.

Starting from Q12's preferred/fallback crew decision, screen current available
coins against current payroll, identical next payroll, pending repair reserve
and one seed. Integer arithmetic is exact. Reduce the proposed crew only when
that funding is unavailable. Already funded proposals are unchanged. If no
fully renewed crew is affordable but one native wage is payable, explicitly
mark a one-worker emergency; this does not guarantee economic recovery.

For v66's late-contract observations, 91 coins proposes one elder at 30 rather
than two at 60, leaving 61 coins and a funded 30-coin renewal. At 62 coins a
one-worker emergency leaves 32, with a reported three-coin working purchase
shortfall. No future delivery is credited as available cash.

Three focused tests pass: funding/repair/emergency planning, immutability and
integer guards, plus an actual paid native elder fallback contract using the
retained 39-coin dawn snapshot and save/reload duplicate-debit protection.
The first run had an incorrect test assertion expecting a successful hire to
return true; the native API succeeds via ledger settlement and returns no
success boolean. The corrected test asserts the actual settled debit.

After v68 completed normally, Q13 was exposed as an explicit campaign CLI
choice and added to the frozen source manifest. The legacy default and Q9/Q12
dispatch remain unchanged. Q13 records its screened proposal separately from
base Q12 proposals, avoiding ambiguity with actual paid contract history.
The combined Q13/Q12/Q10/CLI regression suite passes. Short native pilots and
comparison with retained negative results are still required. This funding
screen is never production logic, balance approval or fabricated activity time.
