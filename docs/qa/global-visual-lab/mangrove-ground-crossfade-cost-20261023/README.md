# Replacement crossfade cost versus atomic cache

Controlled A/B/A/B on Intel UHD 0x9A60, Chrome/ANGLE D3D11, medium quality, 720p, day, populated paused scene with background impostors and the identical camera path. A=incremental atomic replacement; B=incrementalsmooth. 120 warmup and 120 samples per GPU/cadence window.

| Run | GPU ms | Cadence mean ms | p95 ms | CPU render ms |
|---|---:|---:|---:|---:|
| A1 | 24.527 | 31.293 | 36.9 | 9.791 |
| B1 | 23.749 | 29.596 | 37.1 | 8.698 |
| A2 | 23.380 | 29.085 | 34.5 | 8.803 |
| B2 | 23.585 | 29.032 | 34.3 | 8.785 |

No consistent directional performance difference: B is 0.778 ms faster in the first GPU pair and 0.205 ms slower in the second. A1 has higher CPU and overall times than later runs. This series does not establish a free transition, a speedup, or a precise 0.2 ms marginal cost. Keep the variant experimental and judge its perceptual benefit separately. Do not compare absolute values across sessions as if clocks/thermal state were controlled.

All 480 GPU queries valid; no GL/browser errors. Camera, simulation state and fern coverage match. Every draw/triangle difference fits ± one two-triangle material bake quad; no other count differences. Both variants generate during movement, so their per-frame bake schedules differ. This is not a per-object census.

Peak texture reservation remains 23,991,008 bytes (22.879 MiB) for all four runs. It includes targets retained for blends; it excludes driver overhead, shared originals and the 1×1 auxiliary fallback texture. Smooth replacement is 180 ms, but first publication and fine-detail withdrawal remain atomic.

Reproduce the hybrid harness with WG_VARIANT_SEQUENCE=incremental,incrementalsmooth,incremental,incrementalsmooth; WG_PHASES=day; WG_COVER_QUALITY=media; WG_VIEW=normal; WG_MODES=frame,cadence; WG_SAMPLES=120; WG_WARMUP=120. Clear WG_CAPTURE_MATERIAL_TRANSITION, WG_DRAW_CENSUS and WG_FRAME_STEP. Audit: `python tools/experiments/audit-mangrove-incremental-20261023.py <folder> incremental incrementalsmooth`.

Real transition recordings are in the sibling crossfade-video directory, captured separately from this benchmark. Remaining gates include perceptual review, night/low/elevated cameras, fade entry/withdrawal and live streaming. PR #159 stays draft.
