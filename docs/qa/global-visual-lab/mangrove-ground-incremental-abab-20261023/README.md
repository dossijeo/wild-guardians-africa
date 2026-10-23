# Incremental Mangrove material cache: first moving ABAB

## Result, not final adoption
A complete QA owner now registers streamed ground, generates coarse weights and detailed near-camera regions, replaces resources as projected importance changes, evicts nonvisible caches, and releases unloaded chunks. One update submits at most one tile. Original shading remains the fallback until the required cache is complete. Original lighting, normal response, shadows, fern density and geometry remain unchanged. This path is only installed by the QA harness, not the default game.

Intel UHD 0x9A60, Chrome/ANGLE D3D11, 1280×720, medium quality, day, seed 712 populated paused scene including the 2D background. 120 warmup and 120 measured frames per window. Whole GPU and cadence measured separately; no other GPU workload during these runs.

| Run | GPU ms | Cadence mean ms | Cadence p95 ms | CPU render ms |
|---|---:|---:|---:|---:|
| A1 | 24.418 | 31.243 | 39.7 | 8.256 |
| B1 incremental | 22.904 | 29.124 | 35.3 | 8.464 |
| A2 | 24.331 | 31.762 | 39.3 | 8.200 |
| B2 incremental | 22.875 | 28.710 | 34.4 | 8.322 |

Savings: 1.514 / 1.456 ms GPU; 2.119 / 3.052 ms mean cadence. CPU increases by 0.208 / 0.122 ms. These measurements include dynamic planning and generation, unlike the previous fixed-region proof. 480 valid GPU queries; no disjoint/missing/context errors. State, camera and fern coverage match. Original repeats have identical per-frame draw counts. Every candidate count difference is exactly one extra draw / two triangles: the bake quad. There are no reduced-triangle frames. This is a count audit, not a full per-object census.

Peak reservation (resident plus replacements) is 23,991,008 bytes = 22.879 MiB, below the 32 MiB cap. End allocations differ because camera-driven jobs are at different stages: 16.184 and 18.850 MiB. Byte counts include mip levels and gutters, but not driver overhead, shared original textures or JavaScript arrays.

## Visual evidence
See day-side-by-side.png and raw captures. Ground crop (140,480)-(440,660): RGB MAE 0.987, p95 max-channel difference 5. Color, shadows and fern coverage remain visually close. This is less exact than the earlier frozen region at its best position; the detailed region is snapped to a 4 m grid to reduce repeated generation. No claim of pixel equivalence or artifact-free motion.

## Streaming probe
Sibling `mangrove-ground-incremental-stream-20261023` performs 0 → +144 m → 0 camera/target positions and waits for completion at each. At every stop, 25 chunks are registered, nine visible chunks have complete cached materials (ten targets including one fine region), no work remains pending, and storage returns to 16,969,744 bytes. There are 30 unloads and 30 arrivals, 30 publications by the return point, no obsolete nonresident entries, and no GL/browser errors. The probe waits deliberately: it does not establish continuous-streaming p95 or peak CPU/GPU latency.

## Reproduction
Use measure-mangrove-ground-hybrid-20261023.mjs with WG_VARIANT_SEQUENCE=base,incremental,base,incremental; WG_PHASES=day; WG_COVER_QUALITY=media; WG_VIEW=normal; WG_MODES=frame,cadence; WG_SAMPLES=120; WG_WARMUP=120. Clear WG_DRAW_CENSUS and WG_FRAME_STEP. Raw benchmarks, summary, workload audit and captures are saved alongside this report.

For the streaming probe use WG_VARIANT_SEQUENCE=incrementalstream, WG_MODES=cadence, WG_SAMPLES=60, WG_WARMUP=60. Do not compare its post-stream cadence as equivalent to a baseline without the same route.

## Remaining gates
- Smooth temporal transitions: replacement currently publishes atomically. Spatial region blending exists, but does not eliminate possible LOD changes or 4 m region relocation popping.
- Longer repeated ABAB, night, low quality, near/elevated cameras and active simulation.
- Continuous streaming including generation spikes, changing crops/buildings, quality changes and full-owner teardown.
- Event replacement of whole chunks is handled; any future in-place mask edits require explicit invalidation. Do not claim all world-edit invalidations are covered.
- Budget pressure currently falls back to original shading; starvation and rapid camera turns need stress tests.
- Initial shader warmup is preparation work, not free. Dynamic creation reuses shader variants, but initial and context-restoration costs need measurement.

Keep the renderer experimental and PR #159 draft. Stay on Mangroves; no cross-biome adoption yet.
