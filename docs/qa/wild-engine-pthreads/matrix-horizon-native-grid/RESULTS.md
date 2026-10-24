# Native batched horizon height comparison

Intel UHD, 1280×720, media quality, paused populated game. Two 240m outward/return camera legs per run; exactly 50 chunk installations and 25 final residents. Both use pthreads and batch eviction; A = scalar shore heights, B = horizonBed=native-grid. Program retention disabled. Same initial fixture and final camera/chunk keys. Sixty warm frames; Historical gate waits for near/horizon only plus twelve stable frames; far-background preparation may still be pending. These are not full-scene completion totals. Staged resident-chunk installation disabled.

GPU intervals include pipeline bubbles, sampled every third render; a variable number of frames completes the same work. GPU means are therefore not an independent shader-efficiency claim. Total RAF interval includes waiting and settling. This is not continuous active-simulation performance. 4 runs; inspect memoryBytes in summary for WASM capacity. No unexpected browser errors; known f_environment4 shader warnings remain.

| Biome | Run | RAF mean | p95 | Max | Total RAF | GPU mean | Native sync | Publication | Graphics install |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| gran-canon | a1 | 18.31 | 16.95 | 132.92 | 2710.38 | 8.66 | 0.00 | 0.72 | 3.14 |
| gran-canon | b1 | 17.85 | 16.83 | 83.15 | 2677.31 | 9.33 | 0.00 | 0.72 | 3.15 |
| gran-canon | a2 | 18.50 | 17.22 | 116.40 | 2959.22 | 9.01 | 0.00 | 0.85 | 3.60 |
| gran-canon | b2 | 17.61 | 16.98 | 83.15 | 2677.27 | 8.80 | 0.00 | 0.78 | 3.29 |

All timings are milliseconds. Raw reports also include admission CPU, worker compute time, sample arrays, hardware identity and matching per-leg inventories.

Native grid queries reuse interpolation corners within one call. This remains synchronous main-thread work. Compare complete frame times and image equivalence before adoption.

| Biome | Pair | RGB MAE /255 | Maximum channel difference |
|---|---|---:|---:|
| gran-canon | 1 | 0.000008 | 5 |
| gran-canon | 2 | 0.000011 | 1 |

Screenshots are retained alongside the JSON. Pixel statistics are supplemental evidence; inspect the images, especially cached ground and shadows. No artistic simplifications were made.
