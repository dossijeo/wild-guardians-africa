# Mangrove quality restoration: settled visual comparison

Intel UHD, 1280x720, fixed512, medium / very low / medium twice; fixed fixture, camera, time and wind. No terrain, fern density or lighting edits.

The earlier 45-RAF protocol was not a sufficient readiness gate: far-tree transitions last one second after GPU preparation. The revised optional WG_QUALITY_SETTLE=1 advances rendering by 1/60 s and requires no preparation or active transitions for 60 consecutive frames, with a 600-frame failure bound. Simulation remains paused. This measures the settled endpoint, not transition smoothness or performance.

After both medium returns, merged color and shadow groups recover identical count/matrix/visibility fingerprints. Camera and logical obstruction remain unchanged. The monitored ground-only crop (x140:440,y480:660) is byte-identical in day and night. Full frames differ by 5,472 pixels in day and 4,605-4,606 in night. Near/far fern counts change 1181/700 to 1202/679, total 1881 unchanged, consistent with per-tile hysteresis history rebuilding after quality changes. Do not claim whole-frame pixel equality or silently change approved fern thresholds.

During diagnosis a separate invalidation defect was reproduced: native LOD coverage repacking can overwrite the composed native/impostor values while all original cache inputs remain unchanged. NativeFarCoverage now also checks output attribute versions, saving them after its own writes. The regression test failed before this change and all 17 coverage/layer/transition tests pass afterward; quiet frames still avoid rescans. This fix alone did NOT resolve the unsettled screenshots; the readiness gate is a separate correction to QA.

The compact JSON files retain instance fingerprints, source coverage, camera, cache, resource, GL and transition state; verbose repeated mesh/material shader strings are omitted. Raw local probe files remain available but are not necessary to review these conclusions. The ten-frame preambles are smoke data, not performance evidence.

Reproduce with WG_VARIANT_SEQUENCE=fixednative, WG_PHASES=day,night, WG_COVER_QUALITY=media, WG_MODES=cadence, WG_SAMPLES=10, WG_WARMUP=30, WG_STATIC_VIEW=1, WG_FIXED_QUALITY_PROBE=1, WG_QUALITY_SETTLE=1 and WG_REVIEW_OUT=<fresh directory>; run tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs.
