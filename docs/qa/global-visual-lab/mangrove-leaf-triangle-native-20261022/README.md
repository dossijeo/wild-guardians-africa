# Mangrove leaf rectangles: water-footprint correction

The resident Mangrove water mesh was excluded from leaves using its entire axis-aligned bounding rectangle. A chunk can contain curved/disconnected water covering only part of that rectangle, so dry land lost leaves in straight rectangular bands. The diagnostic scene has 16 non-instanced chunk water meshes, 69–3811 triangles each. Coverage overflow is zero. Hiding only leaf geometry removes the visible bands while retaining moss, confirming the leaf contribution.

Reuse the existing River projected-water-triangle buckets for Mangroves and inspect neighboring chunk footprints. Data comes from resident rendering meshes during invalidation, no new Wild Engine/navigation queries. Preserve 0.6m shore padding, wear/building masks, authored leaf geometry, moss and blue water. Other biomes retain their behavior. Asset-water fallback remains bounding-box based; no such assets occur in this diagnostic scene.

Five targeted tests cover existing leaf ownership/LOD, River boundaries, and Mangrove dry triangular corners, wet interiors, neighboring water and cache invalidation. Old fixtures lacked the now-required biomeGround object; fixtures updated without changing production assumptions.

Real native result: all six day/night/three-view images RGB exact to the QA triangle candidate. Full 2D backgrounds, seed712, medium, 1280x720. Coverage adds 8432/8976/2696 triangles by view; no buffer overflow. Daytime old-before vs QA first two poses also differ by one unrelated draw/5641 triangles from loading state: not timing-equivalent evidence. Night and reverse-day workload differences equal leaf coverage.

Retain this local correctness/art fix. GPU/CPU cost of recovered coverage still requires measurement; it is not a free optimization. Some leaf regularity may remain from distribution/materials and should be reviewed separately. No claim to have eliminated every rectangular artifact in every region.

Reproduce baseline isolation using capture-mangrove-leaf-rectangle-diagnosis-20261022.mjs (explicit old footprint route), candidate using capture-mangrove-leaf-triangle-water-20261022.mjs, and native using capture-far-transition-native-20261022.mjs with WG_REVIEW_BIOMES=manglares and WG_REVIEW_OUT set to this directory. No QA shader/material replacements in native capture.
