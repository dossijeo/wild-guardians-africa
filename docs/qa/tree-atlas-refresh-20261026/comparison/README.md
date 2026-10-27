# Atlas comparison — actual renderer

Scope: Manglares, seed 712, 1280 × 720, medium quality. All three variants use the same approved 3D tree sources, world generation, ground, lighting, density and camera. Day fixes simulation time to 100; night to 400. Simulation is paused for reproducible visual comparison.

Columns:

1. Actual 3D tree models with native LOD replacing distant cards, with the existing density matched.
2. New direct raster atlases baked with the game's material/shader.
3. The same raster atlases, replacing only Manglares species slot 0 with the image-generation pilot. This is not a fully generative forest; species 1–3 remain direct raster.

Normal gameplay and supplementary horizon views are both captured. The horizon view raises the camera 42 units and looks toward the distance to expose more of the far representation; it retains the normal angle-based LOD policy. It does not force cards into the nearby trees or overhead views.

Reproduce (Vite QA server on port 5220):

```
node tools/experiments/capture-atlas-comparison.mjs day-3d day-raster day-imagegen night-3d night-raster night-imagegen
node tools/experiments/montage-atlas-comparison.mjs
```

These are artistic comparisons, not performance measurements. There are no GPU performance claims from these captures. Pink areas, if present, require attribution rather than assuming they originate from the edited atlas. A previous isolation diagnostic that set `impostors.visible=false` was ineffective because the update loop overwrote that value; the revised harness uses a persistent QA guard.

## Observations and limits

All six runs completed without page/console errors; seed, time and camera match in `comparison-audit.json`. The additional horizon view exposes a substantial difference in apparent canopy coverage between 3D LOD and the card representations. This batch does not include a complete population/readiness audit for that view, so it is **not evidence of equivalent visible density**, nor a performance comparison. Direct raster versus imagegen uses the same card geometry and population; only species-0 atlas pixels change.

The imagegen night pilot shifts some distant crowns toward blue/gray relative to the direct raster. Pink spots are also visible in the 3D reference; their cause is not established by this comparison. The corrected night-raster isolation records all four card meshes hidden; earlier isolation screenshots without that audit should not be used as proof.
