# Incremental cache: low-quality day/night ABAB

## Decision
Day comparisons pass the workload audit and support further investigation. Night timings are provisional: one frame differs by one world draw / 708 triangles beyond the permitted bake quad. Do not describe the whole series as equivalent or final validation. The earlier diagnostic census attributed a matching 708-triangle discrepancy to native background standby, but this run contains no per-object census and does not independently prove that attribution.

Intel UHD 0x9A60, Chrome/ANGLE D3D11, 1280×720, low quality, populated paused seed 712 fixture, distant impostors included, camera moving. Each window has 120 warmup and 120 measured frames. Whole GPU and cadence use separate windows. All 960 GPU queries are valid, with no disjoint/missing/context errors; no browser errors.

| Run | Phase | GPU ms | Cadence mean ms | Cadence p95 ms | CPU render ms |
|---|---|---:|---:|---:|---:|
| A1 | Day | 19.9679 | 24.2442 | 29.0 | 6.5758 |
| B1 | Day | 16.9326 | 22.4308 | 28.9 | 6.1717 |
| A2 | Day | 19.5115 | 25.0475 | 30.9 | 6.3300 |
| B2 | Day | 16.9730 | 22.0675 | 27.6 | 6.0467 |
| A1 | Night | 19.9153 | 28.1942 | 40.2 | 6.8667 |
| B1 | Night | 18.1358 | 22.6917 | 26.6 | 5.8175 |
| A2 | Night | 20.7743 | 24.2642 | 28.0 | 5.6850 |
| B2 | Night | 17.6577 | 22.9600 | 29.1 | 6.0008 |

Accepted day GPU gains: 3.0353 / 2.5385 ms; mean cadence gains: 1.8134 / 2.9800 ms. The first day p95 improvement is only 0.1 ms, so do not claim consistent large tail-latency gains. Night B2 p95 is 1.1 ms worse than A2 even before the equivalence caveat.

## Workload and memory
State, camera and fern coverage match across runs. Original repeats have identical draw/triangle sequences. Day candidate differences are exclusively one extra draw / two triangles for a material bake. Night B1 GPU frame 19 is missing one draw / 708 triangles; no other unexpected count differences. The count audit does not prove individual object identity.

Peak cache reservation is 23,991,008 bytes (22.879 MiB) in all candidates, including simultaneous replacements. Resident end values depend on job completion (16.184–21.536 MiB). These are estimated mipmapped texture-storage bytes, not driver VRAM or CPU memory. Original shared textures remain outside this additional budget.

## Visual evidence
Day and night side-by-side images are supplied. Ground crop RGB MAE: day 0.792 / night 0.399; p95 max-channel difference: 4 / 2. Night lighting remains distinct and dynamic; fern density is unchanged. This is a static capture comparison, not evidence that LOD transitions cannot pop.

## Reproduce
WG_VARIANT_SEQUENCE=base,incremental,base,incremental; WG_PHASES=day,night; WG_COVER_QUALITY=baja; WG_VIEW=normal; WG_MODES=frame,cadence; WG_SAMPLES=120; WG_WARMUP=120. Clear WG_DRAW_CENSUS and WG_FRAME_STEP. Run measure-mangrove-ground-hybrid-20261023.mjs with WG_REVIEW_OUT set to this directory.

Audit with `python tools/experiments/audit-mangrove-incremental-20261023.py <folder>`. It deliberately exits nonzero for this series and writes phasePassed day=true/night=false alongside the unexpected frame. Do not suppress the error to present the series as a pass.

Remaining: resolve/evidence low-night workload differences; medium-night validation; smooth temporal transitions; continuous streaming and active-world edits; near/elevated views; modest-device stress. PR #159 stays draft and the default renderer stays unchanged.
