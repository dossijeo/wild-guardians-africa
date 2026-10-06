# Native far layer GPU comparison

The opt-in Sabana fixture uses seed 712, Mapungubwe and medium quality. The native world retains 25 chunks; the experimental layer contains 646 acacias and one regional ground mesh. This is a draw-cost comparison, not evidence of a completed horizon system.

The fixture alternates baseline / enabled / enabled / baseline (ABBA). Each lot warms up for 20 frames and measures 90 frames with asynchronous GPU timer queries. Camera and simulation are fixed. The baseline hides both far vegetation and far ground and restores native color coverage. It keeps the same fog and loaded resources to isolate the additional representation. Native draw distance is unchanged.

| Run | Baseline GPU mean | Enabled GPU mean | Difference |
| --- | ---: | ---: | ---: |
| First | 20.905 ms | 21.774 ms | +0.870 ms / 4.16% |
| Second | 23.407 ms | 25.404 ms | +1.997 ms / 8.53% |

Both runs have 360 resolved GPU samples, no disjoint events, query skips or allocation failures, no pending queries, unchanged camera/simulation and no extra native GPU preparations during the measured lots. The page reports no runtime errors and WebGL error 0. Console captures retain existing ANGLE shader warnings.

Both comparisons add two draw calls (59 to 61) and 25,912 submitted triangles (960,014 to 985,926), including the regional ground. The second run records Intel UHD Graphics through ANGLE D3D11, a 1280 × 720 viewport and a 1600 × 900 drawing buffer; it was not hidden during measurement. The first run predates device/visibility reporting.

The different timings show run-to-run variation. CPU campaign processes were running concurrently, so CPU submission and RAF interval values are diagnostic only. These results do not establish a mobile budget, RAM reduction, FPS gain, or visually identical cost. They also exclude the additional fog's cost relative to the ordinary game, resource loading and moving-camera regional preparation. The experiment remains disabled in ordinary gameplay.

`first.json` and `second.json` retain individual GPU samples and lot statistics. `summary.json` contains the derived means. Screenshots show the enabled scene after the benchmark; console files retain warnings/errors. Eighteen focused ground, layer and GPU timer tests pass.

Next validation: reduce unnecessary atlas sampling, match the native LOD used in the transition band, test lighting transitions and moving-camera behavior, and measure the eventual near-distance reduction separately before enabling the system in normal play.
