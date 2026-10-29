# Renewed work centers — integration in progress

User-supplied original compressed GLBs are preserved in content/source/work-centers/renewed, with hashes. No external CC0 provenance is asserted for user attachments.

Run Blender 4.5.3 headless with tools/lighting/prepare_renewed_centers.py to generate editable .blend files, normalized GLBs and a candidate destruction catalogue under test-results/renewed-centers. Uniform scale matches former heights; orientation is preserved. New XZ dimensions differ, especially Mapungubwe/Musgum; native footprints, access and placement must be reconciled before runtime installation. Former plaster repair and Sahelian roof-cap patches are not reused on unrelated topology.

Five 1024px AO atlases have been freshly baked with tools/lighting/bake_building_ao.py (32 Cycles samples, AO node 16 samples), retained with hashes under source/renewed/ao. They are not yet wired into the production lighting atlas.

The actual native destruction kernel processes all five candidate models with finite body/ash buffers. Browser buildings.html?renewed=1 displays all five with original supplied colors, localized 65% damage, smoke and full 3.2s collapse to ruined; collapse.png captures the final state. This standalone viewer does not validate production terrain, navigation, worker accesses, new AO lighting, continuous collapse quality, or repair gameplay. These remain pending. Runtime destruction.json and production footprint geometry are unchanged until integration validation.

## Runtime integration update

The five renewed sources are now selected by public/content/destruction.json. Runtime copies use the existing lossless Meshopt pipeline and WebP texture policy. The compressor now preserves existing EXT_texture_webp source references (the initial native-world load caught the missing reference bug); a regression repacks an already-WebP model and checks image references and normal classification.

Scale was revised to fit all three former bounding dimensions uniformly, rather than match height alone. The first height-only integration failed three access/logistics tests because expanded buildings occupied previously valid sites. The dimension-fit revision passes all 58 selected building, AO, original-kernel, center, repair/logistics, native-entry and tutorial-placement tests. Native center hulls were regenerated from the selected geometry. This is not a guarantee of unchanged topology for every old saved layout.

New AO is installed in the existing culture atlas paths as achromatic 8-bit PNG, with geometry/output hashes. Its bake radius scales with uniform geometry scale, preserving the newly baked visibility. The legacy destruction extraction manifest remains immutable; current AO verification and baking now use the runtime catalogue.

Suajili was loaded and inspected in the real WorldScene with spatial-WASM terrain and cinematicLight/AO/Contacts enabled, with no reported errors (suajili-native-ao.png). Full five-culture native-world day/night, repair and saved-layout compatibility visual validation remains pending. Earlier standalone collapse images used the prior height-only scale. AO remains behind the existing cinematicAO option; no new default-lighting change is implied.
