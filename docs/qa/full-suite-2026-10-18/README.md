# Full-suite audit on current Wild Engine — 18 October 2026

`npm test` on `origin/main` at `62e89f4e` completed in 417.9 seconds: 4,521 cases, 4,454 passed, 7 failed, 60 skipped. The full output was retained locally during diagnosis. This is a complete source-suite run, distinct from the 214-case `test:playable` CI gate.

Three failures were stale assertions or generated evidence:

- QA-089 expected different **species counts** across seeds for the same night, farm and pressure. Pressure V1 deliberately chooses counts before drawing RNG. A 1,000-seed probe found one count signature, 806 actor orders and 1,000 hit-budget profiles. The test now checks seeded timing, order, individual hits, reproducibility, persistence and absence of rerolls without changing the raid algorithm.
- The SFX catalogue audit referenced old source hashes and line numbers after unrelated source edits. Regeneration preserved all 126 original audio hashes, all route classifications (100 assigned, 4 context exceptions, 12 reserves, 10 alternatives), and every row's semantic content. Only source hashes and locations changed. The old line pointers caused the second SFX test to read past the source and throw.

The 11 directed raid-planning and SFX tests pass after these evidence corrections. They do **not** prove the other four full-suite failures resolved:

| Test area | Historical expectation | Current result |
| --- | --- | --- |
| `active-farm.test.js` (2 cases) | Victory at night 100 for two olderFemale Sabana/712 policies | Defeat |
| `intensive-farm-policy.test.js` (2 cases) | Defeat by the test's horizon for two poor-investment policies | No terminal result by that horizon |

Those four tests concern campaign balance and policy outcomes. They should be investigated with the balance work, keeping real wins, defeats and unfinished horizons distinct. This evidence refresh does not alter prices, damage, attack pressure, economy or gameplay to satisfy historical outcomes. A subsequent complete suite run is required to establish the new global count.
