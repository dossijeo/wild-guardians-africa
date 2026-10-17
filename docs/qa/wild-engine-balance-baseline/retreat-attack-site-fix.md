# Retreat exits must not reserve attack sites

## Failure and cause

The Sabana/712 `no-walls` request for 30 nights, with native intentions,
spatial advice and event-driven defense enabled, stopped during day 19 with
`Native attack intention rejected: -6`. It was a technical failure, not a
campaign defeat. The [pre-fix report](sabana712-no-walls-30.json.gz) records
18 completed daily states and the error. The frozen state immediately before
the failing tick is preserved as
[`sabana712-d19-retreat-site-conflict.json.gz`](../../../tests/fixtures/sabana712-d19-retreat-site-conflict.json.gz).

Animal `19857` was retreating toward exit `(95.0471, 3.3480)`. Animal `19865`
had a valid attack approach at `(94.4932, 3.8127)` for `plant-19596`. The
native attack-site reservation loop considered every intent with an
`approachKnown` coordinate, including the retreat exit. A retreat intention
has no attack-site lease, so the exit cannot reserve that space. The loop now
tests `lease` before comparing attack approaches. The reservation rule for
two active attackers is unchanged.

## Differential reproduction

`tests/spatial-native-retreat-site-conflict.test.js` loads the frozen state
and runs the exact tick that failed. It verifies the attacker obtains its
crop target and both native intentions remain active. A direct native test
also checks that a retreat exit does not reserve an attack site, while an
active attack lease still rejects a conflicting second attacker.

The [post-fix report](sabana712-no-walls-fixed-30.json.gz) repeats the same
30-night request. The first 18 daily state SHA-256 hashes match the pre-fix
run. It passed day 19 and completed 20 nights. At day-21 dawn the last center
fell and the game declared a legitimate defeat: zero living crops, zero
operational centers and 31 coins. All 20 raid observations were verified with
zero issues and no lost coverage. The requested 30 nights were not reached.

| Run | Last completed night | Outcome | Elapsed runner time |
| --- | ---: | --- | ---: |
| Before | 18 | Native rejection during day 19 | 206.41 s |
| After | 20 | Game defeat at day-21 dawn | 214.59 s |

These elapsed times cover different amounts of gameplay and are not a speed
comparison. The `no-walls` policy also differs from `good` in cash management
and village expansion, so comparing those campaign outcomes does not isolate
the effect of wall construction. No balance, combat, economy or policy rules
were changed by this fix.

## Verification

- Frozen-state replay and direct native lease tests passed.
- `npm run test:playable`: 204/204 passed.
- `npm run build`: passed with the rebuilt WASM module.
- Full post-fix Sabana/712 `no-walls` replay reached a game terminal state
  without technical errors.
