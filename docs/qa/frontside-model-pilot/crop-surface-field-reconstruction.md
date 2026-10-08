# Surface geometry and source shading charts

The read-only Blender 4.5.9 audit completed with exit code 0 inside the exec call (reported wall time 5.23 seconds). No ongoing session or live PID was returned, no candidate was generated, and nothing was rendered. Reproduce with:

```powershell
& .cache/frontside-model-pilot/tools/blender-4.5.9-windows-x64/blender.exe --background --python tools/frontside_blender_surface_field_audit.py
```

The source leaf regions contain 2/8/11/20/38 geometric connected components across the five maize stages when exact positions are used for diagnostics. Per-leaf UV corners have 0/0/2/0/6 collisions with distinct position/normal fields. Adult and mature maize therefore already provide counterexamples to one source field indexed only by UV within a leaf. The absence of corner collisions in the other stages does not prove injectivity inside triangles.

The mature source also has coincident-position edge junctions and winding conflicts under geometric welding. These diagnostics do not authorize welding: a geometric position may have separate UV/normal corners, coincident surfaces or semantic interfaces. Preserve those identities rather than treating every seam as a physically open edge that needs a cap.

The next model route is approximate surface reconstruction with separate source shading charts. This differs from preserving every source boundary sample or analytically identical interpolation. The earlier 50 micrometre and normal-angle filters belong to the rejected constrained operation; they are not universal acceptance gates for an authorized new model. The existing independent image/map/shadow/resource/GPU gates remain unchanged.

Before generating a pilot, build source charts with explicit original face/corner IDs, retain semantic regions, distinguish actual open edges from chart seams, and test interior UV overlap. Derive geometry independently of training/heldout cameras. Keep original crop bridge buffers and their drivers intact; validate native-to-bridge endpoints and the growth continuum separately.

A possible auxiliary field preserves chart UV and normals on a reduced surface. It must retain existing base/normal maps and material identity and have an explicit field-error report. Source normals are normalized after nonuniform growth scaling at each original vertex before interpolation; normalizing a sampled rest field after interpolation is not generally equivalent. Likewise, nonlinear fold/wind must be evaluated at original correspondence points before estimating deformed-field error. Field sampling cannot replace silhouette, coverage or shadow geometry.

Record auxiliary resolution, encoding, filtering/mips, chart padding, ambiguous cells, decoded bytes, resident textures and shader fetches before a quality pilot. A barycentric source-triangle table is a distinct, potentially expensive option; a simpler sampled normal field is approximate and requires visual evidence. Neither is implemented or approved by this audit. No triangle saving or raster-culling ceiling is inherited as net GPU improvement.

First compare the new geometry with DoubleSide against the original, including real shaders and source repeat controls. FrontSide and geometric reverse surfaces come afterward, based on physical surfaces and independent validation. Keep a rejected DoubleSide model out of FrontSide benchmarking. Any partial adaptation must state its remaining DoubleSide surfaces and include extra groups/draws/shadows in the eventual paired benchmark.
