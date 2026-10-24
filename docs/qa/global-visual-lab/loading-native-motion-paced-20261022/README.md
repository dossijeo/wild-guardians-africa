# Native loading motion benchmark - inconclusive timing comparison

Intel UHD / ANGLE D3D11, Chrome headless, 1280x720, native loadingBeam=diffuse, seed 712, four maize plants at progress .75. No art QA routes. Two series of 768 valid GPU timer queries each: serial polling, then RAF-paced pipelined collection. ABBA natural cache / forced shadow refresh, 30 warmup frames and 24 measured frames per block. No disjoint or JS errors.

| Phase | Motion | Natural GPU block medians ms | Natural CPU median ms | Draws | Triangles |
|---|---|---|---|---|---|
| day | static | 3.524, 6.856 | 1.100 | [6] | [16002] |
| day | wind | 7.079, 6.407 | 1.100 | [7] | [29882] |
| day | orbit | 3.475, 7.020 | 1.000 | [7] | [29882] |
| day | both | 3.482, 5.139 | 1.000 | [7] | [29882] |
| night | static | 7.608, 3.839 | 1.100 | [6] | [16002] |
| night | wind | 5.283, 5.948 | 1.200 | [7] | [29882] |
| night | orbit | 7.814, 8.500 | 1.100 | [7] | [29882] |
| night | both | 4.251, 8.554 | 1.100 | [7] | [29882] |

## Conclusions

The cache reliably avoids one shadow draw and 13880 processed triangles in an unchanged pose. Wind, camera-relative light rotation, or both invalidate the depth and restore 7 draws / 29882 triangles. This is expected work preserving animated/aligned shadows, not a quality reduction. Native day/night cached-versus-refreshed screenshots are pixel-identical in ../loading-native-shadow-equivalence-20261022.

GPU timing is not stable enough for an optimization decision. Identical natural-cache block medians differ by up to roughly 2x in both collection methods. Forced refresh sometimes appears faster despite doing more work, contradicting a causal interpretation of the aggregate medians. Changing serial waits to RAF pacing did not resolve the drift. Frequency changes, scheduling or other system effects are possible but not established. Six partial GPU utilization observations from the first series report one active 3D PID; process ownership and full-run isolation were not captured, so they neither prove nor exclude contention. No repeated retesting until a stronger control or attribution method is available.

CPU render submission medians are around 0.5 ms in this fixture; query waits are excluded. Neither GPU queries nor RAF intervals establish playable FPS or load duration. This is an attribution study of shadow refresh within the native diffuse version, not a performance comparison against the original simpler loading screen. Keep the visual candidate; do not discard it or claim an FPS win based on this run.

Reproduce: node tools/experiments/benchmark-loading-native-motion-20261022.mjs; node tools/experiments/benchmark-loading-native-motion-paced-20261022.mjs; python tools/experiments/summarize-loading-native-motion-20261022.py. Vite port 5190. Capture equivalence with node tools/experiments/capture-loading-native-shadow-equivalence-20261022.mjs. Timings still require better control before a release budget can be stated.
