# Native LOD2 prelit atlas

The opt-in native Sabana experiment transitions at 100–140 m. At those distances, its medium-quality acacia uses native LOD2 (1,519 triangles / 3,524 vertices), while the previous prelit atlas represented LOD1. These captures bake the native LOD2 geometry with AfricanToon, at fixed-light day/night endpoints, eight camera angles by eight tree world rotations. Each cell is 128 × 128; each phase is 1024 × 1024.

Framing still comes from LOD0. Width, projected envelope, elevation (8 degrees), baseV and authored trunk foot are unchanged. This changes the represented silhouette without moving procedural trees or increasing texture dimensions, texture count, shader operations or draw calls. Both WebPs reproduce their source PNG RGBA bytes exactly. The source PNG hashes are recorded in encoding.json; reproducible intermediate PNGs remain in the ignored local cache.

Day/night WebPs total 977,508 bytes versus 1,157,074 bytes for the previous elevated LOD1 pair, a 15.5% storage reduction. GPU texture dimensions are unchanged, so this is not a GPU memory reduction.

Both offline captures have 64 nonempty cells, no logged warnings/errors and WebGL error 0. Reproduce with `tests/browser/far-vegetation-atlas.html?bake=day&rotations=8&resolution=128&lod=2&elevation=8`, then night.

The isolated comparison uses `tests/browser/far-native-transition.html?atlas-lod=2&atlas-elevation=8` at 120 m, camera height 10, daytime and world yaw zero, after explicit GPU preparation. Native LOD2 is active; the mixed representation has native coverage 0.5, matching the billboard fade. The fixture now passes the same 100–140 m interval to both representations. The mask verifier discovers the active native LOD instead of assuming LOD1, and also still verifies the prior LOD1 evidence.

Against a separately captured background, RGB occupancy intersection-over-union is 94.49% at threshold zero and 80.66% at threshold eight. Native and impostor occupancy bounds coincide at both thresholds. These masks include shading, leaf holes and antialiasing; they do not establish perceptual equivalence or seamless transitions at other angles, elevations or lighting phases. Fifteen focused atlas framing, transform and native-layer tests pass.

The native-world QA fixture now loads this pair. Ordinary gameplay remains unchanged. The previous GPU benchmark measures the prior LOD1 atlas; no GPU improvement is inferred from this storage/silhouette correction.
