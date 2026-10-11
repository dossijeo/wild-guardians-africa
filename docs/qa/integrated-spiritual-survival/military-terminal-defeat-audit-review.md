# Native defeat evidence audit

The terminal auditor previously accepted a pre-dawn defeat row without reading
its terminal snapshot. That was weaker than the native-outcome requirement.
It now requires the native snapshot to agree on result, completed nights,
current day, no active raid, integer cash balance, and an actual GameOver event
following RaidEnded. For this native defeat path, no center may be operational
and the balance must be below the unchanged replacement-center price of 800.
A completed-night dawn economic defeat retains its separate existing checks.

Ten parser-contract tests passed. The fixtures are synthetic verifier tests,
not native campaign victories or losses. Missing snapshots, active raids,
incorrect day/count/balance, absent or reversed events, an intact center, and
sufficient replacement funds are rejected. The previously preserved real v116
dawn defeat still passes the strengthened auditor without altered source data:
30 completed nights, cash 32, real delivery/ledger reconciliation and consumed
strike budgets. That historical run predates the current policy freeze and is
not included in the new military cohort's win-rate denominator.

Only the read-only auditor and its tests changed. All 451 source hashes of the
live v118 campaign were checked again and remained identical. No runtime,
strategy, economy, hit points, damage, or random sequence was modified.
