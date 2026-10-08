# Mature maize stem alternatives (offline only, not approved)

Original leaves and soil remain exact; driver1 is the only proposed derivative.
All derived stem faces would get their geometric reverses, rather than selecting
backs from view masks. Native state/continuous growth bridges, shader maps,
shadows and net GPU benefit must all be validated before promotion.

Blender4.5.9LTS headless frontside_blender_stem_reduction.py reproduces four
corner archives with unchanged soil/leaf bits and new label1 stem triangles:

| Ratio | Stem tris | Whole state with all stem reverses | Tris delta | Shared state bytes delta | Max sampled distance |
| --- | ---: | ---: | ---: | ---: | ---: |
| .75 | 618 | 5347 | +8.35% | +.356% | .03895m |
| .60 | 494 | 5099 | +3.32% | −2.68% | .03895m |
| .50 | 412 | 4935 | 0% | −4.72% | .04439m |
| .40 | 329 | 4769 | −3.36% | −6.74% | .05416m |

Original stem824triangles; whole state4935triangles/317066bytes. Byte estimates
include shared32byte POSITION/NORMAL/UV vertices and forward/reverse indices,
with a private reverse material recipe, not duplicated normals/UV/flags. They
exclude bridge driver lanes, full category, private material/GPU memory, web
compression and actual vertex shader invocations. UV and normal interpolation
change. Distances sample new corners/centroids against the original stem surface,
not a bidirectional geometric bound or raster guarantee. Up to3.9cm displacement
at .75 is a serious quality risk; passing cost is not passing image quality.
No GLB/fixture/bridge data is exported yet. Before any culling screen, a training
derivedDouble versus originalDouble comparison must pass unchanged image gates.

Alternative frontside_crop_stem_constrained.mjs uses Meshopt attribute-aware
simplification with original vertex buffers unchanged, normal weights .1/1/10,
UV weights1/10, absolute error limits1e−5/1e−4/.001/.003/.01, LockBorder/Sparse and
optional Permissive. All60configurations miss the cost gate: minimum781stem tris
does not fund every reverse under+10% whole-state triangles. The error metric is
an approximation, not raster/map equality. This negative has no geometry export;
original positions/normals/UV values remain unchanged, while any new interpolation
would still need visual validation. Packing/index savings are separate from culling.

Receipts: maize-blender-stem-reduction-diagnostic.json and
maize-stem-constrained-simplification-diagnostic.json. Old leaf decimation and
held-out bridge-hole negatives remain intact; this proposal does not approve or
reinterpret them. New topology requires rebuilt labels/region/bridge contracts
and continuous growth coverage, never reuse of old face identities as if unchanged.
