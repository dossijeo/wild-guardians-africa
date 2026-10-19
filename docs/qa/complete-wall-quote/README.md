# Stop incomplete enclosure quotes before recursive wall trimming

The Volcanes/712 campaign on the merged crop-protection cache reached night 60 with verified raids, 113 living crops and 724 coins. Its first 30 state hashes matched the earlier 30-night run. Night 27 nevertheless contained a repeatable bot-decision spike: two `defense.nativeEnclosure` calls used 5.05 s in a 30-night profiled run, while adjacent days' enclosure calls took roughly 0.2–0.4 s.

Temporary stage instrumentation (removed from the candidate) identified the second proposal. A 120-crop group and 45-by-45 local window took 26 ms for the native cut and 11 ms for worker route witnesses. Its 49-module general cut took 77 ms to quote and could not prove continuous movement blockage. The artificial-hull fallback then spent 5.29 s inside `Game.quoteWallChain`, only to return `unaccounted-module`. The quote's worker-access check could not place a valid gate, so `quoteWallChain` recursively removed one proposed module at a time and repeated gate/access validation. A partial wall is not an acceptable substitute for a certified enclosure, and the planner rejected it anyway.

The topological planner now requests `requireComplete` when quoting candidates. When an intact proposal would isolate workers, `quoteWallChain` reports `IncompleteWallQuote` at the first failed gate/access validation. The planner records `worker-access-unproved` and moves to its next candidate. Ordinary player wall quotes keep their established partial-stroke behavior. No construction permission, physical proof, gate rule or economic cost changes.

## Repeated campaign comparison

Both [baseline](volcanes-baseline-30.json) and [candidate](volcanes-candidate-30.json) use seed 712, Volcanes, topological defense, native intents, the same WASM SHA-256 `6feeea330cf5c8d0e338503e85abbb007d6803cd1727c0b425623956234ec551`, and the same 30-night configuration. The JS `game.js` source SHA-256 is `1ed97bd8d8722b42abed07b70767e112df287c102c892c136d2e2fac78111067` before and `d169104538500fcb87f4dda20ecf93db0715df9087e7e9117175d7f7ae5b7781` after. The runs were sequential on one Windows host.

| Measure | Baseline | Candidate |
| --- | ---: | ---: |
| Day-27 enclosure planning, two calls | 5,049 ms | 479 ms |
| Day-27 total bot decisions | 5,577 ms | 1,016 ms |
| 30-night bot decisions | 25.43 s | 22.49 s |
| 30-night `Game.tick` | 113.15 s | 120.83 s |
| 30-night elapsed | 154.24 s | 160.56 s |
| Matching serialized state hashes | 30/30 | 30/30 |
| Raid evidence | verified | verified |

The 4.57 s saving in the identified planning call is specific and reproducible in this frozen campaign. The candidate's aggregate elapsed time was **not** faster in this one A/B pair because unrelated tick time varied by 7.69 s. This is a fix for redundant work on a rejected speculative quote, not evidence of an overall campaign speedup. Neither candidate purchased the incomplete wall. Both runs finished with 158 living crops and 1,003 coins.

Reproduce with `node tools/experiments/compare-repair-preview-campaign.mjs batch OUTPUT.json 30 712 volcanes` at the baseline and candidate revisions. The script now retains the native-defense decision phase timings in each daily row. `tests/wall-gate-worker-closure.test.js` verifies that a strict quote rejects an ungated closure while an ordinary quote still leaves the closing piece unbuilt.

The 60-night run preceded this change and is a stability reference, not a candidate-versus-baseline performance comparison. A longer post-change campaign and additional seeds would be appropriate before attributing any global performance change to this small fix.
