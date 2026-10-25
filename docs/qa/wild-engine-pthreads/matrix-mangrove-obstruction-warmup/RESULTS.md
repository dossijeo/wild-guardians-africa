# Obstruction shader warmup comparison

Intel UHD, 1280×720, media quality, paused populated game. Two 240m outward/return camera legs per run; exactly 50 chunk installations and 25 final residents. Both use pthreads and program retention; A = initial snapshot, B = warmObstruction=1 before snapshot. Same initial fixture and final camera/chunk keys. Sixty warm frames; wait for near, horizon and all far-adapter preparation plus twelve stable frames at each stop. Staged resident-chunk installation disabled.

GPU intervals include pipeline bubbles, sampled every third render; a variable number of frames completes the same work. GPU means are therefore not an independent shader-efficiency claim. Total RAF interval includes waiting and settling. This is not continuous active-simulation performance. 4 runs; inspect memoryBytes in summary for WASM capacity. No unexpected browser errors; known f_environment4 shader warnings remain.

| Biome | Run | RAF mean | p95 | Max | Total RAF | GPU mean | Native sync | Publication | Graphics install |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| manglares | a1 | 26.56 | 49.88 | 99.74 | 4223.72 | 21.84 | 0.00 | 0.72 | 15.14 |
| manglares | b1 | 27.32 | 49.93 | 83.26 | 4289.87 | 22.51 | 0.00 | 0.72 | 16.78 |
| manglares | a2 | 26.44 | 49.92 | 116.33 | 4123.94 | 21.10 | 0.00 | 0.64 | 15.43 |
| manglares | b2 | 26.52 | 49.94 | 116.41 | 4190.55 | 21.17 | 0.00 | 0.66 | 15.85 |

All timings are milliseconds. Raw reports also include admission CPU, worker compute time, sample arrays, hardware identity and matching per-leg inventories.

Inspect paired means, p95, maxima and complete-itinerary time separately: improving average cadence does not guarantee lower worst-frame stalls or earlier scene completion. Native publication removes synchronous generation work, while graphics installation, shader preparation and far-scene adoption retain independent costs. Two pairs per biome are not a statistical guarantee or completion of the whole streaming-stutter objective.

| Biome | Pair | RGB MAE /255 | Maximum channel difference |
|---|---|---:|---:|
| manglares | 1 | 0.000099 | 20 |
| manglares | 2 | 0.000219 | 5 |

Screenshots are retained alongside the JSON. Pixel statistics are supplemental evidence; inspect the images, especially cached ground and shadows. No artistic simplifications were made.
