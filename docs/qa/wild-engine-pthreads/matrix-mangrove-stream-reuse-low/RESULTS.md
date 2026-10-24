# Combined streaming reuse comparison

Intel UHD, 1280×720, baja quality, paused populated game. Two 240m outward/return camera legs per run; exactly 50 chunk installations and 25 final residents. Both use pthreads; A = individual eviction and normal shader lifetime; B = batch eviction, retained programs and resident obstruction warmup. Same initial fixture and final camera/chunk keys. Sixty warm frames; wait for near, horizon and all far-adapter preparation plus twelve stable frames at each stop. Staged resident-chunk installation disabled.

GPU intervals include pipeline bubbles, sampled every third render; a variable number of frames completes the same work. GPU means are therefore not an independent shader-efficiency claim. Total RAF interval includes waiting and settling. This is not continuous active-simulation performance. 4 runs; inspect memoryBytes in summary for WASM capacity. No unexpected browser errors; known f_environment4 shader warnings remain.

| Biome | Run | RAF mean | p95 | Max | Total RAF | GPU mean | Native sync | Publication | Graphics install |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| manglares | a1 | 24.79 | 49.92 | 99.68 | 4140.40 | 19.24 | 0.00 | 0.71 | 16.38 |
| manglares | b1 | 23.64 | 33.44 | 66.53 | 3924.35 | 18.75 | 0.00 | 0.70 | 16.84 |
| manglares | a2 | 24.74 | 49.86 | 83.36 | 4057.45 | 18.75 | 0.00 | 0.71 | 15.91 |
| manglares | b2 | 24.05 | 49.76 | 83.14 | 4256.88 | 19.65 | 0.00 | 0.69 | 17.30 |

All timings are milliseconds. Raw reports also include admission CPU, worker compute time, sample arrays, hardware identity and matching per-leg inventories.

Inspect paired means, p95, maxima and complete-itinerary time separately: improving average cadence does not guarantee lower worst-frame stalls or earlier scene completion. Native publication removes synchronous generation work, while graphics installation, shader preparation and far-scene adoption retain independent costs. Two pairs per biome are not a statistical guarantee or completion of the whole streaming-stutter objective.

| Biome | Pair | RGB MAE /255 | Maximum channel difference |
|---|---|---:|---:|
| manglares | 1 | 0.000281 | 5 |
| manglares | 2 | 0.000522 | 13 |

Screenshots are retained alongside the JSON. Pixel statistics are supplemental evidence; inspect the images, especially cached ground and shadows. No artistic simplifications were made.
