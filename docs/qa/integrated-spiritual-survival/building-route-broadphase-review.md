# Building corner-route broad phase

Experimental branch only; the running v111 campaign remains on its frozen source.

The day-8 CLI profile identified `findBuildingRoute` as a major CPU consumer. Its original implementation calculates segment-to-vertex distances across every building footprint, including distant buildings. The candidate first rejects vertices outside the segment's axis-aligned envelope expanded by `radius + 2`. Inclusive bounds are followed by the unchanged strict distance predicate. Candidate order, corner generation, maximum 48 checks, native swept collision/fluid/slope queries, and A* fallback remain unchanged. No new usable-route cache or invalidation policy is introduced.

## Evidence

- All 40 tests across building shortcuts, watering approaches/detours, crop navigation cache, and navigation epoch passed. These include the recorded Canyon routes, every culture at three rotations, pond rejection, newly placed obstacles, reload, and inaccessible plateau crops.
- The reproducible probe `node tools/benchmark-building-route-broadphase.mjs FRESH_OUTPUT.json` loads the frozen original from Git commit `513b30bf`, reports both source hashes, and compares 1,200 deterministic scenarios. Returned routes **and ordered native-query argument traces** match exactly, including blocked, clear, and mixed cases.
- The first ABBA measurement is retained in `building-route-broadphase-abba.json`: A mean 3,225 ms, B mean 4,816 ms. B samples diverged sharply (7,464 vs 2,168 ms), so this measurement does not establish improvement.
- A second protocol explicitly warms both implementations for 2,000 queries, then runs three ABBA rounds with 10,000 queries per batch. `building-route-broadphase-abba-warmed.json` records A mean 1,456 ms and B mean 375 ms, a 74.25% reduction in this **isolated synthetic candidate-generation workload**. Each round favors B. The machine also runs the authoritative campaign; absolute timings are subject to CPU contention.

This experiment uses 300 synthetic house footprints and 400 fixed queries. It is neither an end-to-end campaign benchmark nor a GPU or gameplay FPS measurement. It does not prove a 74% reduction in total campaign duration. Native regression tests verify route legality, but end-to-end timing and larger representative layouts remain to be measured before production integration. The negative initial measurement is preserved rather than discarded.

The misleading original comment claiming checks never occurred per frame was corrected: the bound is per query, and watering can repeat those queries.

## Recorded native watering follow-up

`node tools/benchmark-native-watering-broadphase.mjs FRESH_OUTPUT.json` compares the original corner-route function against the candidate inside the unchanged native `wateringRoute`, using the two compressed Canyon detour snapshots. Independent navigators use the same snapshot, profile and worker/crop. Both routes and the full ordered `walkable`/`segmentClear`/`path` argument traces are identical; route selection leaves the serialized state unchanged.

Each case has eight building footprints, rather than the synthetic workload's 300. After 50 warm-ups per implementation, three ABBA rounds measure 500 native watering queries per batch. Fixture 1 means: A 458.54 ms, B 437.12 ms (4.67% lower). Fixture 10: A 925.55 ms, B 872.84 ms (5.70% lower). Some individual rounds reverse the ordering and timings vary substantially under concurrent CPU load. These data do **not** establish a robust end-to-end improvement. Preserve the complete samples in `native-watering-broadphase-abba.json`; do not extrapolate the earlier 74% result to the native campaign.

The candidate is a small exact rejection optimization, not a solution to all day-8 navigation costs. Further investigation should target repeated candidate construction and native terrain/collision work without weakening physical correctness or changing the running campaign.
