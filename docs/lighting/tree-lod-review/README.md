# Savanna close LOD evaluation — 2026-10-30

Source: user-provided `sabana_lod.zip`. Not an external licensed asset download. Original files remain unchanged. `inspection.json` records hashes, triangle counts, uniform scale to existing height and width/depth changes. Staged GLBs are intentionally excluded from Git and production loading.

Reproduce: `python tools/trees/stage_lod_review.py "C:/Users/PC/Desktop/Wild Guardians New/sabana_lod.zip"`, start Vite, open `/tests/browser/tree-lod-review.html`.

## Actual checks

Loaded all four old runtime-export GLBs and all four new GLBs in the browser with Three.js GLTFLoader. Inspected and saved day side-by-side images for all four, plus night tree 4. Equal height, grounded minimum Y, horizontally centered bounding box; uniform scaling preserves candidate proportions. Original PBR maps retained. Orbit and zoom controls, optional proximity switch (22 units, QA-only arbitrary threshold). Exercised the switch on tree 4 by zooming from overview to close range. This deliberately exposes shape changes; it is NOT a production-ready transition policy.

These are isolated comparison renders, **not Wild Engine screenshots**. No production assets, tree placement, collision, shaders or LOD selection changed. Night lighting is illustrative and not the game's biome lighting. No FPS or GPU performance acceptance claimed. Texture memory below is an analytical uncompressed RGBA8+mipmap estimate, not a measured allocation. The QA viewer caches visited models and is not a streaming implementation.

| Tree | Current triangles | New triangles | Same-height width change | Same-height depth change |
|---|---:|---:|---:|---:|
| 1 | 4,222 | 15,053 | +4.6% | -11.8% |
| 2 | 3,290 | 14,336 | -23.0% | -16.8% |
| 3 | 3,770 | 15,213 | +14.0% | +50.8% |
| 4 | 1,612 | 14,998 | -5.9% | -13.5% |

## Visual judgement and next integration decision

The candidates visibly improve bark relief, leafy crown outlines and ground vegetation. They look deliberately stylized and cleaner, rather than more photorealistic. Tree 2 is substantially narrower; the baobab has a much larger/deeper base and altered branches. Leaves are brighter green and trunks differ in hue. An abrupt swap against existing trees will visibly change identity; uniform scale/base correction cannot solve this. Tree 2's existing exported mesh also contains an isolated foliage piece visible at left in the comparison.

Recommended: use these as the source for close detail and derive compatible simplified middle LODs from the same shapes, or revise HD silhouettes against the old models if retaining old middle LOD geometry is mandatory. Regenerate distant representations as needed, preserve game transforms/placement, match material color/roughness and bake AO onto new topology. Do not stretch geometry independently along axes just to match a bounding box.

Raw candidates total 76,523,516 bytes. Each has two 4096-square textures and one 2048-square texture: approximately 192 MiB each / 768 MiB for four in RGBA8 with a full mip chain, excluding geometry/driver/CPU copies. A close-only geometry switch alone does not eliminate resident texture memory. Texture downsampling, GPU compression, bounded residency and actual native-scene frametime measurements are needed before shipping.

Verdict: worthwhile visual direction, but not a seamless drop-in near LOD and not approved for production performance. Resolve silhouette consistency and texture budget on this set before commissioning all other biomes. Captures provide an immediate reviewable comparison without changing the stable game.
