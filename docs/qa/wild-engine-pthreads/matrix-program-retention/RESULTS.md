# App program-retention streaming comparison

Intel UHD, 1280×720, media quality, paused populated game. Two 240m outward/return camera legs per run; exactly 50 chunk installations and 25 final residents. Both use pthreads; A = normal shader lifetime, B = application retainPrograms=1. Same initial fixture and final camera/chunk keys. Sixty warm frames; wait for horizon and near streaming plus twelve stable frames at each stop. Staged graphics installation disabled.

GPU intervals include pipeline bubbles, sampled every third render; a variable number of frames completes the same work. GPU means are therefore not an independent shader-efficiency claim. Total RAF interval includes waiting and settling. This is not continuous active-simulation performance. 8 runs; inspect memoryBytes in summary for WASM capacity. No unexpected browser errors; known f_environment4 shader warnings remain.

| Biome | Run | RAF mean | p95 | Max | Total RAF | GPU mean | Native sync | Publication | Graphics install |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| gran-rio | a1 | 33.10 | 83.11 | 133.00 | 3408.82 | 23.40 | 0.00 | 0.82 | 5.43 |
| gran-rio | b1 | 30.20 | 66.45 | 99.97 | 2959.86 | 22.90 | 0.00 | 0.73 | 4.69 |
| gran-rio | a2 | 30.58 | 66.61 | 149.68 | 3026.99 | 21.77 | 0.00 | 0.76 | 4.47 |
| gran-rio | b2 | 30.13 | 83.12 | 116.35 | 3042.98 | 23.55 | 0.00 | 0.77 | 4.69 |
| gran-canon | a1 | 19.10 | 16.92 | 166.42 | 2827.07 | 8.57 | 0.00 | 0.74 | 3.15 |
| gran-canon | b1 | 18.58 | 16.98 | 132.96 | 2693.76 | 9.62 | 0.00 | 0.75 | 2.96 |
| gran-canon | a2 | 19.38 | 17.04 | 166.17 | 2810.18 | 9.03 | 0.00 | 0.81 | 3.09 |
| gran-canon | b2 | 18.82 | 17.01 | 133.03 | 2710.63 | 8.48 | 0.00 | 0.74 | 3.06 |

All timings are milliseconds. Raw reports also include admission CPU, worker compute time, sample arrays, hardware identity and matching per-leg inventories.

Application retention is a separate experimental option. Compare repeated tails and total intervals before adopting it; lower isolated shader-call cost alone is insufficient.

| Biome | Pair | RGB MAE /255 | Maximum channel difference |
|---|---|---:|---:|
| gran-rio | 1 | 0.612527 | 180 |
| gran-rio | 2 | 0.000134 | 8 |
| gran-canon | 1 | 0.000010 | 1 |
| gran-canon | 2 | 0.000002 | 1 |

Screenshots are retained alongside the JSON. Pixel statistics are supplemental evidence; inspect the images, especially cached ground and shadows. No artistic simplifications were made.
