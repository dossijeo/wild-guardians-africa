# Full-suite failure baseline, 2026-10-16

The stacked #54 branch ran `npm test` before the reservation fix: 4,434 tests,
4,351 passed, 32 failed and 51 skipped. This was not a green full-suite run.
The reserved-wall failure was specific to #53 and was fixed in `15e07fb3`.

To classify the other failures, a detached checkout of current `origin/main`
at `6f210aa4` (including #58) and the #53 branch at `15e07fb3` ran the same
12 selected test files: `core`, `game`, `crop-lifecycle`, `idle`,
`spatial-task-route-cache`, `power-ready-audio`, `spell-cards`, `tutorial`,
`unlock-audio`, `raid-composition-index`, `guardian-copy` and
`sfx-catalog-audit`. Each checkout recorded 121 tests, 92 passed and 29
failed. All 29 failing test names and their error, code, expected and actual
fields matched exactly. This establishes that these 29 failures were already
present on `main` for these same tests; it does not make them acceptable.

Both checkouts also ran `node --test tests/active-farm.test.js`. The two
100-night cases failed on both with the same `expected: victory`,
`actual: defeat` assertion. These are outdated or currently unmet campaign
expectations, not a new intent-branch defeat. No artificial victory was added.

`acceptance-defensive-reservations.test.js` passes on `main` and now passes
on #53 after the legacy-lease correction. The focused #53 validation after
that correction passed 196/196 playable tests, 45/45 native and reservation
tests, and the web build. This comparison explains the observed 31 remaining
failure names, but the entire 4,434-test suite has not been rerun on the new
#53/#54 heads. CI validates its configured subsets separately.
