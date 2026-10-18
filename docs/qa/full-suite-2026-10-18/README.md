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

## Complete rerun on current main and extended loss horizon

The complete suite was rerun on `fdb64bd3b2d8f9f487266d4469a20b9c9337b1b1` (Node 20.11.0, Wild Engine spatial WASM SHA-256 `f0032bf7d6d5bb3336f2f9480fc2dc109906b9d2743315853320420863b07643`). `npm test` finished in 420.25 seconds: **4,521 cases, 4,457 passed, 4 failed, 60 skipped**. The failures are exactly the two historical 100-night active-farm victories and the two poor-investment defeats expected before day 10. No other test failed.

The two poor-investment policies were then run unchanged through a 14-night horizon. Both still use ordinary planting, hiring, delivery, raids and save/reload; `auditIntensiveFarm()` passed. They do lose, but later than the old ten-day assertion:

| Raid camera | Terminal result | Completed nights | Final coins | Maximum living crops | Crops destroyed | Crates delivered | Raid exits |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Off | Economic defeat | 12 | 24 | 188 | 127 | 124 | 12/12 |
| On | Economic defeat | 13 | 14 | 188 | 146 | 122 | 13/13 |

The work center remains operational in both terminal states and cash falls below the game's actual `dawnMinimum`; these are not fabricated losses from an arbitrary plant-count or time limit. The tests now allow 14 nights, require survival through the introductory period, require the actual `GameOver`, settled raids, physical deliveries, an intact center and cash below the real dawn requirement. They do not hard-code the exact defeat night. `node --test tests/intensive-farm-policy.test.js` passes all five cases in 52.2 seconds after this adjustment. The full suite has not yet been rerun with the updated horizon, so the two historical victory assertions remain the only *observed* failures after the directed run, not a claimed green global suite.

The old active-farm policy has 16 fixed plots and no perimeter. Its day-eight defeat cannot certify whether competent defended play can reach night 100. Keep that distinction explicit while the separate balance work evaluates protected farms and independent seeds; no military, economic or navigation rule was changed here.
