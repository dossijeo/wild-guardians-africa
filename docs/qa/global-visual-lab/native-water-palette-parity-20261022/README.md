# Native regional water palette integration

Enable `visualLab=global-lighting&waterPalette=regional`. The scene passes the biome through the existing shared fluid lighting context to paintedWaterMaterial, covering resident, asset and horizon water. Defaults remain unchanged. Lava and Desert retain their existing palette. No shader operations, geometry, textures or render passes are added; only initial ink uniform values change.

The integrated choices are subdued Savanna, warm blue-green River, mineral blue Canyon, and experimental olive Mangrove. Mangrove is retained as an accessible candidate, not declared artistically finished: daytime water still looks too uniform. Approved moss shores are unchanged. Shoreline geometry/blending integration remains separate work.

## Validation

72 real captures, six biomes, day/night, three camera poses, 1280x720 medium, seed 712. All 36 QA/native pairs are RGB exact, with equal camera, target, time, draw calls and triangles and no browser/WebGL errors. Two unit tests verify opt-in behavior, lava/unknown biome preservation and independent palette data. These captures still use QA worldbank shoreline routing in both arms; they prove palette integration parity, not production completion of all shorelines. River targets the settlement pond here; prior humid-water comparison validates the chosen pigment in the main channel.

Reproduce: `node --test tests/regional-water-palette.test.js`; run Vite on 5190; `node tools/experiments/capture-native-water-palette-parity-20261022.mjs`; `python tools/experiments/audit-native-water-palette-parity-20261022.py`.

No CPU/GPU timing improvement is claimed. There is no added steady-state rendering work by code inspection; timing and long streaming/resource lifecycle validation remain part of the broader shoreline integration. This change does not alter simulation, navigation, model silhouettes or main.
