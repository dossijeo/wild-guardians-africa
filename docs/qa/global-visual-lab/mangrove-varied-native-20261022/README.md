# Native opt-in varied Mangrove distribution

Add mangroveDistribution=varied to reviewed Mangrove URL (requires visualLab=global-lighting and Mangrove biome; continuous grass enabled). Existing original distribution and closure recipe unchanged. Retains candidate native-range leaf size, spatial size variation and0.65 within-cell jitter. Geometry, texture samplers, water/moss, engine state and exclusions unchanged; accepted instance counts may differ at edges. Noise evaluated only while preparing cached tiles.

All12 native versus routed-QA screenshots RGB exact. Six final native poses also have identical calls/triangles. First two daytime warmup records differ by one draw/5641 triangles despite identical pixels: cause not isolated, do not use warmup draw totals for performance claims. No recorded page/GL errors; audit reports distribution=varied. Six targeted tests pass: original default, explicit flag, coverage events/disposal, River/Mangrove neighboring water invalidation and authored leaf LOD preservation.

Measured QA cost remains explicit: daytime GPU +0.61..1.85ms, night -0.53..0.67ms in fixed-camera ABAB; CPU mixed. See ../mangrove-spatial-jitter-cost-20261022. Candidate camera-motion recordings in ../mangrove-spatial-jitter-motion-20261022. Those timings exclude tile-generation noise cost and are not active gameplay FPS.

Available for review, not selected as final biome treatment. Broad homogeneous regions remain; do not equate successful integration with completed art target. Reproduce native captures: node tools/experiments/capture-mangrove-varied-native-20261022.mjs with Vite5190. The native source path no longer requires QA module replacement.


## 2026-10-22: user rejects reduced leaf presence

The user rejects mangroveDistribution=varied: leaves lose too much apparent density and volume. This supersedes earlier positive artistic assessments. Keep the dense original in the selected recipe. The optional variant remains only as rejected experimental history, not a final candidate. Further distribution work must preserve original leaf size and growth response; isolate positional/orientation changes instead of reducing coverage. The completed low-quality benchmark measures this rejected option and does not justify adoption.
