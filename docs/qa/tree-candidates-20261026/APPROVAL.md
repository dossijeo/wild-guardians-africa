# Tree selection — 2026-10-26

User approved the new 3D trees for Savanna, Grand River, Mangrove, Desert and Volcanoes. Canyon retains the original trees.

The five production biome manifests now reference compact packs under assets/trees-20261026, including the reviewed LOD0 and generated LOD1/2. Candidate textures are promoted out of the excluded laboratory directory. Non-tree geometry, profiles, distribution and mangrove ferns are unchanged. Originals remain recoverable in Git and the comparison captures.

Validation: 16 texture-map, ownership and resource-lifecycle tests pass; Vite production build passes. Byte comparison confirms unchanged non-tree geometry and unchanged Canyon manifest. All promoted manifests are free of visual-lab paths.

Geometry pack sizes before → after (bytes): Savanna 9713768 → 7844232; River 8121690 → 5778798; Mangrove 8178664 → 5319800; Desert 5157708 → 4094528; Volcanoes 6266000 → 4988740. These are geometry bytes, not total installation savings or new performance measurements.

Remaining integration: distant impostor atlases still depict the prior trees. Regenerate and visually validate these separately; the 3D selection is now active by default. No merge to main or push of unrelated branch work.
