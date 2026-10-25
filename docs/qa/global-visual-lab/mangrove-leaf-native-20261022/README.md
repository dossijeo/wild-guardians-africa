# Native Mangrove leaf coverage

`visualLab=global-lighting&grassCoverage=continuous` now supports Mangroves as well as Savanna/Grand River. Add `mangroveMoss=layered&mangroveSubstrate=full&skyAtmosphere=clouds` for the retained native composition. Defaults/main unchanged.

Shared coverage owner now loads the existing Blender leaf modules for Mangrove:8near/4far leaves,32/8triangles per module; same authored positions/index buffers, normal morph, pigment, wind8, coverage/wear taper and LOD. Density .5media/.6low, fixed authored leaf size, far48/40 and near24/0. Shared quality/projection invalidation, confirmed occupancy events and idempotent disposal replace QA method wrapping. Existing ground detail layer is disabled for global-lighting before coverage is installed; other scene vegetation, mud and models remain intact.

Mangrove retains its approved per-chunk water-bound exclusion (River's triangle shoreline rule is not imposed). No Engine/navigation queries or simulation edits. Low density changes preserve leaf dimensions; very-low uses the shared terrain-only fallback.

## Evidence

Run capture-mangrove-leaf-native-20261022.mjs then audit-mangrove-leaf-native-20261022.py under tools/experiments (Vite5190). Both arms use native moss; QA versus native leaf coverage is the only study variable. Seed712/media/1280x720, three fixed poses, visual time2, day150/night350. Twelve images/six pairs pixel-exact, equal cameras/time/calls/triangles/leaf instances/buffer bytes, no errors. Reverse day view inspected.

|View|Scene calls/triangles|Near/far modules|Coverage buffer bytes|
|---|---:|---:|---:|
|Normal|66 / 617752|1 / 452|1204048|
|Elevated|44 / 511661|0 / 1847|1204048|
|Reverse|65 / 546668|138 / 190|1204048|

Day/night counters match. These are local settlement views; much of their ground appearance comes from layered moss, not dense leaf geometry. Do not use them to claim uniform leaf coverage across all Mangrove terrain.

Eight targeted tests pass: `node --test tests/continuous-grass.test.js tests/continuous-grass-river.test.js tests/mangrove-leaf-cover.test.js tests/blender-ground-details.test.js`. New checks preserve source geometry, near/far triangles, leaf mapping, quality spacing/size and audit counts; existing event/projection/disposal and River shoreline tests remain green.

## Cost

See ../mangrove-leaf-native-cost-20261022. measure-mangrove-leaf-native-20261022.mjs and audit-mangrove-leaf-native-cost-20261022.py reproduce QA/native/QA/native, IntelUHD ANGLE D3D11,4-unit moving camera+wind,60warmup/90samples, separate GPU/cadence passes. No concurrent tasks launched during measurement.720validGPUqueries; exact per-frame camera/draw/triangle sequences; no invalid/disjoint/errors.

|Phase|GPU QA1/native1 ms|GPU QA2/native2 ms|CPU QA1/native1 ms|CPU QA2/native2 ms|
|---|---:|---:|---:|---:|
|Day|14.731/15.649|14.861/14.698|3.932/4.312|4.538/4.049|
|Night|17.640/15.862|15.524/15.916|4.169/4.001|4.180/3.981|

Differences change sign: GPU+.918/-.163day,-1.778/+.392night; CPU+.380/-.489day,-.168/-.199night. Baseline night itself drifts2.116ms. No speedup/zero-overhead claim. Mean cadence17.21-19.17ms, p95 28.2-34.9ms; not uncapped FPS or proof of stable frame pacing. Raw samples retained.

## Decision / outstanding

Keep native opt-in, preserving accepted art and removing QA coverage lifecycle dependency. Do not reduce density to make the benchmark look better. Long streaming/quality/portrait and event-driven placement in real Mangrove gameplay remain pending; current shared lifecycle tests are supporting evidence, not complete gameplay validation. Full six-biome visual target remains open.
