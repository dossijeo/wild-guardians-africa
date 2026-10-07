# Sorted prop query experiment — not adopted

Production remains unchanged. The earlier eight-metre grid candidate failed to improve spawn preparation. This alternative sorts immutable procedural chunk props by X once, uses binary search for the strict X interval, tests Z and circular distance, then restores procedural order for accepted props. It avoids grid cell strings and only sorts actual matches. Queries wider than sixteen metres retain the production axis-prefiltered scan. Suppression is read live; weak chunk keys do not retain evicted chunks.

`node --test tests/prop-sorted-candidate.test.js tests/prop-query-axis.test.js` passed all 14 tests. The new seven tests compare native queries over all six biomes, seven radii, positive/negative chunk boundaries, live suppression, eviction/regeneration, circular boundary exclusion and repeated references. This verifies those queries, not a renderer or complete campaign.

`benchmark.json` replays the existing saved desert spawn context against current production and this candidate. Two alternating warm-up pairs are excluded; twelve measured pairs include index construction inside spawn preparation. Each navigator starts from the same saved state, camera, active bounds and warmed chunk list. All 28 complete post-spawn states share SHA-256 `11008d654d6c97bed19b28349bf50fb20aaf9b544bf6d8f9a766f5ae0e70178b`.

Median CPU spawn time was 304.22 ms for production and 318.99 ms for the candidate. The candidate won five of twelve measured pairs. Four background campaign processes remained active; these timings cannot establish isolated causality or mobile frametime. They do not demonstrate a practical improvement, so no runtime integration is justified. Cold index cost and query cost are included together; this is not a measurement of an already indexed long-running farm.

Reproduce with:

```powershell
node tools/benchmark_sorted_props.mjs docs/qa/raid-spawn-navigation/desierto-profile.json .cache/sorted-props.json 12
```

The report records source hashes and every measured pair. This experiment does not change construction collision rules, suppression, terrain, worker routes, assets or gameplay settings. The integrated preparation spike remains unresolved by this approach.
