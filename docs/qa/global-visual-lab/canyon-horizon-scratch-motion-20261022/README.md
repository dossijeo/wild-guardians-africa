# Reusable normal scratch: same visual result, less worker work

A/B/A/B real campaign seed712, medium1280x720, 30 warmup RAF frames then 180 frames/192 units along river. Both arms enable smooth normals. A routes the previous Map implementation into the worker; B uses native reusable typed arrays. Recorded scratchBytes is null only for A, confirming the intended implementation ran. Both prepare 103212 vertices/17970 unique positions.

|Run|Normal median ms|Worker delivery median ms|CPU median / p95 ms|RAF p95 / max ms|
|---|---|---|---|---|
|A1|13.2|115.5|4.9 / 6.8|39.2 / 56.2|
|B1|4.6|103.1|5.0 / 7.6|38.1 / 57.3|
|A2|13.2|112.1|5.0 / 6.7|38.2 / 56.6|
|B2|4.5|107.0|5.05 / 7.0|41.8 / 75.0|

Construction improvement repeats; overall frame improvement is NOT demonstrated. B2 has a worse maximum. Sixteen corresponding frames per pair have different triangle residency due to asynchronous delivery. Settled geometry is identical (41 calls/431335 triangles), every endpoint image is pixel-identical across A/B and repeated arms, and there are no captured errors. RAF is not GPU time; GPU timers were not collected. Manual render/paused simulation and short day-only path limit generalization.

Native implementation retains 3622420 bytes (~3.45 MiB) scratch in the worker after first use: integer lookup, vertex IDs, representative offsets and float64 sums. Cleared/reused across jobs, released with worker termination. No allocation when option is unused. Map heap consumption was not measured, so do not claim a memory reduction. GPU storage/shader/draw counts unchanged. Integer/single-height assumptions are checked; range bounded to avoid unbounded dense allocation.

17 targeted tests pass including exact normal equality to the original visual prototype at two origins, unchanged positions/colours/water and existing horizon lifecycle tests. Retain this implementation inside the existing opt-in canyonNormals=smooth path. No default enablement. Next prioritize visible bank/LOD continuity rather than further micro-optimization of this function.

Reproduce with Vite on 5190:
```powershell
$env:WG_REVIEW_BIOMES='gran-canon'
node tools/experiments/benchmark-canyon-horizon-scratch-motion-20261022.mjs
python tools/experiments/summarize-canyon-horizon-scratch-motion-20261022.py
node --test tests/horizon-normals.test.js tests/horizon.test.js tests/horizon-generator.test.js tests/spatial-horizon-data.test.js
```
