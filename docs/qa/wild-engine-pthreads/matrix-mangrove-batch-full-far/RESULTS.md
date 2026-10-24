# Batched native eviction comparison

Intel UHD, 1280×720, media quality, paused populated game. Two 240m outward/return camera legs per run; exactly 50 chunk installations and 25 final residents. Both use pthreads; A = individual eviction, B = chunkEviction=batch. Program retention disabled. Same initial fixture and final camera/chunk keys. Sixty warm frames; wait for near, horizon and all far-adapter preparation plus twelve stable frames at each stop. Staged resident-chunk installation disabled.

GPU intervals include pipeline bubbles, sampled every third render; a variable number of frames completes the same work. GPU means are therefore not an independent shader-efficiency claim. Total RAF interval includes waiting and settling. This is not continuous active-simulation performance. 4 runs; inspect memoryBytes in summary for WASM capacity. No unexpected browser errors; known f_environment4 shader warnings remain.

| Biome | Run | RAF mean | p95 | Max | Total RAF | GPU mean | Native sync | Publication | Graphics install |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| manglares | a1 | 29.13 | 66.60 | 99.84 | 4456.49 | 22.43 | 0.00 | 0.66 | 15.80 |
| manglares | b1 | 28.67 | 66.43 | 100.12 | 4473.05 | 23.02 | 0.00 | 0.74 | 16.41 |
| manglares | a2 | 29.34 | 66.49 | 116.36 | 4605.92 | 22.71 | 0.00 | 0.75 | 17.39 |
| manglares | b2 | 29.58 | 66.47 | 116.44 | 4406.86 | 22.76 | 0.00 | 0.71 | 16.43 |

All timings are milliseconds. Raw reports also include admission CPU, worker compute time, sample arrays, hardware identity and matching per-leg inventories.

Batch eviction is an opt-in experiment; raw reports separate individual removal and batch CPU times. Compare tails and complete itinerary before adoption.

| Biome | Pair | RGB MAE /255 | Maximum channel difference |
|---|---|---:|---:|
| manglares | 1 | 0.001532 | 38 |
| manglares | 2 | 0.004320 | 109 |

Screenshots are retained alongside the JSON. Pixel statistics are supplemental evidence; inspect the images, especially cached ground and shadows. No artistic simplifications were made.
