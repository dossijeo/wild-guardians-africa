# Combined streaming reuse comparison

Intel UHD, 1280×720, media quality, paused populated game. Two 240m outward/return camera legs per run; exactly 50 chunk installations and 25 final residents. Both use pthreads; A = individual eviction and normal shader lifetime; B = batch eviction, retained programs and resident obstruction warmup. Same initial fixture and final camera/chunk keys. Sixty warm frames; wait for near, horizon and all far-adapter preparation plus twelve stable frames at each stop. Staged resident-chunk installation disabled.

GPU intervals include pipeline bubbles, sampled every third render; a variable number of frames completes the same work. GPU means are therefore not an independent shader-efficiency claim. Total RAF interval includes waiting and settling. This is not continuous active-simulation performance. 4 runs; inspect memoryBytes in summary for WASM capacity. No unexpected browser errors; known f_environment4 shader warnings remain.

| Biome | Run | RAF mean | p95 | Max | Total RAF | GPU mean | Native sync | Publication | Graphics install |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| manglares | a1 | 28.24 | 49.96 | 99.74 | 4489.74 | 21.93 | 0.00 | 0.74 | 17.36 |
| manglares | b1 | 27.27 | 49.96 | 66.56 | 4090.63 | 21.21 | 0.00 | 0.69 | 16.07 |
| manglares | a2 | 29.10 | 66.54 | 99.78 | 4423.28 | 22.79 | 0.00 | 0.62 | 16.04 |
| manglares | b2 | 29.82 | 66.16 | 83.24 | 4472.99 | 24.23 | 0.00 | 0.74 | 19.16 |

All timings are milliseconds. Raw reports also include admission CPU, worker compute time, sample arrays, hardware identity and matching per-leg inventories.

Inspect paired means, p95, maxima and complete-itinerary time separately: improving average cadence does not guarantee lower worst-frame stalls or earlier scene completion. Native publication removes synchronous generation work, while graphics installation, shader preparation and far-scene adoption retain independent costs. Two pairs per biome are not a statistical guarantee or completion of the whole streaming-stutter objective.

| Biome | Pair | RGB MAE /255 | Maximum channel difference |
|---|---|---:|---:|
| manglares | 1 | 0.001582 | 39 |
| manglares | 2 | 0.001209 | 29 |

Screenshots are retained alongside the JSON. Pixel statistics are supplemental evidence; inspect the images, especially cached ground and shadows. No artistic simplifications were made.
