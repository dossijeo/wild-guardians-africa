# Front arch alignment study I: retain F

This study returns to the user's specific concern: the upper arch relief and its cream zigzag must agree. It audits F and compares two localized Blender paint trials without changing geometry, silhouette, normals, UVs or the 2048 x 2048 atlas. Neither trial is adopted as a runtime variant; F remains intact.

## What is established, and what is not

All 117 segments in F's front-arch paint route correspond to actual edges of the E/F runtime mesh. Endpoint matching, after coordinate welding, differs by less than 0.000001 metres at world scale. `edge-verification.json` records every segment. Thus the route is not an arbitrary projected zigzag crossing triangle interiors.

That is **not proof that the perceived relief is artistically resolved**. Seven routed segments have stored crease angles below 12 degrees (minimum 4.84 degrees), so some lines follow shallow folds rather than strong visible ridges. The mesh also contains uneven bevel widths and corners. Following an edge exactly does not make those varying surfaces appear uniform, nor establish that every selected edge is the best artistic interpretation of the motif. F still shows uneven apparent white width, especially at the crown and side transitions.

The front arch already has a continuous unfolded chart from D, retained by E/F. Its reserved strip contains no unrelated workshop face bounding boxes (x >= 1800, y < 1792 texels). Moving or enlarging this chart alone is not a demonstrated solution to the remaining perceived mismatch.

## Trials and visual judgement

**I1, `thin`:** re-evaluates paint at actual texture texel centres `(pixel + 0.5) / 2048`, with 4x strip supersampling, and reduces nominal full line width from 2.88 cm to 1.92 cm in world space. It preserves the exact F route and cream colour. The thinner line reveals a little more terracotta, but does not clearly improve the relief's legibility at the normal camera or at night. It still inherits the shallow-fold route and irregular corners. Do not call it a solved alignment fix.

**I2, `bevel`:** starts from I1 and coats 31 selected inclined triangles incident to zigzag edges with cream pigment. Those faces have a radial-normal dot magnitude below 0.90; their explicit IDs are stored in `bevel/alignment-audit.json` and the editable Blender scene. This makes pigment occupy part of the physical bevel rather than only a narrow line at its edge. It widens some sections without making the entire band more coherent. The motif's varying width remains conspicuous; no clear improvement justifies replacing F.

An initial bevel selection was empty because float32/float64 rounded coordinates did not compare as identical dictionary keys. The final script uses integer coordinate keys and asserts a nonempty selection; the final audit and captures contain 31 painted bevel faces. The empty-selection renders were overwritten, not treated as an artistic result.

Keep F. Do not enlarge the atlas or change geometry to disguise this result. A future attempt would need visually authored ridge/bevel selections around the complete motif, with convincing close and game-distance evidence; these two local treatments do not supply that evidence.

## WebGL evidence and resource cost

`baseline/`, `trial/` and `bevel/trial/` hold 24 Chrome WebGL images: arch diagnostic, facade, awning and medium, day/night. Every trial camera and target matches its F baseline. Times remain 150/350 and viewport 1280 x 720. Medium shows the scene; the other views isolate the workshop. Texture overrides are recorded in each capture manifest, and the same `village-details-*` filenames identify the unchanged runtime geometry. These are renderer fixtures, not campaign screenshots.

| Texture | WebP bytes | Delta versus F |
| --- | ---: | ---: |
| F | 708,626 | 0 |
| I1 | 707,220 | -1,406 |
| I2 | 708,972 | +346 |

Both reuse the 429,056-byte E/F geometry and add no material, normal map or runtime draw structure. Estimated extra RGBA8 mipmapped texture allocation remains 21.33 MiB versus original A, unchanged versus F. CPU/GPU and draw calls were not benchmarked; there is no timing claim. Source assets and neighbour resource references are untouched.

Six village invariant tests and capture-script syntax check pass. No runtime source or shipped texture changed, so the existing F production build remains applicable.

## Reproduce

Run Blender headless with `tools/experiments/blender-paint-workshop-arch-alignment.py`. Default mode is `thin`; set `WG_ARCH_MODE=bevel` for I2, saved under `bevel/`. The script culls edge segments outside each triangle's expanded bounding box to avoid evaluating distant segments that cannot contribute pigment. Encode PNG to WebP quality 95, effort 6.

Capture with `WG_ART_VARIANTS=village-details`, `WG_ART_VIEWS=arch,facade,awning,medium` and the appropriate `WG_ART_OUTPUT`. Baseline has no override; I1/I2 use `WG_ART_TEXTURE_OVERRIDE` pointing to their respective local WebP. All evidence remains in this folder; no new runtime flag or main-branch change is made.
