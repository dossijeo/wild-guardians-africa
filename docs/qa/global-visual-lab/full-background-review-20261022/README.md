# Full background connected to Wild Engine — first integration

User requires complete distant 2D scenery in subsequent art and performance tests. Earlier farVegetation:false comparisons are isolated diagnostics, not final-scene acceptance evidence.

## Implementation

Worker-owned WASM replicas receive the compact existing terrain snapshot (seed, biome, settlements). Tree identities and transforms come from native chunk instance records; chunks are removed from the replica after collection. Gameplay residency, simulation and navigation are untouched. Distant ground heights, water coverage and colors come from Wild Engine, including the seam worker. Color queries use the required integer grid, while positions/heights retain their original coordinates. Colors are batched; no per-frame world reconstruction. Terrain revision invalidates region and seam requests. Existing atlases and HQ mountain art are retained.

Experimental opt-in: spatialFar=1, normal farVegetation setting enabled. Main/default remains gated. The initial six-biome captures used a QA-only removal of the old unconditional spatial-session far gate. A subsequent native Sabana smoke run uses spatialFar=1 without that interception, stored in ../spatial-far-native-smoke-20261022.

## Evidence

36 real screenshots: six biomes, three fixed views, day/night, seed 712, media 1280x720. All frames confirm enabled loaded far adapters, visible biome-2d-backdrop and zero GL/page errors. See captures.json and overview-day/night.jpg. 47 targeted tests pass, including instance correspondence in a canonical settled chunk for all six biomes, suppression, zero retained replica chunks, unchanged authoritative residency, worker protocols and seam resource handling. This does not prove moving-camera parity across all regions.

## Known unfinished work

Visible tree transition dithering remains in the far pipeline. Mangrove far water retains legacy turquoise rather than the selected near deep blue. Far-ground color/lighting differs from nearby detailed materials. DOF has not been implemented and should not conceal those defects. Need moving-camera/streaming/resource validation, terrain-change invalidation test and full-scene GPU/CPU ABAB benchmark. No performance improvement claimed. This is a functional experimental connection, not final visual acceptance.

The load-failure.json records a resolved intermediate failure, not the final capture state. Moisture failure was removed by using the existing unmapped far-material path instead of generating a discarded legacy terrain mask.
