# Cupped leaves: fixed-camera single-world ABAB

Intel UHD0x9A60 / ANGLE D3D11, low quality,1280x720,seed712, full backgrounds, smooth far transitions, exposed-soil oblique view. Original/cupped geometries retained and swapped inside one resident world; identical leaf counts, masks and camera.60 warmup+90 samples per GPU and separate cadence pass.

720 valid GPU queries, no disjoint/errors. All per-frame workload controls pass after subtracting the exact leaf triangle difference; no unexplained calls/triangles. This static control is distinct from the two moving studies, whose non-leaf LOD mismatches remain documented.

| Phase | Run | Geometry | GPU mean/p95 ms | CPU mean/p95 ms | Interval mean ms |
|---|---|---|---|---|---|
| day | 0 | original | 17.85/20.38 | 4.83/6.40 | 18.30 |
| night | 0 | original | 19.12/24.28 | 4.72/6.00 | 19.27 |
| day | 1 | cupped | 18.11/22.28 | 4.78/6.10 | 18.99 |
| night | 1 | cupped | 18.32/20.73 | 4.93/6.40 | 20.62 |
| day | 2 | original | 17.81/19.96 | 5.05/6.60 | 19.93 |
| night | 2 | original | 18.24/20.76 | 4.90/6.50 | 20.22 |
| day | 3 | cupped | 18.02/19.99 | 5.29/6.80 | 20.34 |
| night | 3 | cupped | 18.52/20.66 | 4.53/5.60 | 18.97 |

Daytime paired GPU cost +0.26/+0.22ms; night -0.80/+0.28ms, variable. CPU/cadence mixed; no FPS optimization claim. This bounded daytime cost supports keeping the artistically better rounded/creased candidate for further validation. No rejection solely for its higher triangle count.

Limitations: fixed camera does not validate moving LOD transitions, only a low-quality view/one biome; medium-quality imagery pending. Both geometry sets remain allocated for QA, so recorded memory is not an integrated one-variant memory budget. Two new asset tests verify finite meshes/indices, normal lengths and exact four-leaf endpoint attributes, not temporal appearance.

Reproduce with measure-mangrove-leaf-cupped-static-cost-20261022.mjs and audit-mangrove-leaf-cupped-static-cost-20261022.py. Raw metadata and screenshots retained. Production module unchanged.
