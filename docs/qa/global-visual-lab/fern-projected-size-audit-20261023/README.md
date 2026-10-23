# Native fern projected-size audit

Source 9f0469e66. Read-only QA instrumentation, native approved holly ferns, medium, seed712,1280x720, full impostors/mountains, paused settled real campaign. Close/game/reverse/topdown, day/night. No production code changes, no optimization or performance claim.

Eight captures exactly match the previous native prelit-far-review images in RGB. Camera, target, time, origin, calls, triangles and near/far counts match; no page/WebGL errors. Reproduce with Vite5190: `node tools/experiments/capture-fern-projected-size-audit-20261023.mjs`, then `python tools/experiments/audit-fern-projected-size-20261023.py` (requires earlier baseline captures).

## Finding

Selection in continuous-grass.js uses horizontal root-camera distance, regardless of camera elevation. Instrumentation estimates projected diameter as `2 metres * viewportHeight * projection[5] / (2 * cameraSpaceDepth)`. The conservative two-metre horizontal module diameter approximates approved geometry footprint; this is a screen-size proxy, NOT alpha-covered pixels, projected frond area, overdraw or GPU cost.

| View | Native near | Native far | Near diameter proxy | Far diameter proxy |
|---|---:|---:|---|---|
| Close |818|1419|79.6px and above for positive-depth roots|40.1–101.3px|
| Game |978|1524|64.5–188.3px|37.6–102.9px|
| Reverse |301|2029|72.9–241.6px|38.6–115.0px|
| Topdown |2068|1792|48.21–48.24px|48.21–48.24px|

Day/night histograms identical. Topdown selects different LODs at effectively identical projected size. Horizontal selection also assigns some larger screen-size modules to far than smaller ones assigned near in oblique views.

## Scope and next experiment

Tile-level frustum culling retains roots outside the image; histogram is over selected positive-depth roots, not visible pixels. Close view has150 near roots behind the camera excluded from histogram; near-plane positive depths generate huge estimates (max57602px), which must not be interpreted as visible foliage area. Conservative clipping/bounds needed for production. Do not infer removal of these roots is safe for shadow casters.

A QA threshold near64px would preserve all current positive-depth near roots in the game/close/reverse poses, promote some far roots, and select composites for the whole topdown pose. This is a hypothesis to visually test, not a chosen production threshold. Need hysteresis, camera-motion testing, geometric silhouette checks in topdown, and ABAB timings before promotion. The far prelit material remains visually approximate and prior day-GPU regression still applies; this audit does not rehabilitate that candidate automatically.

Keep approved art unchanged. Raw screenshots remain local; captures.json/audit.json preserve telemetry, and exact baseline images are in fern-prelit-far-review-20261023. No simulation/main changes.
