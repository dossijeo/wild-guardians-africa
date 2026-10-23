# Fixed512 lifecycle: low-quality day/night validation

2026-10-23, Intel UHD / ANGLE D3D11, 1280x720. Selected one-shot fixed512 versus fixed512 with chunk ownership. Sequence A/B/A/B for each phase; 120 warmup, 120 samples per frame/cadence window. This validates integration of the selected architecture, not another cache-resolution alternative.

| Phase/run | A GPU ms | B GPU ms | A frame ms | B frame ms | A p95 ms | B p95 ms |
|---|---:|---:|---:|---:|---:|---:|
| Day 1 | 16.511 | 16.449 | 21.538 | 21.092 | 25.6 | 25.9 |
| Day 2 | 16.174 | 16.503 | 22.156 | 21.635 | 25.1 | 25.9 |
| Night 1 | 17.326 | 17.347 | 23.574 | 22.568 | 31.0 | 27.2 |
| Night 2 | 17.289 | 16.650 | 22.644 | 22.238 | 26.2 | 27.8 |

These are descriptive measurements, NOT a confirmed performance equivalence or improvement: strict workload audit fails at three frame-window observations (one draw / 708 triangles difference). Cadence windows match counts, camera and fern coverage. All 960 GPU queries are valid, no GL errors or simulation state advancement. The complete summary and audit remain alongside raw records; failures are not suppressed.

Image comparison: both day pairs and the second night pair match exactly over all RGB pixels. First night pair differs at two pixels (maximum channel difference 5); the ground crop matches exactly in all four pairs. Thus the observed integration preserves the selected shader's image at this tested camera. This does not establish all-camera equivalence.

Every B run publishes 25 targets before measurement; resident/peak cache memory 35,209,000 bytes (33.58 MiB), no rejections or ongoing generation. This is steady-state evidence, not streaming-generation latency. No change to the decision to retain fixed512.

Pending: continuous streaming spikes, changed-mask visual verification and moving the QA owner into the renderer's opt-in production lifecycle. Main and PR draft status remain unchanged.

Reproduce with WG_VARIANT_SEQUENCE=cache512,fixedlifecycle,cache512,fixedlifecycle; WG_PHASES=day,night; WG_COVER_QUALITY=baja; WG_VIEW=normal; WG_MODES=frame,cadence; WG_SAMPLES=120; WG_WARMUP=120; WG_REVIEW_OUT=<new directory>; run tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs. Audit via audit-mangrove-incremental-20261023.py <directory> cache512 fixedlifecycle; nonzero exit reports the documented workload exceptions.
