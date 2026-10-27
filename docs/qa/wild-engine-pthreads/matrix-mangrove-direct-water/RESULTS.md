# Direct wetland-mask water preparation

Intel UHD, 1280×720, media quality, paused populated game. Two 240m outward/return camera legs per run; exactly 50 chunk installations and 25 final residents. Both use pthreads, batch eviction, retained programs and obstruction warmup; A = composite waterInfo queries, B = direct wetland mask. Same initial fixture and final camera/chunk keys. Sixty warm frames; wait for near, horizon and all far-adapter preparation plus twelve stable frames at each stop. Staged resident-chunk installation disabled.

GPU intervals include pipeline bubbles, sampled every third render; a variable number of frames completes the same work. GPU means are therefore not an independent shader-efficiency claim. Total RAF interval includes waiting and settling. This is not continuous active-simulation performance. 4 runs; inspect memoryBytes in summary for WASM capacity. No unexpected browser errors; known f_environment4 shader warnings remain.

| Biome | Run | RAF mean | p95 | Max | Total RAF | GPU mean | Native sync | Publication | Graphics install |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| manglares | a1 | 27.38 | 49.93 | 83.15 | 4024.13 | 22.22 | 0.00 | 0.72 | 16.45 |
| manglares | b1 | 27.64 | 50.02 | 82.86 | 4090.27 | 21.87 | 0.00 | 0.70 | 15.65 |
| manglares | a2 | 28.91 | 50.15 | 99.74 | 4423.35 | 22.99 | 0.00 | 0.75 | 17.80 |
| manglares | b2 | 28.05 | 50.06 | 83.29 | 4123.11 | 22.46 | 0.00 | 0.70 | 15.56 |

All timings are milliseconds. Raw reports also include admission CPU, worker compute time, sample arrays, hardware identity and matching per-leg inventories.

Inspect paired means, p95, maxima and complete-itinerary time separately: improving average cadence does not guarantee lower worst-frame stalls or earlier scene completion. Native publication removes synchronous generation work, while graphics installation, shader preparation and far-scene adoption retain independent costs. Two pairs per biome are not a statistical guarantee or completion of the whole streaming-stutter objective.

| Biome | Pair | RGB MAE /255 | Maximum channel difference |
|---|---|---:|---:|
| manglares | 1 | 0.000310 | 7 |
| manglares | 2 | 0.000457 | 12 |

Screenshots are retained alongside the JSON. Pixel statistics are supplemental evidence; inspect the images, especially cached ground and shadows. No artistic simplifications were made.
