# Gran Rio distant water palette

Actual Wild Engine world, seed 712, media 1280x720, three fixed views, day/night, full distant impostors/mountains. One loaded world; synchronous uniform-only comparison after settling each pose. Near water, shore/moss, geometry, shaders and lighting remain unchanged.

Candidates: previous far water RGB [0.2118,0.7216,0.7490], muted blue [.30,.44,.48], grey-green [.28,.43,.43]. These are inputs to the existing distant-water color pipeline, not physical absorption coefficients.

**Retain muted blue.** It removes the conspicuous bright turquoise patches in the distance and relates better to the near water and its sky reflection. Grey-green also removes excess brightness but introduces a greener distant cast, so it is not selected.

[Day game view](day-0-comparison.jpg), [night game view](night-0-comparison.jpg), [oblique](day-2-comparison.jpg). Blue/green change approximately 6367 visible distant-water pixels in the game view. The elevated view is RGB unchanged because far water is outside the view. All six return controls are RGB exact.

Every comparison retains identical calls, submitted triangles and renderer resource counts. No added draws, geometry, maps, texture reads, shader operations or render passes: only three existing uniform values change. This is not an FPS optimization, and no new GPU/CPU timing claim is made for a constant-color edit. The game view records 78 calls / 962252 triangles and 237 geometries / 90 textures; other view counts are in captures.json. No reported browser/WebGL errors.

The native change is gated by natural shores plus Gran Rio regional water lighting; Mangrove blue and other biome paths remain unchanged. See [native validation](../river-far-water-native-20261022/README.md).

Distant water still uses simplified fixed night grading and lacks near-water reflections. This improves palette integration, not full optical equivalence or shoreline-mask resolution. Moving seam/streaming validation remains part of the broader background work.

To reproduce the previous palette reference after the native change, set WG_REVIEW_BIOMES=gran-rio and WG_FAR_WATER_LEGACY=1 before running:

```sh
node tools/experiments/capture-river-far-water-palette-20261022.mjs
python tools/experiments/audit-river-far-water-palette-20261022.py
```

The stored initial capture predates native adoption, so its original values naturally came from the previous source. The explicit legacy option now reproduces those same values without changing game code.
