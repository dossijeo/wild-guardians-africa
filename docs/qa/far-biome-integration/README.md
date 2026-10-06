# Far biome integration: candidate

Normal gameplay has not enabled this candidate. The native-world fixture `tests/browser/far-biome-world.html` uses a paused world without saved games. `compact=1` tests a smaller resident radius: 1 versus 2 for medium, 2 versus 3 for high, and a 40-60 m tree transition. Defaults remain unchanged.

## Earlier same-residency experiment

`savanna-abba.json` was captured before the backdrop and cancellation changes in a9436f1, with 25 chunks and a 60-90 m tree transition. Four lots of 120 frames: GPU medians A1 24.70, B1 23.82, B2 24.97, A2 22.32 ms; CPU medians 6.6-6.7 ms. All 480 queries were valid. This does not demonstrate a sustained speedup. Triangles 960,014 to 955,799; calls 59 to 64.

The current version uses one continuous, lower backdrop cylinder instead of eight panels. It owns late arriving resources during cancellation. The initial JSON does not measure those changes.

`savanna.png` shows the initial elevated day camera. `savanna-horizon-night.png` also shows the initial elevated camera after a development reload; its filename is misleading and does not evidence a low horizon test.

## Memory

Four active species require eight RGBA 1024-square atlases: approximately 42.67 MiB with mipmaps; one RGBA 2048x512 backdrop adds approximately 5.33 MiB. Canyon uses two species (21.33 MiB plus backdrop). These are storage estimates, not measured total GPU/CPU memory. WebP transfer size is not decoded memory. Tests verify current-biome-only fetching and cancellation release of late textures and adapters.

Visual matching, coarse terrain seams, reduced residency navigation, angular transitions, quality profiles and combined cost still require evidence before normal gameplay activation.

## Compact-residency Sabana ABBA (bd1da2f)

`savanna-compact-abba.json` contains all 480 GPU samples, four lots of 120 frames at the same camera, 1600x900 framebuffer and medium quality. GPU p50 A1/B1/B2/A2: 21.784/18.433/18.447/21.630 ms; CPU p50: 6.5/3.9/4.2/5.9 ms. Calls: 59/43/43/59; triangles: 960014/726721/726721/960014. No disjoint, context loss, hidden frames, pending queries or game-state changes. This view shows a consistent reduction, not an FPS claim for other views/devices/biomes.

The earlier failed attempt produced no measured lots: the preceding webview stopped advancing preparation. A fresh tab completed the same source. The fixture now reports native loading stages and keeps frames running while awaiting changes in residency.

`savanna-compact-seam.png` records the flat-color seam before the mapped-ground fix. `savanna-compact-mapped-ground.png` records the later textured result, and `mangrove-mapped-ground.png` records full-residency Mangrove with shared base material. Water shoreline precision and all movement/day/night checks are still pending.

After the measurement, the world loader gained an explicit fourth argument `{farVegetation: options}`. It defaults to false; the normal game requests no far textures/worker. Optional `residentRange` ownership restores the preceding radius on disable/dispose. Logical raid-entry bounds retain normal quality radius, independently of the visual resident radius. Four directed world-sync tests verify this and preserve navigation route/suppression objects.

**Activation blocker:** the compact-residency experiment also shrinks `terrainMeshes` used for picking. A player could see approximate distant ground that cannot be clicked. A visual-only reduction with exact picking coverage, or an exact terrain fallback, must be validated before activation. Compact radius must not be presented as a completed gameplay optimization.

## Visual-only residency experiment (before exact-ground split)

`savanna-visual-abba.json` keeps 25 CPU chunks and 25 exact picking meshes but renders nine complete chunks. GPU p50 A1/B1/B2/A2: 21.369/18.555/18.079/19.744 ms; CPU p50: 5.5/5.2/6.1/6.3 ms. All 480 GPU queries are valid and game state unchanged. A1/A2 drift is significant (about 8%); both B lots are below both A lots in this single view. Calls and triangles are identical to the compact-residency case above.

This experiment still replaces visible distant ground with a coarse surface while allowing exact picking. Crops or buildings in that region can therefore disagree with its height. It is not accepted for gameplay.

The next candidate, `compact=trees`, keeps the original exact terrain rendered and pickable and shortens only native prop rendering. Clip/water batches remain intact, including their shadows. Logical IDs, transforms, hazards, and routes remain resident; hidden props regain rendering as the camera moves. The default optional-controller setting is `preserveTerrain: true`; `compact=visual` explicitly disables it for comparison. Twenty-two targeted tests pass, including original raid bounds, ownership restoration, merged and fallback prop selection. No performance result from the whole-chunk experiments is attributed to this new candidate.
