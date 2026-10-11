# Four-node tail search: measured refinement, acceptance still pending

The native `findPathSteps` iterator now accepts `yieldEvery` from 1–8; its default remains eight. Only the isolated fractional departure candidate requests four. No node order, edge admission, heuristic, route budget or RNG is changed by this option. Invalid values reject explicitly.

The test and AB/BA benchmark require byte-identical final routes. For the archived actor's native tail `(103,14)` to `(60,0)`, all four runs returned route SHA-256 `e884d96ea0829937e0841df2782dcdef87de43a4f4e60a4612bd50aa8c009b4a`.

| Order | Nodes per yield | Calls | p95 per call (ms) | Max per call (ms) | Total tail (ms) |
| --- | --- | --- | --- | --- | --- |
| A | 8 | 251 | 9.58 | 38.04 | 1,020.43 |
| B | 4 | 502 | 5.86 | 34.55 | 1,102.81 |
| B | 4 | 502 | 4.26 | 18.24 | 983.30 |
| A | 8 | 251 | 7.76 | 26.16 | 974.64 |

This reduces the work concentrated in most tail steps and doubles the number of resumptions. It does not eliminate initial ordinary-route preparation (37–131 ms in these fresh-navigation cases), nor prove mobile or whole-frame performance. The benchmark runs under concurrent campaign CPU load and retains all timings. The previous higher negative timings remain archived; do not silently replace them with this sample.

The full isolated four-node movement replay reaches home at step 811, within its 1,200-step / 120-simulated-second observation budget, with maximum movement of 0.24 m per 0.1-s step and unchanged archived domain state. The earlier 600-step synchronous observation budget is insufficient for the extra cooperative resumptions; its older reports remain separate. Game.tick itself subdivides campaign seconds into at most 0.1-s steps, so this is not an artificial economic action or player policy adjustment.

Sixty-six worker/route/navigation/gate regression tests pass. After adding topology-change and removed-actor cache checks, the seven targeted tests pass. Removed actors cannot occupy all eight active-search slots indefinitely. A new solid invalidates a pending search before an old route is returned. The broader suite, browser movement/performance and calibrated campaigns with the eventual final fix remain pending; no PR or integration is justified yet.
