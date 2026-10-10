# Journal subtotal audit across nine terminal native campaigns

The read-only terminal audit now sums every journal category using integer
arithmetic and compares those sums with reported income, refunds, wages, seeds,
walls, centers, villages, repairs and other credits/debits. It rejects unknown
categories and incorrect credit/debit signs. This closes a reporting gap:
correct opening/closing balances alone do not prove correct cost subtotals.

All nine terminal Q9/HP1 native campaigns pass: six fourteen-night seed pairs,
unprotected2026 defeat16, Shield-only2026 defeat21 and unprotected712 defeat17.
`nine-campaign-subtotal-audit.json` preserves the result. Previously checked
native receipt coverage, unique paid entries, physical crate income, strike
accounting and identical frozen source hashes remain required.

Four validator regression tests pass. Synthetic parser fixtures deliberately
corrupt a wage subtotal while retaining the same balance, remove a delivery
observation, duplicate a receipt, invert an economic category sign, report an
entry failure and omit strike consumption. Each corruption is rejected. A
native-defeat-shaped fixture preserves the distinction between terminal day
and completed nights. These are technical validator tests, not evidence of
native campaign survival, losses or balance.

The four live21-night campaigns also match their historical daily prefixes
exactly, with equal source hashes: protected2026 through14 days, protected712
through12 and both123 policies through8 at observation. This comparison uses
completed rows only; it does not certify their unfinished future horizons.

No runtime, player decision policy, prices, damage or magic changes accompany
this audit. Active simulations retain their frozen mechanics.
