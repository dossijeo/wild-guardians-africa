# Standalone service-proof CPU diagnostics

The new read-only benchmark runs the current experimental helper three times over one retained native snapshot, first cold then twice with the same exact native caches. It records input/source hashes, proof coverage, failures and unchanged serialized state. These are concurrent CPU observations while v105 runs, not controlled performance or GPU/frame-time acceptance. Historical dense farms are evaluated with current code; their historical survival is not replayed or approved.

| Retained input | Living crops / eligible workers | Cold | Warm calls | Coverage |
|---|---:|---:|---:|---|
| v97 Canyon day-six partial state | 123 / 10 | 346.30 ms | 98.71 / 96.85 ms | All workers, all crops and all return routes pass |
| Historical a518 Canyon day-100 state | 2,689 / 1 | 79.78 ms | 3.86 / 2.50 ms | Rejects first worker; zero completed crop checks |

The second row is an early rejection, not evidence that checking 2,689 crops is cheap. Its current bounded service query from `worker-336518` to `plant-703242` is unproven. Do not modify the saved farm or ignore the failed actor to obtain a passing dense benchmark.

The 123-crop results establish that a full native service sweep is appreciably more expensive than a single pivot query. It is a prospective QA planning check, not a frame-loop operation. Before wiring it into repeated contour attempts, investigate cost and geometry-cache reuse while continuing to revalidate moving workers and living crop membership. Avoid stale results after walls, gates, prop suppression, centres or crop layout change.

A separate retained Desert/Mapungubwe state with 2,592 crops and 278 eligible workers is also being measured. It remains a live benchmark, so no timing or complete-coverage result is claimed for it here. Its terminal evidence will be retained before changing the helper. Neither this benchmark nor v105 imports the newly added benchmark tool into gameplay.
