# Mangrove deep water retained

The user explicitly prefers the deep blue result to olive. This supersedes the rejection in the previous optical-depth report: preserve this artistic direction and refine it, rather than rejecting its broad uniform interiors.

The native natural-water material now reproduces that QA variant for Mangroves only. Existing moss, shore sediment, geometry, simulation and other biomes are unchanged. Enabled within the existing `visualLab=global-lighting&waterEdges=natural` experiment; stable defaults remain unchanged.

## Reproduction and parity

Run `node tools/experiments/capture-mangrove-deep-water-native-20261022.mjs`. Before means the approved QA shader injected over the old native behavior; after means native implementation. Seed 712, media, 1280x720, three settled cameras, day and night. Five pairs RGB exact; night view 0 differs by two pixels, mean absolute RGB 0.0000177. Calls and triangles match in all pairs. No page/GL errors. See captures.json and audit.json and comparison images.

The shore-material unit test passes. This is visual integration validation, not a new performance benchmark. Relative to olive, the shader adds one read of the existing map and arithmetic, no new texture storage, passes, geometry or draws. GPU/FPS cost is still unmeasured.

## Map limitation and next refinement

The separate map audit shows coverage-derived optical depth saturating near 0.93, 1.05 or 1.17 units over large interiors. For example chunk (1,3) has median and upper quantiles 0.93; 9143/9801 samples lie in 0.9-1.0. These are reusable optical masking values, not physical bathymetry. Do not amplify them to invent interior relief. Future work should improve the visible shore-to-water transition and reflections while retaining the preferred blue and moss. The previous olive remains documented for comparison, not the preferred destination.
