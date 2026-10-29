# Isolating Guardian presentation cost

Current reference at 9d69dcaa5: eight balanced blocks, identical Attack commands every 600 ms, 1.2 s warmup plus 4 s samples, twenty static beasts and presentation-only clock. No navigation/ragdoll cost is covered. Single IAB tab confirmed, Intel UHD, no hidden frames. current-abba.json shows reference p95 near 50 ms versus full Guardian near 67 ms; this remains a meaningful presentation regression, not acceptable merely because animation CPU is small.

Extended the existing QA block runner with explicit mode order and visible component selection. `body-effects.json` uses reference/body/effects/all/all/effects/body/reference. Body alone retains p95 near 50 ms; effects alone and full presentation are near 67 ms. All presentation updates/prepare paths remain active for component modes; rendering visibility differs. This isolates rendered components, not independent update costs.

`effect-parts.json`: reference/aura/vortex/beam/beam/vortex/aura/reference. Aura and vortex retain p95 around 50 ms, beam group around 66.5 ms. Draw p95: 93 reference, 95 aura/vortex, 96 beam. Beam group includes active discharge core, beam, impact ring and retained attack echoes. No attribution yet to a specific draw, buffer or shader; further isolation/optimization required. No visual quality was reduced by these QA visibility controls.


## Dynamic discharge instance buffer

The main discharge uses an InstancedMesh whose matrices are rewritten every active frame, but its instanceMatrix retained Three.js default static usage. Retained attack echoes already declare DynamicDrawUsage. Applied the same declaration to the main beam before its first upload; no geometry, shaders, materials, effect duration, instance capacity, draw count or visual density changed.

`dynamic-beam.json` repeats the original eight-block full-presentation comparison. All four Guardian blocks now have p95 49.895–49.990 ms (previously 66.535–66.710), average 28.20–28.71 FPS (previously 23.02–23.95). Same-run references are 28.83–29.45 FPS, p95 49.870–49.915. This supports retaining the buffer declaration, but does not identify the precise driver synchronization mechanism. Three retained-attack tests and production build pass with existing warnings.

This is one before/after sequence on Intel UHD in a controlled presentation-only workload. Reverse-order/static control and moving-incursion comparisons remain necessary before broad performance acceptance. Baseline Wild Engine work remains outside this change. The new result supersedes the earlier conclusion that current presentation necessarily retains the 67 ms p95 in this fixture; the historical measurements above remain valid for their revisions.


## Reverse control

At 362e7019f, temporarily changed only the main beam instanceMatrix usage back to StaticDrawUsage, reloaded the same fixture and repeated all eight blocks. `reverse-static.json`: all four Guardian p95 values return to 66.49–66.555 ms, average 23.36–24.11 FPS; reference p95 remains 49.855–49.920 ms. Restored DynamicDrawUsage, verified zero source diff, reloaded and repeated. `restored-dynamic.json`: all four Guardian p95 values return to 49.900–49.910 ms, average 28.58–28.83 FPS. The source remains dynamic; the static control was never committed.

This A/B reversal strengthens attribution to the instance buffer usage declaration in this hardware/workload; it does not prove a particular driver mechanism. Original and restored geometry/effects/draw counts are identical. The presentation-only regression is addressed in the repeated test, but moving navigation/physics workloads and other GPUs still need separate validation. The baseline renderer is unchanged.
