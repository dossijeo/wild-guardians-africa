# Pthread-prepared Mangroves bank attributes

Intel UHD, 1280×720, baja quality, paused populated game. Two 240m outward/return camera legs per run; exactly 50 chunk installations and 25 final residents. Both use adopted pthread water maps and otherwise default streaming settings; A = per-vertex main-thread waterInfo, B = waterShoreWorker=1 with exact prepared shore attributes. Same initial fixture and final camera/chunk keys. Sixty warm frames; wait for near, horizon and all far-adapter preparation plus twelve stable frames at each stop. Staged resident-chunk installation disabled.

GPU intervals include pipeline bubbles, sampled every third render; a variable number of frames completes the same work. GPU means are therefore not an independent shader-efficiency claim. Total RAF interval includes waiting and settling. This is not continuous active-simulation performance. 4 runs; inspect memoryBytes in summary for WASM capacity. No unexpected browser errors; known f_environment4 shader warnings remain.

| Biome | Run | RAF mean | p95 | Max | Total RAF | GPU mean | Native sync | Publication | Graphics install |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| manglares | a1 | 24.52 | 49.88 | 83.26 | 4340.13 | 19.23 | 0.00 | 0.79 | 12.22 |
| manglares | b1 | 24.79 | 49.92 | 99.71 | 4140.49 | 19.70 | 0.00 | 0.68 | 10.34 |
| manglares | a2 | 24.85 | 50.00 | 116.39 | 4224.64 | 19.35 | 0.00 | 0.70 | 11.71 |
| manglares | b2 | 24.49 | 49.86 | 83.04 | 4090.58 | 19.27 | 0.00 | 0.70 | 9.94 |

All timings are milliseconds. Raw reports also include admission CPU, worker compute time, sample arrays, hardware identity and matching per-leg inventories.

Inspect paired means, p95, maxima and complete-itinerary time separately: improving average cadence does not guarantee lower worst-frame stalls or earlier scene completion. Native publication removes synchronous generation work, while graphics installation, shader preparation and far-scene adoption retain independent costs. Two pairs per biome are not a statistical guarantee or completion of the whole streaming-stutter objective.

| Biome | Pair | RGB MAE /255 | Maximum channel difference |
|---|---|---:|---:|
| manglares | 1 | 0.000315 | 7 |
| manglares | 2 | 0.000175 | 3 |

Screenshots are retained alongside the JSON. Pixel statistics are supplemental evidence; inspect the images, especially cached ground and shadows. No artistic simplifications were made.
