# Native opt-in smooth far transitions

Use `visualLab=global-lighting&spatialFar=1&farTransitions=smooth`. The original default remains unchanged. This promotes the reviewed QA candidate into the experimental renderer without material interception: separate opaque/partial impostor draws, per-atlas camera-depth packing and owned front-face standby material clones. Canonical tree identity/readiness remains unchanged. Scene-scoped preparation runs before renderer uploads; disposal restores borrowed geometry/materials and releases owned views. Hull changes propagate to the owned GPU attributes.

## Validation

- 76 passing targeted Node tests: smooth transition ownership, readiness, hulls, standby, native far layers, vegetation ownership/profile and loading.
- 24 real 1280x720 PNG captures: Sabana/Mangroves, medium quality, seed 712, three camera poses, day/night, warmup/native. Full Wild Engine-backed distant impostors and mountain backdrop enabled. No QA material replacement.
- Against the earlier ordered QA candidate: 10/12 RGB-exact final images; Sabana elevated night differs by 5 pixels (max15), Mangrove game night by 1 pixel (max3). Calls and triangles match in all 12 pairs. Separate loads: tiny residuals are reported, not treated as proven parity. No shader/browser/WebGL errors captured.

Reproduce: `node tools/experiments/capture-far-transition-native-20261022.mjs`, then `python tools/experiments/audit-far-transition-native-20261022.py` with Vite on port5190. `captures.json` and `native-parity.json` preserve settings and counts.

## Cost and limits

No new timing claim: this integration preserves the previously measured candidate workload. Earlier moving Mangrove QA measured about 0.19–0.20 ms sorting/packing, 44040 bytes marked per moving frame, and +4 draws/+2202 submitted triangles from the opaque split. Those are prior QA measurements, not a new native benchmark.

Keep opt-in pending native long-distance streaming/lifecycle and moving-camera measurement. Unit lifecycle checks do not prove absence of browser GPU leaks. Partial overlap across different atlases and standby foliage ordering remain limitations; this does not remove all obstruction dithering in the game. Other four biomes have QA candidate visual evidence, not native integration captures in this run. Preserve accepted blue water and moss. Mangrove rectangular ground leaves remain deferred.
