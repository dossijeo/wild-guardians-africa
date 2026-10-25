# Native Grand River continuous coverage

`visualLab=global-lighting&grassCoverage=continuous` now selects the retained continuous coverage in Savanna and Grand River. Defaults and main are untouched. Shared meshes, culling, lifecycle, quality and event handling live in continuous-grass.js; River keeps its own pigment, day shade, solar tint and stronger night ambient.

River eligibility requires cover/moisture >= .20, gradual height reduction near worn ground, and .85-unit padding for strong wind. Resident water triangles are bucketed once per chunk, excluding actual river shape rather than the full river bounding box. Neighboring shore tiles invalidate when water chunks enter/leave. Asset water retains bounds exclusion. No simulation/navigation queries are added. Savanna retains its .6 padding and taller/drier recipe; it now also observes neighboring resident water bounds.

## Visual evidence

Run `node tools/experiments/capture-continuous-grass-river-native-20261022.mjs` and `python tools/experiments/audit-continuous-grass-river-native-20261022.py`, Vite port 5190.

24 real screenshots, seed 712/media/1280x720, three cameras per biome, time 150/350, visual time 2. All twelve QA/native pairs are pixel-exact, equal camera/time/draw calls/triangles/instance counts and no errors. Day/night normal views inspected side-by-side. This confirms integration fidelity, not final mockup-level quality. River soil/yard material adapters still run identically in both arms; this change only removes the coverage adapter dependency.

Seven targeted tests pass: `node --test tests/continuous-grass.test.js tests/continuous-grass-river.test.js tests/blender-ground-details.test.js`. New synthetic resident-boundary case verifies water in the adjacent chunk excludes nearby blades and removal invalidates/rebuilds the affected shore tile. Existing quality/projection/event/disposal tests also pass.

## Moving camera A/B/A/B

See ../continuous-grass-river-native-cost-clean-20261022. Intel UHD ANGLE D3D11, media 1280x720, 4-unit looping camera motion and strong animated wind, identical 60-frame warmup then 90 samples per pass. GPU query and cadence passes separate. All 720 GPU queries valid, no disjoint/lost/error samples; full per-frame cameras/draws/triangles identical across arms. No geometry reduction disguises cost.

| Phase | QA1 GPU / native1 | QA2 GPU / native2 | QA1 CPU / native1 | QA2 CPU / native2 |
|---|---:|---:|---:|---:|
| Day |14.709 / 14.614|14.588 / 14.699|4.986 / 4.993|4.662 / 4.688|
| Night |15.180 / 15.403|15.418 / 15.245|4.702 / 4.684|4.781 / 4.773|

All values mean milliseconds. Native-minus-QA GPU differences -0.095/+0.111 day, +0.223/-0.173 night; CPU differences within .026ms. No meaningful consistent runtime penalty or speedup demonstrated by this short test. Cadence mean 17.06-18.00ms, p95 28.5-33.7ms: not uncapped FPS and not a claim of perfectly smooth playback.

First exploratory run retained separately in ../continuous-grass-river-native-cost-20261022: tests overlapped portions and timings drifted. Do not use it for causal performance claims. Clean repeat launched no other tests/commands while sampling.

Reproduce clean output with WG_BENCH_OUT=docs/qa/global-visual-lab/continuous-grass-river-native-cost-clean-20261022 for both `node tools/experiments/measure-continuous-grass-river-native-20261022.mjs` and `python tools/experiments/audit-continuous-grass-river-native-cost-20261022.py`.

## Decision and limits

Retain the opt-in native coverage. It preserves approved art and bounded measured cost while sharing lifecycle rather than separate QA implementations. Do not enable globally yet: River rapid streaming, long-run resources, loading cancellation, low/portrait visual coverage, and full preset integration remain pending. Motion benchmark stays inside resident scene; it does not measure streaming latency or interactive simulation. Other four biomes and global completion remain open.
