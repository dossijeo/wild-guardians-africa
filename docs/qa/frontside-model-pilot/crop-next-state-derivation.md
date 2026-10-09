# Next representative crop state

The demonstrated mature maize route is now parametrized for a single further source mesh, not bulk category conversion. Proposed next pilot is `maiz_02_joven` with the same per-driver leaf ratio. Run only in a coordinated Blender window:

`blender --background --python tools/frontside_blender_leaf_reduction.py -- --mesh maiz_02_joven --ratio .5 --report docs/qa/frontside-model-pilot/maize-young-leaf-reduction-diagnostic.json`

Every non-default experiment requires a separate owned report path. The generator hashes the original GLB, preserves original core PN/UV corners exactly and derives each authored leaf label independently with its UV/custom-normal layer. It archives a content-addressed corner payload; originals/materials/pivots/source morph mappings are never overwritten. Forward/reverse triangle/vertex/API geometry-byte estimates are diagnostics, not native budgets or visual approval.

Before runtime adaptation: encode a separate binary, validate Float32 values/labels/core IDs against its source, retain original→derived correspondence and report source state/static geometry plus added coexistence/category/web bytes. Reusing unchanged native bridges is an explicit partial QA choice; changed triangles must never be silently presented as source bridge face IDs. Any actual new bridge mapping needs verified regeneration. Evaluate the preceding/following morph seams in the native sampler, moving wind, effective shadows and original maps. Pixel differences are diagnostic under policy3, while recognizable form, behavior, compatibility/resources and net GPU remain required.

No second-state candidate has yet been generated or approved. Four other maize stages, other crop species and workers remain in scope. No GLB activation, production replacement or category PR is implied by parameterizing this tool.
