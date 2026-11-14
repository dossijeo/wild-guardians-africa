# Renewed work centers — integration in progress

The five user-supplied compressed GLBs are preserved under `content/source/work-centers/renewed`, with hashes and ZIP provenance. No external CC0 provenance is asserted for user attachments. Village buildings are unchanged.

## Current pipeline

Run Blender 4.5.3 headless with `tools/lighting/prepare_renewed_centers.py`. It generates editable `.blend` files, normalized GLBs, a candidate catalogue and normalization/repair reports under `test-results/renewed-centers`. Uniform scale fits all three former bounding dimensions and preserves proportions. The initial height-only experiment expanded some footprints and failed three access/logistics tests; it is superseded. Old plaster and roof-cap patches are not applied to the new topology.

The runtime catalogue is `public/content/destruction.json`; the legacy extraction manifest remains immutable. Installed GLBs use the existing lossless Meshopt pipeline and WebP policy. Existing EXT_texture_webp image references now survive recompression, including correct lossless normal-map classification. Native hulls are regenerated with `node tools/prepare_center_footprints.mjs`.

Five fresh 1024px AO atlases (32 Cycles samples, AO node 16 samples) are retained with provenance under `content/source/work-centers/renewed/ao`. Runtime copies are achromatic 8-bit PNGs at the existing culture atlas paths, with geometry/output hashes. AO remains opt-in via `cinematicAO=1`. Uniform scaling preserves the other four bakes because their AO distance scales with model height. Saheliana was rebaked after the repair below.

## Sahelian roof repair

The supplied asset showed black areas on the intact roof. The independent `center-material-check.html` reproduced these without destruction or added AO. Its new backface toggle made the largest apparent hole disappear, isolating a winding problem rather than missing cap geometry.

`repair_renewed_sahelian_roof.py` identifies 77 exposed downward-facing polygons using downward rays within the inspected roof band. It reverses their winding and rebuilds only their corner normals from outward surface normals. Merely negating authored normals was insufficient: some authored corners already opposed their polygon normal, producing a large brown patch in the native shader. The final correction removes that patch in WorldScene (`saheliana-repaired-native-ao.png`).

No vertex positions, UV coordinates, triangle counts or footprints are changed. No new cap is added. Split normals elsewhere remain untouched. Exported vertex count increases through corner-normal splits. The script deliberately rejects an unexpected number of faces so a future source replacement cannot silently reuse this asset-specific fix. Original supplied GLBs remain unchanged. Small dark gaps/shadows around the modeled planks remain part of the source detail; this is not a wholesale roof redesign.

## Verification and limits

- All five cultures loaded in native `WorldScene` on spatial-WASM savanna with cinematic light/AO/contacts and no reported errors. Saved screenshots cover Suajili, Etiope, Mapungubwe, Saheliana and Musgum. Etiope and Musgum also have night views. These are fixed-angle checks, not all-biome/all-camera acceptance.
- The dimension-fit integration previously passed 58 selected building/AO/kernel/center/repair/logistics/entry/tutorial-placement tests. After the roof repair, 27 building/AO/center/WebP checks were rerun successfully, including native destruction processing. Generated Sahelian footprint coordinates are unchanged; only its source hash changes.
- The final normalized candidates, including the repaired roof, were inspected in the isolated native destruction viewer at 1 s of collapse and at 4.2 s total: all five showed smoke/debris and reached `ruined` with zero remaining collapse time. Screenshots: `repaired-collapse-one-second.png`, `repaired-collapse-complete.png`. This does not replace full gameplay repair testing.
- Historical `collapse.png` and `native-check.json` used the superseded height-only candidates. They establish early kernel/visual behavior only, not acceptance of final runtime assets.
- Complete gameplay repair/collapse, saved-layout compatibility, all-culture night inspection and comparable performance/size acceptance remain open. Dimension bounds alone do not prove every historical layout remains valid. Runtime assets are larger than the supplied Draco files; no equivalent download-size claim is made.
