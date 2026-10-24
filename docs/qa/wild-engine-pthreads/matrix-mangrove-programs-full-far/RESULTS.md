# App program-retention streaming comparison

Intel UHD, 1280×720, media quality, paused populated game. Two 240m outward/return camera legs per run; exactly 50 chunk installations and 25 final residents. Both use pthreads; A = normal shader lifetime, B = application retainPrograms=1. Same initial fixture and final camera/chunk keys. Sixty warm frames; wait for near, horizon and all far-adapter preparation plus twelve stable frames at each stop. Staged resident-chunk installation disabled.

GPU intervals include pipeline bubbles, sampled every third render; a variable number of frames completes the same work. GPU means are therefore not an independent shader-efficiency claim. Total RAF interval includes waiting and settling. This is not continuous active-simulation performance. 4 runs; inspect memoryBytes in summary for WASM capacity. No unexpected browser errors; known f_environment4 shader warnings remain.

| Biome | Run | RAF mean | p95 | Max | Total RAF | GPU mean | Native sync | Publication | Graphics install |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| manglares | a1 | 28.40 | 82.85 | 133.17 | 4373.39 | 22.54 | 0.00 | 0.70 | 17.10 |
| manglares | b1 | 27.30 | 49.94 | 99.78 | 4423.20 | 21.96 | 0.00 | 0.72 | 16.34 |
| manglares | a2 | 29.21 | 66.53 | 116.44 | 4440.20 | 22.81 | 0.00 | 0.69 | 16.31 |
| manglares | b2 | 27.09 | 49.91 | 116.12 | 4090.59 | 22.99 | 0.00 | 0.67 | 15.81 |

All timings are milliseconds. Raw reports also include admission CPU, worker compute time, sample arrays, hardware identity and matching per-leg inventories.

Application retention is a separate experimental option. Compare repeated tails and total intervals before adopting it; lower isolated shader-call cost alone is insufficient.

| Biome | Pair | RGB MAE /255 | Maximum channel difference |
|---|---|---:|---:|
| manglares | 1 | 0.001096 | 26 |
| manglares | 2 | 0.002969 | 74 |

Screenshots are retained alongside the JSON. Pixel statistics are supplemental evidence; inspect the images, especially cached ground and shadows. No artistic simplifications were made.
