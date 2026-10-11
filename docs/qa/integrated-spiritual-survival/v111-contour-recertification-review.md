# Stopped v111 contour recertification

Campaign v111 remains stopped at the user's request. These are isolated read-only queries on its retained day-9/time-36 snapshot with 178 living crops; no campaign was resumed. Snapshot SHA: a7a7d012f02004f07b9e3f2c22e9d8087ccd0d5f436f80abd1df708a9208ee7e.

`probe-stopped-contour-recertification.mjs` creates native navigation from the saved state, quotes the retained completed contour (zero pieces and updates), measures cold/warm proof calls, and asserts the serialized state remains unchanged. Reports preserve source differences from the original frozen campaign and the tool hash. Timings are sequential observations, **not ABBA statistics, GPU measurements or full-day acceptance**.

| Proof | Cold | Warm | Result |
| --- | ---: | ---: | --- |
| Original native certificate | 33,219 ms | 20,001 ms | native-worker-route-blocked |
| Integrated component reuse and terrain tiles | 10,913 ms | 11,720 ms | native-worker-centre-service-unproven |
| Original certificate with terrain tiles only | 23,375 ms | 12,338 ms | native-worker-route-blocked |

The integrated candidate includes different worker-service checks and attack-anchor logic. Its diagnostic fields therefore cannot be treated as an equivalent speed comparison. Both certificates reject this snapshot, but rejection does not establish a gameplay navigation failure or economic defeat.

The terrain-only comparison isolates the existing exact-value optimization: `compare-contour-recertification.mjs` verifies **every proof field is deeply equal** for both cold and warm calls. Observed reductions are 29.64% and 38.31%. The 22 existing terrain/integration tests pass, including exact surface/slope/fluid values across six biomes and three seeds, boundaries, invalidation, memory bounds and restoration after exceptions. The native geometry/routing checks are not skipped.

Raw reports: `v111-stopped-contour-baseline.json`, `v111-stopped-contour-candidate.json`, `v111-stopped-contour-baseline-tiled.json`; exact comparison: `v111-stopped-contour-exact-comparison.json`.

Even 12 seconds per warmed certification remains unacceptable for frequent player-policy checks in a long campaign. These results do not authorize another 100-night run. Next work must investigate repeated certification of unchanged geometry/targets and the specific worker-route failure while preserving paid defense, native navigation and the distinctions between unproven access, technical failure and defeat.
