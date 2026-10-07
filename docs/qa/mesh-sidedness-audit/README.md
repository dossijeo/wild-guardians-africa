# Conservative topology audit before backface culling

Offline native packed geometry on main `bc1b750f`: all 360 biome-prop LODs (twenty slots × three levels × six biomes) and 46 village units across five cultures. Village checks use each unit's actual indexed draw range, not its complete shared position buffer. No runtime source, material, shadow, geometry or asset is changed.

The tool welds indexed positions on a 1e-5 quantization grid, checks edge incidence/direction, degenerate triangles and positive signed volume per connected component. Five synthetic self-checks cover a closed outward cube, reversed winding, an open quad, a doubled zero-volume triangle and interleaved positions. The filter is deliberately strict; rejection is **not** proof of a broken model or proof that FrontSide can never work. Open surfaces may be safely culled in constrained views, and overlapping art components can fail manifold tests while rendering correctly.

Only four of 406 entries pass every condition:

| Biome | Slot | LOD | Triangles |
| --- | --- | --- | ---: |
| Sabana | Huesos | 0 | 880 |
| Gran Cañón | Cráneo y huesos | 0 | 448 |
| Gran Cañón | Cráneo y huesos | 1 | 428 |
| Desierto | Cráneo y huesos | 0 | 770 |

No prop passes at all three LODs. Current prop loading shares a material across those LODs, so the audit does not justify a category-wide automatic material switch. Counts of entries with a reported boundary/nonmanifold/inconsistent edge are 383/402/252, respectively; reasons overlap and depend on welding tolerance. Normals, UV/alpha, visual interiors, shader clipping, silhouette, shadows and damage are not validated by these topology tests.

Keep production materials unchanged. These tiny shortlisted debris meshes still require visual orbit/shadow comparisons and measured benefit before any switch. Higher-cost drawing/shader/depth work remains the performance priority; this result does not establish an FPS gain or settle all per-category culling opportunities. Buildings that open during destruction, crops, actors and shadow proxies are outside this offline audit.

Reproduce: `node tools/audit_mesh_sidedness.mjs OUTPUT.json`. Compressed full report binds input manifest/binary hashes; summary binds the raw report and tool hashes and preserves the candidates/rejection counts. The full gameplay suite was already running on unchanged runtime sources during this diagnostic; its eventual result must be checked separately.
