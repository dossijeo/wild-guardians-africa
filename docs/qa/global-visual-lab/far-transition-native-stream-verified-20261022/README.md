# Native streaming and disposal check

Mangroves, seed712, medium quality, 1280x720; native smooth option and full Wild Engine-backed far vegetation/mountains. Ten settled captures: offsets 0/96/192/96/0 metres, day and night. Each species generated nine regions across the path. No browser/shader/WebGL errors.

The corrected lifecycle assertion observes the callback that actually precedes the smooth owner (including continuous grass). On disposal: all 12 tracked owned resources disposed, zero smooth meshes remain, scene callback restored, world far owner cleared. Calling dispose twice is safe in this run. Renderer counters decrease from 178 geometries/102 textures to 149/91. This verifies these owned resources, not all GPU allocations or unbounded-session leak freedom. The initial harness failure is retained separately.

Return images still differ by 10556 day / 8589 night pixels; draw/triangle counts also differ. The two independent streaming runs reproduce these counts. Comparison to the original dither path is required before attributing the changes to this integration. The far owner uses region hysteresis and stateful representation selection.

Run `tools/experiments/capture-far-transition-native-stream-20261022.mjs` with `WG_REVIEW_OUT` set to this directory, followed by `tools/experiments/audit-far-transition-native-stream-20261022.py`. The source now also supports `WG_SMOOTH_FAR=0` for an original-path control. Checkpoint timings include streaming and settling and must not be quoted as frame or GPU time.
