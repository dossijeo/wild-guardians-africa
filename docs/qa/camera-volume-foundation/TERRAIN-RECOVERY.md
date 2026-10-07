# Terrain / building recovery

The prior scene adapter applied the terrain floor, then nearest-face building recovery, at most three times. A camera inside a wide, tall building near its floor could repeatedly exit below ground and be raised back inside. A nearest roof exit above the native maximum altitude could also remain outside the terrain camera range. The unit test reproduces the original below-ground loop.

`constrainCameraToTerrain` clamps to the existing terrain-relative altitude range (2–20), then checks the indexed building volumes. When blocked, it considers six finite exits of the encountered world-space envelope, resampling terrain at each candidate. It chooses the nearest clear candidate and expands the encountered envelope only when another indexed building obstructs an exit. Recovery is bounded at 12 expansions. A pathological nest of 14 volumes verifies that an exhausted recovery reports failure explicitly rather than claiming safety.

Focus/initial poses recover from their requested destination, not an intermediate nearest-face exit. The integrated scene test verifies a large building's safe focused destination and 200 idle camera updates without accumulating movement. Correction is recorded for subsequent soft retreat. This remains an exceptional geometry recovery: it is not proof that streaming recovery jumps are visually acceptable, nor a replacement for the full camera motion/visual acceptance.

Tests include floor conflict, maximum altitude, roof overflight, a cliff, overlapping structures, clear-pose stability, pathological nesting, and the actual scene resolver using native OrbitControls. Existing terrain, raid travel and registry tests also run.

## CPU scope

Run `node tools/benchmark_camera_terrain_exclusion.mjs`. Raw results: `terrain-recovery-cpu.jsonl`. Each mode uses 100 warm-up and 1,000 measured calls; correctness queries and result assertions are outside the timer. Layouts contain 1/30/1,000 synthetic boxes spaced 100 units apart. Clear poses and exceptional flat/cliff recoveries are measured separately. This is the added terrain reconciliation helper, not the combined camera controller or a rendered frame.

| Volumes | Mode | p50 ms | p95 ms | Max ms |
| --- | --- | --- | --- | --- |
| 1 | clear | 0.0048 | 0.0077 | 10.1081 |
| 1 | flat-recovery | 0.0384 | 0.0806 | 1.4286 |
| 1 | cliff-recovery | 0.0253 | 0.0923 | 1.1979 |
| 30 | clear | 0.0011 | 0.0030 | 0.6073 |
| 30 | flat-recovery | 0.0201 | 0.0286 | 0.5407 |
| 30 | cliff-recovery | 0.0196 | 0.0256 | 0.5866 |
| 1000 | clear | 0.0009 | 0.0028 | 0.0118 |
| 1000 | flat-recovery | 0.0205 | 0.0353 | 2.6701 |
| 1000 | cliff-recovery | 0.0206 | 0.0324 | 9.5286 |

Warm-up drift and scheduling/GC outliers are visible (including approximately 10 ms maxima). Two CPU campaign processes remained active. Do not infer a universal cost bound, GPU/FPS gain, mobile performance or RAM result. Indexed clear poses need one point query; pathological recovery is intentionally bounded, but real clustered village layouts still need visual/performance testing.

Normal gameplay camera protection remains off. Model margins, all cultures, touch input, trees, secondary fade and full terrain/streaming visual acceptance are still pending. Build and web-package checks verify integration, not those outstanding requirements.

Source hashes:

- `src/rendering/camera-terrain-exclusion.js`: `96c28c9be526a42eeb6bb0c72c0929ca11025a7d07a0ff25385f1fe27898ed4c`
- `src/rendering/scene.js`: `dfc80071f26064017b9d655f98734b436a888a160d15105d55776463ed849320`
- `tests/camera-terrain-exclusion.test.js`: `10be85a8a8bd5e01d224ab542965f7fe6f795f36bb2860b18cd45b0e296bf3df`
- `tools/benchmark_camera_terrain_exclusion.mjs`: `0d2e095d4778a93f9ae4247ea19e26eaaf40a97438f338950465b3ab6e91fe98`
