# Pthread-prepared water material map

Intel UHD, 1280×720, media quality, paused populated game. Two 240m outward/return camera legs per run; exactly 50 chunk installations and 25 final residents. Both use pthreads, batch eviction, retained programs and obstruction warmup; A = main-thread water map, B = waterBedWorker=1 with completed native map. Same initial fixture and final camera/chunk keys. Sixty warm frames; wait for near, horizon and all far-adapter preparation plus twelve stable frames at each stop. Staged resident-chunk installation disabled.

GPU intervals include pipeline bubbles, sampled every third render; a variable number of frames completes the same work. GPU means are therefore not an independent shader-efficiency claim. Total RAF interval includes waiting and settling. This is not continuous active-simulation performance. 4 runs; inspect memoryBytes in summary for WASM capacity. No unexpected browser errors; known f_environment4 shader warnings remain.

| Biome | Run | RAF mean | p95 | Max | Total RAF | GPU mean | Native sync | Publication | Graphics install |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| manglares | a1 | 26.94 | 49.92 | 99.78 | 4040.81 | 21.79 | 0.00 | 0.62 | 15.86 |
| manglares | b1 | 27.57 | 49.91 | 83.19 | 4190.75 | 22.64 | 0.00 | 0.69 | 11.93 |
| manglares | a2 | 27.71 | 49.97 | 83.25 | 4073.97 | 22.31 | 0.00 | 0.69 | 15.55 |
| manglares | b2 | 27.49 | 49.98 | 99.82 | 4040.83 | 22.10 | 0.00 | 0.68 | 11.11 |

All timings are milliseconds. Raw reports also include admission CPU, worker compute time, sample arrays, hardware identity and matching per-leg inventories.

Inspect paired means, p95, maxima and complete-itinerary time separately: improving average cadence does not guarantee lower worst-frame stalls or earlier scene completion. Native publication removes synchronous generation work, while graphics installation, shader preparation and far-scene adoption retain independent costs. Two pairs per biome are not a statistical guarantee or completion of the whole streaming-stutter objective.

| Biome | Pair | RGB MAE /255 | Maximum channel difference |
|---|---|---:|---:|
| manglares | 1 | 0.000244 | 5 |
| manglares | 2 | 0.000320 | 18 |

Screenshots are retained alongside the JSON. Pixel statistics are supplemental evidence; inspect the images, especially cached ground and shadows. No artistic simplifications were made.
