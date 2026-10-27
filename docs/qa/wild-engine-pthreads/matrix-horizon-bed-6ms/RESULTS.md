# Incremental horizon shore preparation

Intel UHD, 1280×720, media quality, paused populated game. Two 240m outward/return camera legs per run; exactly 50 chunk installations and 25 final residents. Both use pthreads and batch eviction; A = synchronous shore preparation, B = horizonBed=staged with 6ms budget. Program retention disabled. Same initial fixture and final camera/chunk keys. Sixty warm frames; wait for horizon and near streaming plus twelve stable frames at each stop. Staged resident-chunk installation disabled.

GPU intervals include pipeline bubbles, sampled every third render; a variable number of frames completes the same work. GPU means are therefore not an independent shader-efficiency claim. Total RAF interval includes waiting and settling. This is not continuous active-simulation performance. 4 runs; inspect memoryBytes in summary for WASM capacity. No unexpected browser errors; known f_environment4 shader warnings remain.

| Biome | Run | RAF mean | p95 | Max | Total RAF | GPU mean | Native sync | Publication | Graphics install |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| gran-canon | a1 | 18.25 | 17.09 | 116.26 | 2811.01 | 9.06 | 0.00 | 0.67 | 3.07 |
| gran-canon | b1 | 17.41 | 16.91 | 82.92 | 2959.79 | 8.11 | 0.00 | 0.72 | 2.90 |
| gran-canon | a2 | 18.26 | 16.91 | 132.90 | 2793.83 | 8.32 | 0.00 | 0.71 | 3.13 |
| gran-canon | b2 | 18.59 | 33.20 | 116.35 | 3308.95 | 11.14 | 0.00 | 0.71 | 3.55 |

All timings are milliseconds. Raw reports also include admission CPU, worker compute time, sample arrays, hardware identity and matching per-leg inventories.

Incremental shore preparation trades main-thread burst size for horizon adoption latency. Inspect total itinerary as well as frame tails; no lower material resolution or altered lighting is used.

| Biome | Pair | RGB MAE /255 | Maximum channel difference |
|---|---|---:|---:|
| gran-canon | 1 | 0.000458 | 12 |
| gran-canon | 2 | 0.003200 | 82 |

Screenshots are retained alongside the JSON. Pixel statistics are supplemental evidence; inspect the images, especially cached ground and shadows. No artistic simplifications were made.
