# Standalone service-proof CPU diagnostics

The new read-only benchmark runs the current experimental helper three times over one retained native snapshot, first cold then twice with the same exact native caches. It records input/source hashes, proof coverage, failures and unchanged serialized state. These are concurrent CPU observations while v105 runs, not controlled performance or GPU/frame-time acceptance. Historical dense farms are evaluated with current code; their historical survival is not replayed or approved.

| Retained input | Living crops / eligible workers | Cold | Warm calls | Coverage |
|---|---:|---:|---:|---|
| v97 Canyon day-six partial state | 123 / 10 | 346.30 ms | 98.71 / 96.85 ms | All workers, all crops and all return routes pass |
| Historical a518 Canyon day-100 state | 2,689 / 1 | 79.78 ms | 3.86 / 2.50 ms | Rejects first worker; zero completed crop checks |

The second row is an early rejection, not evidence that checking 2,689 crops is cheap. Its current bounded service query from `worker-336518` to `plant-703242` is unproven. Do not modify the saved farm or ignore the failed actor to obtain a passing dense benchmark.

The 123-crop results establish that a full native service sweep is appreciably more expensive than a single pivot query. It is a prospective QA planning check, not a frame-loop operation. Before wiring it into repeated contour attempts, investigate cost and geometry-cache reuse while continuing to revalidate moving workers and living crop membership. Avoid stale results after walls, gates, prop suppression, centres or crop layout change.

A separate retained Desert/Mapungubwe state with 2,592 crops and 278 eligible workers is also being measured. It remains a live benchmark, so no timing or complete-coverage result is claimed for it here. Its terminal evidence will be retained before changing the helper. Neither this benchmark nor v105 imports the newly added benchmark tool into gameplay.

## Completed dense Desert v1 measurement

That original measurement has now terminated successfully. All 278 workers and 2,592 crops pass each static proof, and serialized/input-file hashes remain unchanged. Cold CPU time is 156,596.57 ms; the two subsequent warm calls are 175,875.91 and 180,494.22 ms. Cache reuse does not make this complete dense sweep inexpensive. Reject v1 for integration into repeated contour planning at this scale. This negative performance result remains preserved; do not replace it with the much shorter partial rejection in Canyon or claim a GPU gain.

Only after this process terminated was the standalone benchmark extended with an explicit v1/v2 selector. The default remains v1. Existing result files and source hashes remain unchanged. The same dense Desert input is now being tested with the associated-centre v2 candidate; no result is claimed before that run terminates. The campaign's imported sources are untouched.

## Completed dense Desert v2 measurement

The associated-centre v2 measurement has also terminated successfully, with all 278 workers and 2,592 crops checked and unchanged state. Its cold CPU observation is 215,800.96 ms; warm observations are 216,176.42 and 231,469.09 ms. The raw v2 input hash matches v1 exactly. The declared helper and explicit-selector tool hashes differ; native navigation, service geometry and biome-profile hashes match.

This is not a controlled AB/BA causal timing comparison, but both candidates' complete dense sweeps are too expensive for repeated planning. v2 is rejected for such integration as written, despite fixing the independent-centre semantics. Do not claim a speed improvement or replace either result. A cheaper positive connectivity/service proof or exact invalidated reuse must be investigated before promoting the full-perimeter candidate; keep real body, reach, elevation, obstacles, gate and return-route checks.
