# Six-biome pthread streaming comparison

Intel UHD, 1280×720, media quality, paused populated game. Two 240m outward/return camera legs per run; exactly 50 chunk installations and 25 final residents. A = synchronous native core, B = pthread core; program retention disabled. Same initial fixture and final camera/chunk keys. Sixty warm frames; wait for near, horizon and all far-adapter preparation plus twelve stable frames at each stop. Staged resident-chunk installation disabled.

GPU intervals include pipeline bubbles, sampled every third render; a variable number of frames completes the same work. GPU means are therefore not an independent shader-efficiency claim. Total RAF interval includes waiting and settling. This is not continuous active-simulation performance. 24 runs; inspect memoryBytes in summary for WASM capacity. No unexpected browser errors; known f_environment4 shader warnings remain.

| Biome | Run | RAF mean | p95 | Max | Total RAF | GPU mean | Native sync | Publication | Graphics install |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| sabana | a1 | 37.27 | 83.15 | 116.45 | 4472.90 | 22.46 | 32.51 | 0.00 | 5.10 |
| sabana | b1 | 26.75 | 49.94 | 132.99 | 3824.69 | 19.77 | 0.00 | 0.73 | 4.66 |
| sabana | a2 | 33.53 | 66.55 | 99.77 | 3990.65 | 20.72 | 29.27 | 0.00 | 4.63 |
| sabana | b2 | 27.97 | 49.90 | 166.34 | 4307.05 | 20.93 | 0.00 | 0.78 | 5.89 |
| desierto | a1 | 25.85 | 49.91 | 83.10 | 3076.39 | 16.21 | 25.92 | 0.00 | 1.29 |
| desierto | b1 | 20.64 | 33.31 | 116.65 | 3075.63 | 15.52 | 0.00 | 0.80 | 1.63 |
| desierto | a2 | 27.62 | 49.92 | 99.72 | 3093.19 | 16.12 | 27.85 | 0.00 | 1.39 |
| desierto | b2 | 19.96 | 33.28 | 99.63 | 2993.27 | 14.94 | 0.00 | 0.77 | 1.57 |
| gran-rio | a1 | 30.58 | 66.54 | 99.76 | 4739.24 | 20.07 | 30.45 | 0.00 | 4.50 |
| gran-rio | b1 | 28.27 | 66.60 | 149.66 | 3957.57 | 20.72 | 0.00 | 0.80 | 4.69 |
| gran-rio | a2 | 35.04 | 83.13 | 116.78 | 4240.28 | 22.66 | 30.25 | 0.00 | 4.57 |
| gran-rio | b2 | 28.36 | 50.14 | 166.03 | 4140.66 | 21.39 | 0.00 | 0.76 | 5.31 |
| volcanes | a1 | 31.73 | 66.47 | 116.37 | 3807.80 | 18.43 | 29.49 | 0.00 | 5.08 |
| volcanes | b1 | 23.57 | 49.89 | 116.48 | 3841.29 | 17.36 | 0.00 | 0.71 | 5.71 |
| volcanes | a2 | 30.26 | 50.04 | 99.78 | 3691.43 | 17.87 | 28.06 | 0.00 | 4.67 |
| volcanes | b2 | 23.36 | 49.90 | 132.95 | 3691.67 | 17.98 | 0.00 | 0.75 | 5.07 |
| manglares | a1 | 53.04 | 116.38 | 149.64 | 5038.81 | 26.59 | 44.75 | 0.00 | 15.74 |
| manglares | b1 | 29.53 | 66.36 | 99.76 | 4606.21 | 22.82 | 0.00 | 0.69 | 17.23 |
| manglares | a2 | 49.54 | 99.67 | 216.14 | 4805.83 | 27.53 | 40.84 | 0.00 | 14.88 |
| manglares | b2 | 28.66 | 66.67 | 116.47 | 4556.18 | 22.76 | 0.00 | 0.70 | 16.23 |
| gran-canon | a1 | 26.70 | 49.81 | 166.04 | 2909.88 | 9.85 | 27.01 | 0.00 | 2.85 |
| gran-canon | b1 | 18.97 | 17.01 | 182.69 | 2827.00 | 8.55 | 0.00 | 0.70 | 3.42 |
| gran-canon | a2 | 29.58 | 49.99 | 165.80 | 3076.27 | 11.01 | 28.96 | 0.00 | 3.00 |
| gran-canon | b2 | 18.82 | 16.87 | 166.31 | 2860.26 | 8.89 | 0.00 | 0.76 | 3.38 |

All timings are milliseconds. Raw reports also include admission CPU, worker compute time, sample arrays, hardware identity and matching per-leg inventories.

Inspect paired means, p95, maxima and complete-itinerary time separately: improving average cadence does not guarantee lower worst-frame stalls or earlier scene completion. Native publication removes synchronous generation work, while graphics installation, shader preparation and far-scene adoption retain independent costs. Two pairs per biome are not a statistical guarantee or completion of the whole streaming-stutter objective.

| Biome | Pair | RGB MAE /255 | Maximum channel difference |
|---|---|---:|---:|
| sabana | 1 | 0.002263 | 56 |
| sabana | 2 | 0.000662 | 21 |
| desierto | 1 | 0.000707 | 26 |
| desierto | 2 | 0.003574 | 89 |
| gran-rio | 1 | 0.000103 | 21 |
| gran-rio | 2 | 0.000219 | 20 |
| volcanes | 1 | 0.000195 | 23 |
| volcanes | 2 | 0.001557 | 42 |
| manglares | 1 | 0.004270 | 105 |
| manglares | 2 | 0.005075 | 128 |
| gran-canon | 1 | 0.000000 | 0 |
| gran-canon | 2 | 0.000628 | 15 |

Screenshots are retained alongside the JSON. Pixel statistics are supplemental evidence; inspect the images, especially cached ground and shadows. No artistic simplifications were made.
