# Volcano directional warmth comparison

Reproduce: `node tools/experiments/capture-volcano-ground-ridge-review-20261022.mjs` with Vite on port 5190. Real campaign, seed 712, media, 1280x720, fixed time/camera, three poses, day 150/night 350. Eighteen captures: native, uniformly warmer direct ground sunlight, and normal-orientation-weighted warmth. Production material remains unchanged.

The ridge label describes artistic intent, not curvature detection: weight is smoothstep(.50,.92,max(dot(normal,sun),0)). It modulates only the mapped ground direct sunlight color, retaining existing BRDF, visibility, ambient and night terms. Geometry, models and simulation are unchanged.

Inspection of the normal and reverse views favors the localized variant over uniform warmth: highlighted surfaces become slightly golden while broad rock retains charcoal character. The gain is modest; neither variant closes the mockup gap in material variety and broad ground structure. Retain both QA variants, do not promote this as a significant relief improvement. Next work should target meaningful material-scale variation rather than further tiny sunlight tint changes.

All twelve candidate/baseline pairs retain camera, target, time, draw calls and triangles. All six night pairs are RGB identical. No captured console/GL errors. This is static image evidence, not an FPS, CPU or GPU benchmark. No measured cost or full quality-profile validation yet.
