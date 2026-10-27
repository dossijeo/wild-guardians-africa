# Leaf pigment isolation

QA diagnostic only: replace textureLod(uCoverageColor,tileUV,2.).rgb with constant vec3(.48,.60,.25). Keep per-leaf pigment variation, lighting, normals, shadows, density, growth, root selection and all exclusions. The arbitrary green is not an approved art palette.

12 captures with exact matched pose/time/origin/calls/triangles versus reviewed-profile-20261022, day/night and three views, seed712, media, full backgrounds; no recorded errors. Normal daytime inspected: large dark leaf patches become much less conspicuous and individual leaves remain full-sized and readable. Spatial boundaries still exist. Thus sampled base pigment contributes materially to patch contrast, alongside wear/placement; geometry thinning is unnecessary to reduce that contrast. Constant pigment flattens material variation and must not be promoted as-is.

Next bounded art candidate: retain texture hue/detail while compressing excessive dark pigment contrast or blending with a biome-compatible leaf base, preserving exact density/size/exclusions. Check day/night and close view before considering runtime integration. No performance inference: removing a texture sample makes this diagnostic unsuitable as a fair performance comparison.

Reproduce capture-mangrove-pigment-isolation-20261022.mjs then compare-mangrove-pigment-isolation-20261022.py. Original left in side-by-side images. No selected runtime changes.
