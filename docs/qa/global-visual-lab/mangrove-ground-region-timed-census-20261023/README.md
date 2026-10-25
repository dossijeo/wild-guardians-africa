# Draw census diagnostic (not a performance benchmark)

Instrumentation records draw paths, target sizes, geometry/material IDs, calls and triangles. IDs are process-local; compare semantic paths and draw multisets instead.

The first census (four day runs, census mode, 150 samples after 180 warmup) did not reproduce the workload discrepancy. It is not evidence that the low-quality timing runs were equivalent.

The timed census additionally enables whole-frame GPU queries and day/night, 240 samples after 180 warmup. Its first four records used a mutable per-frame draw list that could retain later asynchronous submissions during the query drain. A fix copies and closes the census at the end of each frame. Records five onward use the corrected census. The audit checks the sum of census calls/triangles against the frame counters and reports invalid censuses explicitly; these are not evidence about a subsystem. Keep raw data intact.

The census adds CPU work and changes scheduling. Do not use its timings as an optimization claim. The accepted performance series remains the medium-quality region-long experiment. Low-quality exact-workload differences are still under investigation unless a later report explicitly closes them.

Reproduce using the standard hybrid runner, WG_DRAW_CENSUS=1, WG_MODES=frame, WG_COVER_QUALITY=baja, WG_FRAME_STEP=0.03333333333333333 and WG_VARIANT_SEQUENCE=base,region,base,region. Audit with tools/experiments/audit-mangrove-draw-census-20261023.py.

Raw data is published as lossless benchmarks.json.gz; the local uncompressed JSON is retained. Decompress before using the census auditor.

## Attribution from corrected records 5–8

Run `python tools/experiments/audit-mangrove-draw-census-20261023.py <folder> 4`.
All 960 corrected frame censuses sum exactly to their frame call/triangle counters. The comparison identifies:

- Day frame 101: equal calls and triangles, but a 460-triangle draw moves from `Scene/native-tree-standby/Mesh` to `Scene/native_merged_assets/native-obstruction-blend`.
- Day and night frame 108: candidate has one fewer draw / 708 triangles, specifically `Scene/native-tree-standby/Mesh`.
- No other draw-multiset differences in these corrected comparisons.

This attributes the reproduced 708-triangle discrepancy to native background standby submission. It does not attribute the historical 1059-triangle and four-call differences, which did not recur here. `attach-native-far-world.js` asynchronously prepares native standby geometry as the camera changes; tracing its readiness and bank publication is the next step. Do not infer that the cached material itself drops geometry, and do not treat instrumentation-heavy census timings as performance evidence. Low-quality long timings remain provisional; medium-quality strict ABAB remains valid.
