# Mangrove folded leaf candidate

Own Blender-authored asset; no external resources. Existing tree/building/character models unchanged. Same eight near/four far leaves, original roots, placement, density, color and masks. New six-sided outline plus centre crease: 48 near triangles,24 far (original32/8). Prepared flatNormal retains the baked normals so far leaves do not average away the crease. Selected near/far leaf attributes match exactly; no endpoint attribute mismatch, all numbers finite. Curved candidate centre is1.8x original height; moderate folded candidate retains original height.

Real low-quality renderer captures: seed712,1280x720, three views/day/night on exposed shoreline soil, full impostors/mountains. Same instance counts1864/1661/1089 and no added calls. Relative to original, +29824/+26576/+17424 triangles respectively. No shader/GL errors. These are QA replacements, not an adopted runtime module.

Visual assessment: rounded contours read more naturally than angular rhombi; stronger crease gives a local relief improvement. It does not yet achieve the full mockup's layered ground cover. Retain both assets, with cupped candidate preferred for further cost comparison. Do not discard on unmeasured performance. GPU/CPU benchmark, motion/LOD verification and medium-quality views remain pending before integration.

Reproduce Blender with tools/experiments/blender-mangrove-leaf-folded-20261022.py, then capture-mangrove-leaf-folded-20261022.mjs against Vite5190. Source modules.blend and JSON attributes retained. Cupped directory includes a1:1 three-way crop.
