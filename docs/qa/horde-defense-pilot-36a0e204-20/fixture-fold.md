# Original regression fixture reconciliation

This test-only fold follows root's review in
`docs/qa/horde-cooperative-root-review-a689/regression-fixture-review.md` on main.
The historical d4d12580/a6893053 original suite's 15 PASS / 6 FAIL results and
original source bytes remain archived; they are not relabelled as green.

The original acceptance-clock suite now owns all seven clock contracts using a
shared native paid-opening/preparation helper. Its artificial navigation double
was replaced with real Navigation and actual cooperative preparation outside
Game.tick, with serialized-state purity and prepared-key checks. Assertions retain
arrival boundary 400/0.05, normal movement 0.038, split-frame event/position/clock
equality, daytime/nighttime speeds, one dawn and hiring pause, pending water and
growth, all blocking pauses, and exact physical actor exits before acceleration.
The calm-clock case explicitly isolates a calm plan after NightStarted, instead
of accidentally exercising a guaranteed raid. The paid banana replaces a free
manually inserted crop. No unlimited segmentClear stub or manufactured exit is
used. The pause contract still checks both time and elapsed after resumption.

Only the two obsolete immediate-synchronous twelve-actor expectations in
horde-entry-retry changed: camera bounds now permit real preparation before
successful spawn, and the first-spawn RNG assertion does the same. Side selection,
all original strike draws, whole group/species, done flag, time600, no day100
victory and one RaidSpawned remain required. Pending time is explicitly frozen
while no entry is ready. The other four retry bodies are byte-equal after newline
normalization to c916a497 (indices 0,1,3,4), and the independent eight defensive
reservation tests are unchanged.

The additional native-prepared-clock and native-calm-pauses copies were removed
only after their nine contracts were folded into the original seven clock and two
retry cases. The paid-farm integration test remains independent and was not
removed or waived. Historical source receipts referencing removed copies remain
unaltered because they describe earlier freezes.

One directed command passed 33/33, exit 0, 3039.2152 ms:

`node --test tests/acceptance-clock.test.js tests/acceptance-defensive-reservations.test.js tests/horde-entry-retry.test.js tests/horde-defense-evidence-retention.test.js tests/horde-strike-evidence.test.js`

`fixture-fold-receipt.json` records test hashes, exact command and source comparison:
all 390 production/runner source hashes equal the prior repair freeze. No
production, productive policy, budget, economic parameter or campaign changed.
This is regression coverage, not CPU/GPU frame acceptance or economic balance
acceptance. No campaign, retry, CI, PR or promotion was executed. Next pilot
requires a separate root review and authorization.

Root review identified one missing original overshoot assertion in the first
fold: its calm-night advance requested exactly 60 rather than the original 600
real seconds. The corrected fixture again requests 600, asserts that only the
60-second calm night is simulated before mandatory hiring (elapsed600/time0,
day2, one Dawn), then requests another600 and checks the entire state is frozen.
The first fold receipt remains unchanged as historical evidence. The corrected
33-test suite passed 33/33, exit0, 3003.6282ms; its captured TAP output and new
receipt are separate. Production's 390 source hashes remain identical.
