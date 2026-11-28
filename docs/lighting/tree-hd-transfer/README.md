# Savanna HD atlas: geometric UV transfer

## Delivered result

`original-transfer/sabana-original-hd.glb` is the **complete original sabana.glb** with the HD material and UVs assigned only to its four large trees. Other biome surfaces retain their material and UVs. The editable Blender file accompanies it. This is an offline deliverable, **not installed in the game**.

The donor is the user-provided `sabana_hd _1_.glb`; the original came from `sabana.glb` inside `Desktop/Wild Guardians New/biomas.zip`. Source SHA-256 hashes are recorded in `original-transfer/verification.json`.

## Correspondence and preservation

- Group connected surfaces, joining coincident positions only for correspondence. Never assume source and destination vertex indices match.
- Normalize each candidate by uniform height and its bounding-box center/base, without modifying output geometry.
- Match surfaces in both directions. All four complete original tree surfaces match the donor; maximum reverse surface error is zero in this run.
- Select donor triangles by destination triangle centroid; interpolate UVs at each destination corner. This keeps the correct side of UV seams. Reject any corner more than 0.00001 normalized units from its selected donor triangle.
- Largest measured corner/triangle error: approximately 0.00000127 of tree height.
- Positions, polygon indices and object transforms have identical pre/post SHA-256 fingerprints in Blender.
- Re-import the exported GLB and compare **all 28,600 world-space triangles**, independently of vertex/index ordering. Every triangle is preserved to six decimal places. Export may split/reorder vertices to encode material/UV seams; it does not replace or deform surfaces.
- The donor base color, tangent-space normal and metallic/roughness maps remain attached and exported. Export re-encodes embedded images; this is not a byte-identical container. No texture enhancement or recoloring was applied.

## Visual inspection actually performed

Blender 4.5.3 Cycles, identical camera/light for the original-versus-transferred overview. Inspected both overviews plus front/rear close views of all four trees (see `original-transfer/close-views.jpg` and individual PNGs). Bark stays on trunks/branches, canopy color stays on crown surfaces, and the rock at tree 2's base stays rock-colored. No projection holes appeared in this direct transfer. The donor's color/detail differs from the old atlas, especially the sparse second tree; retaining its maps does not imply identical painting or a guaranteed subjective quality improvement.

These are offline Blender checks, **not a successful in-game near-camera texture-switch test**.

## Important production mismatch

The four trees currently in this branch's `public/content/biome-savanna.json` were replaced through the October 26 tree pack. They are **different meshes from the original sabana.glb**. LOD0 vertex counts are 5567, 4311, 4791, 2265. The HD donor's complete four-tree mesh has 9154 vertices. Vertex counts alone are not the incompatibility test: `surface-audit.json` records the nearest-surface comparison after uniform alignment. Current-to-donor p95 errors are about 7.88%, 14.44%, 6.94%, 7.53% of tree height.

An exploratory selected-to-active rebake onto the current production UVs was visually rejected: canopy/base projection gaps and incompatible normal projection produced dark patches. Confidence blending still left defects. Those maps are not installed or presented as a completed transfer. It would be incorrect to silently substitute the older geometry merely to make the HD atlas fit.

Integration therefore depends on resolving which tree generation should remain authoritative. No production asset, runtime material, placement, AO or LOD was changed by this deliverable.

## Reproduce

Run from the repository root with Blender 4.5.3. Supply the extracted original and the user's donor explicitly:

```powershell
blender -b --python tools/trees/transfer_original_uv.py -- --source 'PATH/sabana.glb' --donor 'PATH/sabana_hd.glb' --output 'PATH/output'
blender -b --python tools/trees/verify_original_transfer.py -- --source 'PATH/sabana.glb' --donor 'PATH/sabana_hd.glb' --output 'PATH/output'
blender -b --python tools/trees/render_original_transfer.py -- --source 'PATH/sabana.glb' --donor 'PATH/sabana_hd.glb' --output 'PATH/output'
blender -b --python tools/trees/audit_hd_correspondence.py -- --source 'PATH/sabana.glb' --donor 'PATH/sabana_hd.glb'
```

The audit reads current production geometry without modifying it and writes `surface-audit.json`. The transfer fails closed if full bidirectional correspondence or individual triangle-corner coverage fails. This tool targets the supplied triangulated, connected-tree source layout; it is not a general semantic retopology or universal asset-matching tool.
