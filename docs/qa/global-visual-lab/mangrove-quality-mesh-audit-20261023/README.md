# Mesh state across medium restoration

Current fixed512, medium/day. Captured mesh identity, geometry/count, world matrix, visibility, shadow flags and material basic properties/cache keys per quality sample. Most common meshes remain unchanged. One retained instanced mesh changes count 2→0; two native-obstruction-blend meshes change visible false→true. Eleven merged meshes are replaced with new geometry IDs, with reordered counts (aggregate population appears similar; exact instance content not yet hashed). Full records and mesh-differences.json included. These observations identify presentation changes but do not prove which causes the screenshot discrepancy.

A separate no-water diagnostic in ../mangrove-quality-no-water-control-20261023/ hides every water material only for capture and restores visibility immediately afterward. Manual image inspection confirms the pond surface is absent. Differences persist at 25,287 / 25,374 pixels (MAE .299 / .308). Therefore visible water shading is not the dominant source, despite earlier coarse localization including the pond region. Large changed RGB samples fall on vegetation/shadowed pixels. Next focus: exact instance selections and depth-caster content, including obstruction and fern rebuilds.

No production changes, no density reduction retained. Diagnostic no-water images are NOT artistic candidates or performance evidence. Captures made with QA wrappers are not full-equivalence acceptance. Standard and no-water runs report no browser errors.

Reproduce standard WG_FIXED_QUALITY_PROBE=1 with fixednative/day/media, static normal camera, cadence10/warmup30. For no-water add WG_QUALITY_HIDE_WATER=1. Use separate WG_REVIEW_OUT directories with tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs.
