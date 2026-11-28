# Current runtime savanna trees — editable GLB copies

These four GLBs were exported directly from the assets actually loaded by `Assets.biome()` in `codex/guardian-3d-animation` at c3b300f71. The freshly fetched origin/main commit 060b2ead38e61f46b55ab3a8132fd00152fac20c uses the identical binary SHA-256: 0cb407f0a908b227aae4dcbcd93ac8d42edd0b96643101e48c9d7520523fc6a1.

Runtime sources:
- `public/content/biome-savanna.json`
- `public/assets/trees-20261026/savanna.bin`
- The manifest's textureSets[0] baseColor, normal and metallicRoughness maps.

The game loads packed buffers, not these GLB files. These are newly generated editable copies of LOD0, suitable as the authoritative mesh/UV source for texture work. Positions, normals, UVs and triangle indices are copied byte-for-byte into GLB accessors, with no coordinate transform, reindexing, remesh, scaling or UV flipping. All three textures are embedded as PNG with pixel equality checked against the WebP originals. `verification.json` records individual hashes. All four GLBs were successfully imported in Blender 4.5.3.

- tree_01.glb: Acacia paraguas, 5567 vertices / 4222 triangles.
- tree_02.glb: Acacia irregular, 4311 / 3290.
- tree_03.glb: Baobab, 4791 / 3770.
- tree_04.glb: Arbol seco, 2265 / 1612.

Each file is a local-space asset prototype, centered as in the runtime data; world instances add their own placements. GLB uses standard PBR to preview the original maps. Wild Engine's custom leaf/roughness shading, baked visibility attribute and world lighting are not portable as a standard GLB material, so appearance in Blender will not be an exact game screenshot.

Reproduce from the branch root: `python tools/trees/export_runtime_glb.py` (Pillow required). The exporter re-reads its output containers and asserts geometry-byte and texture-pixel equality. It does not alter production assets.
