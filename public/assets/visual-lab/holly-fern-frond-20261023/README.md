# Holly fern single-frond raster

Source: user-supplied `cc0___holly_fern_cyrtomium_sp..glb` by **ffish.asia / floraZia.com**, CC0-1.0. Original listing: https://sketchfab.com/3d-models/cc0-holly-fern-cyrtomium-sp-709a2e45225a405d96c3a3fa43601f79 . Hash in source.json. Original model is unchanged and is not included here.

Blender 5.2.2 Cycles orthographic raster, 16 samples, 1024 RGBA. One complete frond (Object_6 through Object_11); calibration chart excluded. Color uses source unlit texture, no new baked directional illumination. Normals encoded linear module X/up/Z. Images visually checked: green front, stem at bottom. Runtime flips texture Y and anchors UV y=.02 at clump centre.

Four curved, low radial fronds per clump, 16 triangles total, upward lighting normal plus 18% lateral baked detail. Shared color/normal textures; approximately 10.67 MiB RGBA8 including full mip chains (estimate, not measured VRAM). Alpha cutout .5, depth write, no alpha blending, no individual shadow casting. Dense approved base retained in the hybrid QA experiment.

Rebuild: Blender -b --python tools/experiments/bake-holly-fern-frond-20261023.py (requires original source path).
