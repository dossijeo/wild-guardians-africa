# Native Gran Rio distant-water palette verification

The native far-ground shader uniform now selects [.30,.44,.48] only when natural shores are enabled and fluidLighting.regionalWaterBiome is gran-rio. Existing Mangrove blue selection is retained. No shader source operations or resource allocations added.

Six native-before / explicit selected-blue QA pairs are **RGB exact**, across all three views/day/night. Calls, triangles and resource counts are identical within every comparison. No reported GL/browser errors. Existing six native-far-ground ownership/clipping/material tests pass.

Five native-return controls are exact. The elevated nighttime return has three differing pixels, maximum channel difference 2; its blue candidate pair is exact. The strict generic return audit therefore intentionally exits nonzero after writing its evidence. This tiny residual is documented, not hidden by tolerance. It does not contradict the six exact native-to-selected-color pairs, but no universal bit-exact runtime claim is made.

Reproduce with WG_REVIEW_BIOMES=gran-rio, WG_REVIEW_OUT set to this directory, and WG_FAR_WATER_LEGACY unset:

```sh
node tools/experiments/capture-river-far-water-palette-20261022.mjs
python tools/experiments/audit-river-far-water-palette-20261022.py
node --test tests/native-far-ground.test.js
```

native-parity.json records the selected-color pairs separately. Original artwork comparison and scope limits are in [the palette study](../river-far-water-palette-20261022/README.md). Main untouched.
