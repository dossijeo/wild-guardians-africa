# Final daylight: idle-host ABAB

Four fresh Mangrove campaigns, seed 712, same fixed camera/time, 1280x720 medium, DOF absent. Local builds and UI runs finished before starting. Each arm waits an additional 15000 ms after resident setup, then 45 warmup frames and 180 complete-draw samples. This is paused resident rendering, not active streaming acceptance.

| Arm | CPU mean ms | GPU mean ms | Presentation mean ms | Presentation P95 ms |
| --- | ---: | ---: | ---: | ---: |
| Original A1 | 3.073 | 18.178 | 20.373 | 24.810 |
| Warm B1 | 3.317 | 19.716 | 21.929 | 28.040 |
| Original A2 | 3.541 | 20.496 | 22.851 | 27.435 |
| Warm B2 | 3.276 | 18.777 | 20.972 | 25.235 |

84 draw calls and 363173 triangles in every recorded arm; no disjoint timer or GL/page errors. Full samples, P99/max and quantiles in manglares.json and summary.json. GPU warm-minus-original reverses sign across pairs (+1.538, -1.719 ms). Mean of arm means: original 19.337, warm 19.246 ms. CPU original 3.307, warm 3.296 ms. These small aggregate differences are below observed run variation; do not claim an optimization or zero cost. No repeatable regression is demonstrated here. The earlier high-drift experiment remains in lighting-final-benchmark, not discarded.

The run did not record adapter identification inside its measured contexts, so this report does not add a new independently verified GPU-model claim. Browser/channel and host are unchanged; no software backend flag was passed. Further scope: no night timing, no all-biome timing matrix, no absence-of-stutter guarantee. Artistic captures are in lighting-final/comparison.html.
