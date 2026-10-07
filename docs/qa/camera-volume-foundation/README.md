# Camera exclusion: geometric foundation

This is the first foundation for the independent POST-JAM camera protection task. **It is not connected to the gameplay camera yet.** These results do not establish soft collision, visual exclusion distances or acceptance on real buildings/mobile devices.

The initial evidence below describes commit `cff76ab`. A subsequent oriented-volume extension supports an optional finite `yaw` in radians, about the center of the supplied box. Bounds specify the unrotated world-coordinate box; positive yaw follows Three.js Y rotation. The spatial index stores conservative rotated X/Z bounds but tests contact against the oriented box, preserving empty corners and roof overflight. [Rotation test output](rotation-tests.txt) records 21 passing tests, including all 16 original cases and five new oriented/index cases. [Extension source hashes](rotation-source-hashes.json) identify that revision's inputs. Actual model-volume extraction and controller integration remain pending.

## Geometry and ownership

`camera-volume-sweep.js` computes first contact of a swept sphere with a finite axis-aligned box. Rounded corners permit safe diagonal views that an inflated box would reject. The finite roof allows overflight. Initial overlap returns a deterministic nearest exit normal; moving the camera out of overlap remains controller work.

`camera-volume-index.js` owns copied world-coordinate descriptors and indexes them in X/Z cells. Updates remove previous memberships; deletion and clear release descriptors. Oversized volumes, long trajectories and unsafe integer grid coordinates use a bounded direct-query fallback. This avoids a scene traversal for each query; integration must explicitly invalidate descriptors when assets change.

## Verification

- [Volume tests](volume-tests.txt): 16 passing tests, including 1,000 seeded trajectories against an independent numerical convex-distance oracle, corners, tangency, overflight, negative cells, descriptor changes, cleanup and large coordinates.
- [Terrain and raid camera regressions](terrain-regressions.txt): 56 passing tests, comprising the 10 sphere tests and 46 existing camera tests. Existing camera behavior is unchanged because the new modules are not imported by it.
- [Source hashes](source-hashes.json) identify the five source/test/benchmark files used.

## Synthetic CPU experiment

Run `node tools/benchmark_camera_volume_sweep.mjs`. [Raw results](cpu.jsonl) compare direct queries (A) and indexed queries (B) in A1/B1/B2/A2 order, with 100 warm-up and 600 measured queries per arm. Hit IDs and fractions have identical hashes across all four arms for each population.

| Boxes | Direct candidates | Indexed mean candidates | Direct p95 ms, A1/A2 | Indexed p95 ms, B1/B2 |
| --- | --- | --- | --- | --- |
| 50 | 50 | 12.48 | 0.202 / 0.119 | 0.126 / 0.055 |
| 500 | 500 | 9.94 | 0.703 / 0.631 | 0.026 / 0.063 |
| 2,000 | 2,000 | 9.94 | 1.613 / 1.278 | 0.017 / 0.015 |

This is a synthetic CPU microbenchmark with other campaign processes running. It demonstrates candidate reduction and equivalent query results, not game FPS, GPU cost, RAM savings or mobile performance. Creation/update cost and allocation pressure still require integration measurements.

## Work still required

1. Derive/configure exclusion volumes from real models and culture scales, including per-house bounds rather than the entire village's shared geometry. Evaluate oriented bounds and procedural building deformation/destruction.
2. Preserve raw OrbitControls intent separately from the corrected pose, avoiding damping feedback. Add progressive deceleration and smooth recovery without penetration, oscillation or trapping inside newly loaded volumes.
3. Keep rendering, picking, terrain protection, Continue, Back and raid camera travel consistent with the protected pose.
4. Cover overlapping volumes, streaming, construction, damage, collapse and deletion. Keep crops, workers and animals inspectable at closer distances and allow vertical overflight.
5. Reserve near-camera fade for exceptional recovery. Validate images and trajectories across relevant cultures/categories and physical mobile devices; measure real frame cost before accepting the feature.
