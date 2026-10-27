# Canyon material shoreline feasibility

Audit: river water geometry has no depth/shore attribute; the water material receives palette, world coordinates and slopes, not shoreline depth. Ground mask B is unused for canyon (zero from groundSample417), then groundMaterial417 replaces its context with constants. Therefore existing masks cannot simply be assumed to contain usable canyon shore distance.

QA prototype fills the existing B channel at mask creation with a four-unit proximity field from TerrainField.waterInfo. Saves B before canyon context replacement, then applies damp color/roughness at the end of canyon sand. No geometry, navigation, water simulation or authoritative terrain changes. No new GPU texture, draw or texture sample. Added creation cost: up to 1225 waterInfo queries per mapped canyon mask, including surface evaluation; not benchmarked and not acceptable to call free.

Reproduce: WG_REVIEW_BIOMES=gran-canon; node tools/experiments/capture-canyon-shore-20261022.mjs; python tools/experiments/package-canyon-shore-20261022.py. Seed 712, media 1280x720, three views/day/night. Twelve real campaign captures, six pairs with equal cameras/time/draws/triangles and no console/network/GL errors.

Decision: do not integrate this appearance. The mask clearly reaches the correct bank, but the dark continuous strip reads as a trench and reinforces the straight boundary. Scalar soil darkening alone cannot match the irregular water/rock transition in the mockup. Retain the executable prototype as evidence; next shoreline work must address transition structure and actual water depth/edge data, not just intensify darkness. Streaming-origin seams and mask-generation cost remain untested. Runtime/default materials unchanged.
