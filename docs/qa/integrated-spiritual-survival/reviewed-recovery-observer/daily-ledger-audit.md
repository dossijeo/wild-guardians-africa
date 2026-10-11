# Daily journals before termination

`tools/audit-native-daily-ledger.mjs` extracts the existing terminal auditor's ledger checks so they can also run read-only against completed rows of live campaigns. The terminal auditor still independently requires physical deliveries, snapshots, raid receipts and a genuine native outcome.

The shared checks reject duplicated payment IDs across days, discontinuous opening/closing balances, incorrect category signs or subtotals, incorrect net amounts and fractional/unsafe Number amounts. Unsafe journals are rejected rather than reported as exact through lossy Number conversion. No game rule, observer callback, policy or campaign source changed.

Twelve parser tests pass, including existing terminal defeat, hundred-night victory, 180-day postgame, physical delivery and transport-failure checks. Synthetic fixtures are parser tests only. The original seed-712 terminal negative also passes the refactored native audit; `historical-terminal-audit.json` retains that result.

The live corrected-runtime reference's first ten complete rows pass: 9,868 income, 3,438 wages, 5,380 seeds, 480 walls and 296 repairs; opening 700 after the already-paid 800 center, closing 974. There are 723 distinct recorded income entries. The historical recovery's first 52 complete rows also pass: 60,955 income, 27,212 wages, 27,572 seeds, 1,140 walls and 5,581 repairs; opening 700 and closing 150. There are 4,658 distinct recorded income entries.

Those checks do not establish a terminal outcome, physical-delivery coverage or population win rates. The historical recovery has different technical dependencies and remains separate from the matched comparison. Its fragile balance is not a reason to stop or change its policy; it continues to a real native outcome.
