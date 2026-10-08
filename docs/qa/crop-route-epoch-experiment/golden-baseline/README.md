# Explained route-epoch golden update

The first complete local regression ran 3154 tests: 3153 passed, one failed in the fixed one-night state hash in `crop-lifecycle.test.js`. Both native hundred-night active-farm tests passed; no survival threshold, wages, income, costs or damage setting was relaxed. This archive retains the entire failing TAP rather than presenting it as a green suite.

Re-running the same ordinary responsible olderMale seed712 opening with archived production Navigation reproduces the old golden hash f5502530 exactly, using unchanged current Game and strategy. Current geometry-only epoch navigation reproduces 5df191a5. Projecting away route epochs still leaves 1201 state-field differences, including IDs/history/timing and actual economy. This is not an epoch-only serialization change.

| One-night result | Original navigation | Retained clear-plant routes |
| --- | ---: | ---: |
| Navigation epoch | 104 | 6 |
| Paid plants | 98 | 97 |
| Physical crate deliveries | 28 | 27 |
| Final coins | 418 | 409 |
| Day staff / wages | 6 / 180 | 6 / 180 |
| Extra prorated wages | 4 | 4 |
| Living crops / centre HP | 70 / 600 | 70 / 600 |

Both states pass the unchanged native ledger/crate audit and complete one night without defeat. Retained routes change completion timing; one fewer delivered crate yields fewer funds to reinvest that day. The test's fixed hash was explicitly updated to this documented behavior and now also requires the baseline financial audit. Explicit/default 12-plant staff policy equality and higher-staff real payment/physical delivery assertions remain intact.

After that expectation-only change, 25 affected/directly related tests passed (terminal session10155 exit0). The web build and package passed (701files,403019701bytes,859relative links,20runtimeGLBs). Runtime code was not modified after the complete suite ran; no second complete green local suite is claimed. CI must validate the final committed revision independently.

The comparison generator initially failed to resolve helpers after copying the strategy into `.cache`. Only import paths to the original tools were corrected; simulation/balance was untouched. Runner, generated reference modules, both full final states, comparison, actual logs and corrected test are compressed and SHA-256 bound. The original navigation is also preserved in the parent archive. `verify.mjs` rechecks stored logs, hashes and native financial invariants, not independent replay of the full suite.
