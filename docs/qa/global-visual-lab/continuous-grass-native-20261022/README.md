# Native Savanna continuous coverage

The approved continuous coverage is now a scene-owned renderer module, enabled only with `visualLab=global-lighting&grassCoverage=continuous` in Savanna. Existing defaults and other biomes are unchanged. Modules, density, strong wind (8), pigment and normal LOD are the retained QA recipe, not a new artistic variant.

Initialization follows restored-state sync and resident chunk creation, before GPU warmup. Terrain textures are borrowed; coverage owns its two geometries/materials and render hook. Confirmed game events invalidate occupancy. Camera movement does not query Wild Engine. Live time follows state.elapsed unless QA explicitly overrides it. Cancellation and disposal release owned resources; no simulation changes.

## Evidence

Run `node tools/experiments/capture-continuous-grass-native-20261022.mjs`, then `python tools/experiments/audit-continuous-grass-native-20261022.py` against Vite on port 5190.

Real campaign seed 712, media, 1280x720, three fixed cameras, day 150/night 350, visual time 2, settled chunks. Twelve captures produce six QA/native pairs: **all pixel-exact**, same poses, times, instances and renderer counters, no console/WebGL errors. See comparison images and equivalence.json. Other global composition options are shared by both arms.

| View | Calls | Scene triangles | Near / far modules | Coverage attribute+index bytes |
|---|---:|---:|---:|---:|
| Normal |72|1927535|2438 / 8703|1207752|
| Elevated |40|1536484|6145 / 8212|1207752|
| Reverse |65|1865675|4071 / 7016|1207752|

Counters match day/night. No capacity overflow. Byte counts describe allocated typed arrays, not measured total GPU memory. This is a parity/integration experiment, not a new GPU or FPS benchmark; build/selection timings in captures are cumulative diagnostics and not comparable end-to-end performance evidence.

Six tests pass via `node --test tests/continuous-grass.test.js tests/blender-ground-details.test.js`, covering explicit gating, event invalidation, time, camera-cache reuse, chunk release, disposal ownership and existing occupancy behavior.

## Remaining work

Keep this opt-in while validating movement/streaming, load cancellation in the real UI, quality changes and GPU/CPU A/B/A/B. Projection-change invalidation and very-low quality behavior need review before broader exposure. River retains its separate accepted pigment, night ambient and bank/wear padding in QA; do not substitute Savanna settings. Full six-biome native integration and final mockup-level quality remain unproven.
