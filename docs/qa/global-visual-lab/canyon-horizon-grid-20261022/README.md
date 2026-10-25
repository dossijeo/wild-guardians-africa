# Canyon horizon sampling reference: 4x8 versus 2x2

Twelve valid real campaign captures, seed712, medium1280x720, identical three along-river cameras/day/night. Both arms use smooth horizon normals. A native4x8 sampling; B QA spatial builder2x2 using the same authoritative surface/color queries. No engine, navigation, settlement or model changes. This is a visual sampling reference, not a proposed global density setting.

The fine horizon substantially reduces large distant wall facets and angular transitions. Bank steps remain and the resident/horizon join is still visible. Retain the better distant-wall appearance as a target for localized refinement. Do not call this a complete shoreline fix.

Horizon vertices:103212 ->802656; existing nine-float vertex format implies3715632 ->28895616 bytes (CPU buffer payload and corresponding nominal vertex allocation, not measured driver VRAM). Added233148 triangles per frame; calls remain43/39/51 for the three views. Worker normal pass baseline3.1–8.6 ms, candidate24.8–56.9 ms; these are not full generation/GPU times. No FPS benchmark. Full horizon refinement is deliberately expensive; do not reject the artistic direction solely on this reference implementation's cost.

Initial invalid attempt exceeded the spatial color batch limit (50000 coordinates) and the worker failed, removing the horizon. Those images were replaced and are not evidence. The QA route now batches queries within the existing API limit and fails on missing worker/normal metadata. Final captures have active workers, populated normal metrics and no captured errors. Source builders differ (native vs equivalent JS reference); existing parity tests establish base-grid equivalence, but this is not a performance comparison between them.

Reproduce with Vite5190:
```powershell
$env:WG_REVIEW_BIOMES='gran-canon'
node tools/experiments/capture-canyon-horizon-grid-20261022.mjs
python tools/experiments/package-canyon-horizon-grid-20261022.py
```
Next: localized sampling near the river and visible walls with a conforming transition to coarse terrain. Preserve original surface and object silhouettes; avoid cracks at refinement boundaries. Production density unchanged.
