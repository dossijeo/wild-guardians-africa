# Native batched horizon height comparison

Intel UHD, 1280×720, media quality, paused populated game. Two 240m outward/return camera legs per run; exactly 50 chunk installations and 25 final residents. Both use pthreads and batch eviction; A = scalar shore heights, B = horizonBed=native-grid. Program retention disabled. Same initial fixture and final camera/chunk keys. Sixty warm frames; wait for near, horizon and all far-adapter preparation plus twelve stable frames at each stop. Staged resident-chunk installation disabled.

GPU intervals include pipeline bubbles, sampled every third render; a variable number of frames completes the same work. GPU means are therefore not an independent shader-efficiency claim. Total RAF interval includes waiting and settling. This is not continuous active-simulation performance. 4 runs; inspect memoryBytes in summary for WASM capacity. No unexpected browser errors; known f_environment4 shader warnings remain.

| Biome | Run | RAF mean | p95 | Max | Total RAF | GPU mean | Native sync | Publication | Graphics install |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| gran-canon | a1 | 18.19 | 16.96 | 132.98 | 2710.28 | 8.85 | 0.00 | 0.73 | 3.01 |
| gran-canon | b1 | 17.58 | 16.88 | 66.52 | 2760.37 | 9.74 | 0.00 | 0.68 | 3.30 |
| gran-canon | a2 | 18.17 | 16.85 | 116.30 | 2743.69 | 9.35 | 0.00 | 0.67 | 3.17 |
| gran-canon | b2 | 18.13 | 33.15 | 83.10 | 3209.32 | 11.16 | 0.00 | 0.76 | 3.33 |

All timings are milliseconds. Raw reports also include admission CPU, worker compute time, sample arrays, hardware identity and matching per-leg inventories.

Native grid queries reuse interpolation corners within one call. This remains synchronous main-thread work. Compare complete frame times and image equivalence before adoption.

| Biome | Pair | RGB MAE /255 | Maximum channel difference |
|---|---|---:|---:|
| gran-canon | 1 | 0.004119 | 104 |
| gran-canon | 2 | 0.002479 | 64 |

Screenshots are retained alongside the JSON. Pixel statistics are supplemental evidence; inspect the images, especially cached ground and shadows. No artistic simplifications were made.
