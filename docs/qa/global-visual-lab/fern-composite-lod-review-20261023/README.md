# Fern composite far LOD — first diagnostic

Source46d63c8f8. Approved near ferns unchanged. Blender5.2.2 bakes the approved four-frond curved geometry and CC0 source maps into512px color/normal composite, footprint2.12m. Row-average analytic curvature is encoded into module-space normals. CC0 attribution inherited from holly-fern-frond-20261023/source.json. No AI image generation.

QA replaces only far geometry32triangles with a2triangle horizontal card at.18m; retains original instance selection/counts, masks, materials, depth casting and wind behaviour (existing far fronds have no vertex wind). New maps add approximately2.67MiB nominal RGBA8 mip payload; old near maps remain. This is one composite per existing far clump, not yet merged multi-clump patches. It tests projection before introducing coarser distribution.

Twelve real captures, seed712,1280x720,medium,day/night,close/game/reverse. All six pairs match camera,target,time,render origin and near/far instance counts; no recorded shader/GL/browser errors. Final world-pass triangles334495->291925 (818near/1419far),392455->346735 (978/1524),385522->324652 (301/2029); same counts both times. Draw calls unchanged in design; no GPU or FPS claim. Triangle reduction alone is not evidence of a performance win; alpha overdraw and shadow cost still need timing.

Inspected close daytime side-by-side (native LEFT, candidate RIGHT). Foreground preserves approved fronds, but distant horizontal patch is flatter/darker with a visible boundary to the middle-distance leaves. Do not promote this candidate. Baking alpha/normals alone does not preserve an oblique silhouette. Normal rotation, approximate root-tip radial lighting and silhouette support require refinement; this is not an approved visual result.

Next: shallow raised composite geometry and projected-size/view-angle selection, with explicit top-down views and transition motion. Current capture set is not a top-down validation. Do not reduce density or remove shadows to hide the failure. Approved native art remains untouched. No simulation/main changes.

Reproduce:
1. node --input-type=module export fernClumpGeometryData from src/rendering/mangrove-fern-geometry.js into tools/experiments/fern-composite-source-20261023.json (provided snapshot).
2. Blender headless --python tools/experiments/bake-fern-composite-lod-20261023.py.
3. Vite5190: node tools/experiments/capture-fern-composite-lod-20261023.mjs.

Offline source JSON and bake script included. Composite maps are experiments under public/assets/visual-lab; only the QA route imports qa-fern-composite-lod-20261023.js. Native code never imports it. Captures and side-by-sides retained as evidence of the rejected flat projection.
