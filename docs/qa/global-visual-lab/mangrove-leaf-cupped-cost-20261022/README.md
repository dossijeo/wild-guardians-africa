# Cupped leaf reload benchmark — equivalence incomplete

720 valid GPU queries, no shader/GL errors, identical leaf instance counts across all original/cupped pairs. Added leaf geometry averages13211 triangles on the moving path. However20 frame comparisons have additional non-leaf LOD differences. Summary controls retain every discrepancy.

GPU means: day original18.34/17.68ms versus cupped18.44/18.19ms; night original18.62/19.24ms versus cupped19.13/18.63ms. These do not isolate leaf cost due to workload differences and reload variation. No causal CPU/FPS claim, no rejection of the visual candidate.

Two asset tests pass: finite/index-safe meshes, normalized normals, exact retained four-leaf attributes across near/far endpoints, crease normals retained. They do not substitute for motion validation.

Next control swaps only leaf geometry in one resident world, retaining its buffers. See the separate single-world study; preserve this failed equivalence attempt rather than replacing the data. Reproduce with measure-mangrove-leaf-cupped-cost-20261022.mjs and audit-mangrove-leaf-cupped-cost-20261022.py.
