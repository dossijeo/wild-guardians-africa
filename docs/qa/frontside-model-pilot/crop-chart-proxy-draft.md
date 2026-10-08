# Geometry draft for separate source fields

`tools/frontside_blender_chart_proxy.py` is a prepared, syntax-checked generator. At this revision it has not been executed; no payload, output count or measured benefit is claimed.

It partitions original mature-maize leaf faces by regular geometric edge adjacency with opposite winding. Coincident non-manifold edges and same-direction edge pairs are not connected. The new chart interfaces are bookkeeping cuts through the original surface; they are not physical holes and will not receive caps. Original P/normal/UV lanes, face indices, labels and face-to-chart assignments remain in a separate table.

The Blender geometry draft applies half-ratio decimation per chart to study a representation whose shading fields are separate from its geometric tessellation. This does not approve decimation or inherit quality from any previous attempt. It may fail silhouette just as earlier reductions did; source shading fields cannot repair that. The initial payload is a compressed NPZ under the worktree cache, not a GLB, runtime asset or image-comparison candidate. A zero/unsupported chart must not silently disappear in an eventual renderable model.

The following work is still required before DoubleSide QA: unambiguous chart parameterization and source correspondence for each proxy sample; source UV/normal field lookup; original per-vertex growth-normal normalization and deformation evaluation; source-seam and endpoint compatibility; geometry/attribute/shader error measurements; texture encoding/filtering/bytes and resident resources. Actual shader source, derivatives and extra lookups must be included in comparisons. No image, shadow or budget gate changes for this draft.

Only after that can a new DoubleSide pilot be compared against originals. Failure of DoubleSide quality prevents FrontSide adaptation and GPU benchmarking of that candidate. Any valid subsequent Front model must account for geometric reverse surfaces selectively, remaining DoubleSide surfaces, groups/draw calls, bridge behavior and actual net GPU benefit.
