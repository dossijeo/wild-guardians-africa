# Canyon archived Blender scatter restoration

Reproduce: Vite5190, `node tools/experiments/capture-canyon-scatter-restoration-20261022.mjs`. Twelve real campaign frames seed712/media/1280x720, three fixed cameras, day/night. Control native recipe versus QA enabling existing canyons-sculpted-ground-detail.glb and its existing global density/occupancy logic. No new asset, simulator or terrain edits. The original scene and BlenderGroundDetails gates excluded this module under global-lighting.

Six pairs match camera/target/time; no captured errors. All views inspected. Candidate adds 249-255 resident instances, one draw call, 25,896-26,520 submitted triangles (104 per instance). Actual GPU/CPU cost was not measured; these are workload counts, not performance timings. Plants remain sparse pale marks in game/elevated views and small isolated tufts in reverse view. The addition is insufficient to supply the mockup's regional coverage and bank structure. Retain QA as reference, not a native feature. This is an artistic limitation, not rejection on unmeasured performance grounds.

Next: design region-level coverage around suitable banks and sparse interior patches using occupancy/water/slope masks and authored modules; do not simply raise this uniform sparse distribution's density. Preserve model silhouettes and original world rules.

## Context audit

`capture-canyon-vegetation-context-20261022.mjs` tried farVegetation false/true first. Both runtime farEnabled values remained false. src/app/main.js explicitly disables this older layer when spatialSession exists. Therefore that capture is NOT a valid far-vegetation comparison; audit.json in canyon-vegetation-context-review-20261022 records the rejected comparison. No claim that distant vegetation has no effect is supported. The subsequent scatter test directly verifies active instance counts and is independent of that setting.
