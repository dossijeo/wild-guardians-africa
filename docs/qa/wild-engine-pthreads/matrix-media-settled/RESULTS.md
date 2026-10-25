# Six-biome pthread streaming comparison

Intel UHD, 1280×720, medium quality, paused populated game. Two 240m outward/return camera legs per run; exactly 50 chunk installations and 25 final residents. A = synchronous native core, B = pthread core. Same initial fixture and final camera/chunk keys. Sixty warm frames; wait for horizon and near streaming plus twelve stable frames at each stop. No program retention or staged graphics installation.

GPU intervals include pipeline bubbles, sampled every third render; a variable number of frames completes the same work. GPU means are therefore not an independent shader-efficiency claim. Total RAF interval includes waiting and settling. This is not continuous active-simulation performance. All 24 runs finish with 16 MiB WASM capacity and no unexpected browser errors; known f_environment4 shader warnings remain.

| Biome | Run | RAF mean | p95 | Max | Total RAF | GPU mean | Native sync | Publication | Graphics install |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| sabana | a1 | 40.12 | 83.06 | 116.38 | 3209.45 | 21.89 | 29.45 | 0.00 | 4.53 |
| sabana | b1 | 29.58 | 66.38 | 132.85 | 3076.47 | 20.73 | 0.00 | 0.78 | 5.05 |
| sabana | a2 | 42.27 | 83.13 | 116.46 | 3508.71 | 24.37 | 30.33 | 0.00 | 4.57 |
| sabana | b2 | 29.74 | 50.01 | 116.81 | 3092.76 | 21.01 | 0.00 | 0.68 | 4.77 |
| desierto | a1 | 28.58 | 49.95 | 84.35 | 2743.99 | 15.60 | 27.50 | 0.00 | 1.39 |
| desierto | b1 | 20.12 | 33.28 | 83.15 | 2776.92 | 14.69 | 0.00 | 0.77 | 1.52 |
| desierto | a2 | 28.63 | 49.92 | 83.15 | 2776.86 | 17.15 | 27.08 | 0.00 | 1.37 |
| desierto | b2 | 20.31 | 33.31 | 83.16 | 2660.39 | 15.01 | 0.00 | 0.75 | 1.40 |
| gran-rio | a1 | 40.20 | 83.01 | 99.76 | 3176.18 | 22.92 | 28.29 | 0.00 | 4.09 |
| gran-rio | b1 | 31.05 | 83.12 | 149.66 | 3042.90 | 22.56 | 0.00 | 0.72 | 4.62 |
| gran-rio | a2 | 40.72 | 83.11 | 99.72 | 3175.98 | 22.70 | 28.55 | 0.00 | 4.27 |
| gran-rio | b2 | 29.97 | 66.51 | 149.73 | 3026.47 | 21.02 | 0.00 | 0.80 | 4.70 |
| volcanes | a1 | 37.21 | 82.97 | 99.76 | 2976.51 | 19.41 | 28.73 | 0.00 | 4.52 |
| volcanes | b1 | 25.09 | 49.91 | 116.33 | 2909.91 | 18.49 | 0.00 | 0.76 | 5.30 |
| volcanes | a2 | 38.30 | 66.57 | 99.81 | 3025.86 | 19.39 | 28.97 | 0.00 | 4.60 |
| volcanes | b2 | 24.44 | 49.99 | 116.39 | 2859.96 | 17.37 | 0.00 | 0.80 | 5.13 |
| manglares | a1 | 56.95 | 99.78 | 149.65 | 4556.29 | 25.50 | 43.30 | 0.00 | 15.36 |
| manglares | b1 | 28.08 | 50.02 | 116.56 | 4240.18 | 21.43 | 0.00 | 0.69 | 16.42 |
| manglares | a2 | 54.29 | 99.79 | 149.78 | 4506.40 | 26.11 | 43.07 | 0.00 | 15.30 |
| manglares | b2 | 28.76 | 66.26 | 132.99 | 4257.08 | 22.14 | 0.00 | 0.68 | 16.40 |
| gran-canon | a1 | 29.33 | 49.91 | 149.63 | 2610.79 | 10.77 | 26.19 | 0.00 | 2.82 |
| gran-canon | b1 | 19.32 | 16.86 | 182.91 | 2859.96 | 8.93 | 0.00 | 0.70 | 3.23 |
| gran-canon | a2 | 29.79 | 49.90 | 166.30 | 2710.55 | 13.55 | 27.27 | 0.00 | 2.91 |
| gran-canon | b2 | 19.40 | 17.07 | 166.58 | 2909.85 | 9.44 | 0.00 | 0.70 | 3.43 |

All timings are milliseconds. Raw reports also include admission CPU, worker compute time, sample arrays, hardware identity and matching per-leg inventories.

Mean frame intervals improve in every biome. Tail behavior is not uniformly better: Gran Rio has larger maximum stalls in both threaded runs, and Gran Canyon takes longer to finish the same itinerary. Mangroves graphics installation remains about 16.4ms/chunk after native publication falls below 0.7ms. These measurements demonstrate removal of synchronous generation stalls, not completion of the whole streaming-stutter objective.

| Biome | Pair | RGB MAE /255 | Maximum channel difference |
|---|---|---:|---:|
| sabana | 1 | 0.000556 | 21 |
| sabana | 2 | 0.001682 | 42 |
| desierto | 1 | 0.000043 | 27 |
| desierto | 2 | 0.000335 | 7 |
| gran-rio | 1 | 0.002674 | 65 |
| gran-rio | 2 | 0.000684 | 19 |
| volcanes | 1 | 0.000326 | 8 |
| volcanes | 2 | 0.000001 | 1 |
| manglares | 1 | 0.000298 | 18 |
| manglares | 2 | 0.000391 | 9 |
| gran-canon | 1 | 0.000016 | 5 |
| gran-canon | 2 | 0.000039 | 2 |

Screenshots are retained alongside the JSON. Pixel statistics are supplemental evidence; inspect the images, especially cached ground and shadows. No artistic simplifications were made.
