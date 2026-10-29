# Renewed work centers — integration in progress

User-supplied original compressed GLBs are preserved in content/source/work-centers/renewed, with hashes. No external CC0 provenance is asserted for user attachments.

Run Blender 4.5.3 headless with tools/lighting/prepare_renewed_centers.py to generate editable .blend files, normalized GLBs and a candidate destruction catalogue under test-results/renewed-centers. Uniform scale matches former heights; orientation is preserved. New XZ dimensions differ, especially Mapungubwe/Musgum; native footprints, access and placement must be reconciled before runtime installation. Former plaster repair and Sahelian roof-cap patches are not reused on unrelated topology.

Five 1024px AO atlases have been freshly baked with tools/lighting/bake_building_ao.py (32 Cycles samples, AO node 16 samples), retained with hashes under source/renewed/ao. They are not yet wired into the production lighting atlas.

The actual native destruction kernel processes all five candidate models with finite body/ash buffers. Browser buildings.html?renewed=1 displays all five with original supplied colors, localized 65% damage, smoke and full 3.2s collapse to ruined; collapse.png captures the final state. This standalone viewer does not validate production terrain, navigation, worker accesses, new AO lighting, continuous collapse quality, or repair gameplay. These remain pending. Runtime destruction.json and production footprint geometry are unchanged until integration validation.
