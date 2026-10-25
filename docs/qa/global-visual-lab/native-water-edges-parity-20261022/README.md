# Native natural shoreline integration: first gate

Opt in with `visualLab=global-lighting&waterEdges=natural`. Resident water, instanced asset pools and horizon water now use the existing worldbank shore recipe through production code. Height-field sampling occurs at construction, never per frame. Authoritative geometry and simulation are unchanged. Each water material owns its shore texture; disposal releases it once. Resident materials are created explicitly rather than cloning a closure owned by the shared source material. Shared asset outline attributes are initialized once.

Validation: 24 real Sabana/Canyon captures, day/night, three poses, seed 712, medium 1280x720. All 12 QA/native pairs are RGB exact and match draw calls, triangles, camera, target and time. Two unit tests pass for texture release and opt-in. The initial comparison harness missed asset water after its source anchor changed; corrected and reran before recording these results.

Reproduce with WG_REVIEW_BIOMES=sabana,gran-canon and `node tools/experiments/capture-native-water-edges-parity-20261022.mjs`, then `python tools/experiments/audit-native-water-edges-parity-20261022.py`. Vite must run at 5190. `node --test tests/natural-water-edges.test.js` checks ownership.

This is a first integration gate, not completion across six biomes. Remaining: other four biome parity, native streaming/resource lifetime, construction latency and measured steady-state cost. Earlier QA measurements found a material Canyon GPU cost; opaque-core optimization is not integrated here. Defaults remain unchanged. Mangrove uses optical wetland depth, not real bathymetry. Map sharing and construction optimization remain candidates after correctness. Retain the approved moss bank and biome palette controls independently.
