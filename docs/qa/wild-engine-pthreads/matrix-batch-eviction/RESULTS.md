# Batched native eviction comparison

Intel UHD, 1280×720, media quality, paused populated game. Two 240m outward/return camera legs per run; exactly 50 chunk installations and 25 final residents. Both use pthreads; A = individual eviction, B = chunkEviction=batch. Program retention disabled. Same initial fixture and final camera/chunk keys. Sixty warm frames; wait for horizon and near streaming plus twelve stable frames at each stop. Staged graphics installation disabled.

GPU intervals include pipeline bubbles, sampled every third render; a variable number of frames completes the same work. GPU means are therefore not an independent shader-efficiency claim. Total RAF interval includes waiting and settling. This is not continuous active-simulation performance. 4 runs; inspect memoryBytes in summary for WASM capacity. No unexpected browser errors; known f_environment4 shader warnings remain.

| Biome | Run | RAF mean | p95 | Max | Total RAF | GPU mean | Native sync | Publication | Graphics install |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| gran-canon | a1 | 19.20 | 16.98 | 182.99 | 2860.14 | 8.69 | 0.00 | 0.78 | 3.27 |
| gran-canon | b1 | 18.81 | 33.18 | 116.52 | 2727.03 | 8.93 | 0.00 | 0.72 | 3.40 |
| gran-canon | a2 | 18.82 | 16.95 | 166.30 | 2859.96 | 9.06 | 0.00 | 0.78 | 3.39 |
| gran-canon | b2 | 18.18 | 16.88 | 116.39 | 2727.20 | 9.14 | 0.00 | 0.76 | 3.05 |

All timings are milliseconds. Raw reports also include admission CPU, worker compute time, sample arrays, hardware identity and matching per-leg inventories.

Batch eviction is an opt-in experiment; raw reports separate individual removal and batch CPU times. Compare tails and complete itinerary before adoption.

| Biome | Pair | RGB MAE /255 | Maximum channel difference |
|---|---|---:|---:|
| gran-canon | 1 | 0.000000 | 0 |
| gran-canon | 2 | 0.000011 | 1 |

Screenshots are retained alongside the JSON. Pixel statistics are supplemental evidence; inspect the images, especially cached ground and shadows. No artistic simplifications were made.
