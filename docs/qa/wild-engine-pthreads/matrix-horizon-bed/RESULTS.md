# Incremental horizon shore preparation

Intel UHD, 1280×720, media quality, paused populated game. Two 240m outward/return camera legs per run; exactly 50 chunk installations and 25 final residents. Both use pthreads and batch eviction; A = synchronous shore preparation, B = horizonBed=staged with 2ms budget. Program retention disabled. Same initial fixture and final camera/chunk keys. Sixty warm frames; wait for horizon and near streaming plus twelve stable frames at each stop. Staged resident-chunk installation disabled.

GPU intervals include pipeline bubbles, sampled every third render; a variable number of frames completes the same work. GPU means are therefore not an independent shader-efficiency claim. Total RAF interval includes waiting and settling. This is not continuous active-simulation performance. 4 runs; inspect memoryBytes in summary for WASM capacity. No unexpected browser errors; known f_environment4 shader warnings remain.

| Biome | Run | RAF mean | p95 | Max | Total RAF | GPU mean | Native sync | Publication | Graphics install |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| gran-canon | a1 | 18.40 | 16.93 | 132.89 | 2760.22 | 8.68 | 0.00 | 0.69 | 3.26 |
| gran-canon | b1 | 17.05 | 16.81 | 66.58 | 3990.56 | 8.30 | 0.00 | 0.61 | 2.74 |
| gran-canon | a2 | 18.23 | 17.01 | 116.39 | 2643.83 | 9.06 | 0.00 | 0.72 | 2.97 |
| gran-canon | b2 | 17.19 | 16.83 | 83.01 | 4057.04 | 8.82 | 0.00 | 0.68 | 2.70 |

All timings are milliseconds. Raw reports also include admission CPU, worker compute time, sample arrays, hardware identity and matching per-leg inventories.

Incremental shore preparation trades main-thread burst size for horizon adoption latency. Inspect total itinerary as well as frame tails; no lower material resolution or altered lighting is used.

| Biome | Pair | RGB MAE /255 | Maximum channel difference |
|---|---|---:|---:|
| gran-canon | 1 | 0.005348 | 136 |
| gran-canon | 2 | 0.005499 | 140 |

Screenshots are retained alongside the JSON. Pixel statistics are supplemental evidence; inspect the images, especially cached ground and shadows. No artistic simplifications were made.
