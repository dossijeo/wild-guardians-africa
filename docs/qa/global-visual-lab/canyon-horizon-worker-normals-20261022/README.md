# Native experimental horizon normals in workers

Enable `visualLab=global-lighting&canyonNormals=smooth`. Default remains unchanged. Both the ordinary horizon worker and spatial horizon worker prepare area-weighted normals before transferring the existing terrain buffer. No extra GPU buffer, sample, draw, triangle or render pass. The ordinary synchronous fallback also supports the option; that fallback can still stall and is not claimed as asynchronous.

Twelve fresh campaign captures, seed 712, medium quality, 1280x720, three river views, day/night. All twelve are pixel-identical to the earlier main-thread normal isolation (including six controls). All paired camera/time/draw/triangle counters match, no captured errors. Worker present in every frame; normalBuild absent in controls and populated in all candidates. Recorded preparation times: 10–33.8 ms in worker, not total streaming latency or frame time. Frames follow settled 48-unit camera steps, not continuous movement.

17 targeted tests pass: existing horizon/lifecycle/spatial tests plus direct reference equivalence over two origins. Position, colour and water data unchanged. This preserves the visible softening of distant diagonal facets; it does not solve the sawtooth bank or near/far normal seam completely.

Recommendation: retain opt-in worker implementation. Continuous-motion frametime/streaming latency and further seam review remain required before enabling broadly. No FPS claim, no main merge.

Reproduce (Vite port 5190):
```powershell
$env:WG_REVIEW_BIOMES='gran-canon'
node tools/experiments/capture-canyon-horizon-worker-normals-20261022.mjs
python tools/experiments/package-canyon-horizon-worker-normals-20261022.py
node --test tests/horizon.test.js tests/horizon-generator.test.js tests/spatial-horizon-data.test.js tests/horizon-normals.test.js
```
See worker-audit.json for exact image equivalence and worker preparation measurements. `depth` is the inherited candidate filename label, not water depth.
