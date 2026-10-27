# Actual 1024 versus 2048 shadow-map cost

Same open fern geometry and density; both cast shadows. Intel UHD, medium, 1280×720, populated paused campaign, full background, 8 m camera movement. A/B/A/B; 60 warmup + 90 valid GPU queries and separate 60 + 90 cadence frames per condition. Actual sceneAudit sizes verified, unlike the historical hardcoded cardStudy label.

| Run | Map | Phase | GPU mean ms | CPU render mean ms | Cadence mean ms | Cadence p95 ms |
|---|---:|---|---:|---:|---:|---:|
| 1 | 1024 | day | 23.469 | 9.057 | 29.961 | 37.400 |
| 2 | 1024 | night | 24.626 | 8.906 | 30.589 | 38.300 |
| 3 | 2048 | day | 24.381 | 9.190 | 30.404 | 37.200 |
| 4 | 2048 | night | 26.050 | 9.136 | 32.827 | 43.100 |
| 5 | 1024 | day | 23.416 | 9.390 | 32.319 | 39.000 |
| 6 | 1024 | night | 26.136 | 8.048 | 28.690 | 34.500 |
| 7 | 2048 | day | 22.879 | 8.377 | 29.530 | 35.800 |
| 8 | 2048 | night | 23.407 | 8.361 | 28.610 | 33.600 |

## Interpretation
GPU deltas B−A: day +0.912 / −0.537 ms; night +1.424 / −2.729 ms. Signs reverse between repetitions. This does not establish a stable cost or a performance advantage. Keep 2048 as the visually preferred candidate; more controlled repetitions and low-profile evaluation are needed before setting a default. Do not discard its visible shadows on this evidence.

All eight runs passed state-unchanged, query validity, WebGL error and camera/device/resolution checks. Geometry is identical for all cadence repeat frames. Four GPU frames in the 1024 night repeat differ by at most 1059 triangles (0.00359% aggregate absolute difference), and some 1024 draw sequences vary. These are not perfectly identical workload repetitions. GPU data and frame cadence are separate intervals; do not subtract one from the other to infer wait time. Renderer memory counts are equal on repeats but do not measure bytes or reflect the quadrupled shadow texture area. No actual VRAM claim.

See ../holly-fern-shadow-actual2048-20261023/README.md for the resolution-label correction and native artistic comparisons. Main is untouched.
