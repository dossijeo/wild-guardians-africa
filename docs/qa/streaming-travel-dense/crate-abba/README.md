# Native traveling: rigid crate shadow primer, AB/BA

Four fresh sequential native IAB contexts, order A1/B1/B2/A2, source
`c77d6ad8`. A compiles resident color programs and uploads resident textures;
B additionally prepares the observed rigid crate's exact native depth variant.
Both await the same 34 actors, use the archived Gran Río/Suajili dense farm,
media quality, and travel 180 m in 15 seconds. No GL trace wrappers or resource
binding queries are installed; asynchronous GPU timer queries remain enabled.

| Arm | Interval p95 / max ms | Intervals >100 ms | CPU render max ms | GPU p95 / max ms |
| --- | --- | --- | --- | --- |
| A1 | 149.7 / 249.4 | 44 | 244.9 | 73.11 / 78.13 |
| B1 | 166.1 / 199.9 | 44 | 52.4 | 73.48 / 80.96 |
| B2 | 182.9 / 232.9 | 56 | 51.6 | 87.28 / 118.08 |
| A2 | 182.9 / 266.0 | 52 | 178.8 | 86.42 / 107.92 |

The candidate avoids a CPU world-render call above 100 ms in both repetitions;
each control has one. Previous native tracing identified the missing depth
variant, and the candidate's cache key was verified before travel. This
comparison is consistent with removing that specific first-use CPU blocker.
It does **not** demonstrate globally stable frame delivery: p95 and >100 ms
counts do not improve consistently, and GPU cost remains large and variable.
Do not promote this QA helper as a general traveling optimization.

All first measured frames report 25 chunks, 234 geometries and 101 texture
objects. Programs are 81 in A and 82 in B. Each run installs 15 new chunks,
preserves logical state and finishes at the exact same camera position/target.
All GPU queries resolve without disjoint events; disposal reports no errors and
the four tabs close. Shader-primer preparation was 32.8 ms in each candidate.

Four CPU campaigns were verified live before measurement; no extra builds or
tests ran during measured paths. Browser/driver caches and thermal state are
not reset, and no physical device temperature is measured. AB/BA brackets
order effects but does not eliminate those variables or asynchronous far-world
work. GPU queries cover `world.render`, not every upload outside that call.
CPU, GPU and RAF scopes overlap; they must not be added or subtracted as
independent portions of a frame. This is one desktop device and one farm/biome.

`receipt.json` records source-file hashes, order, tab IDs and raw/image hashes.
Run `node docs/qa/streaming-travel-dense/crate-abba/verify.mjs` to verify reports,
camera/fixture/readiness, initial resource counts, summaries and cleanup.
Endpoint images were retained; B1 was inspected without an obvious defect,
which does not prove continuous or multi-angle shadow regression.

Next: investigate work outside the measured render and sustained GPU variation
during movement; keep the first-use fix separate from claims of stable travel.
No production material, asset, save data or rendering behavior was changed.
