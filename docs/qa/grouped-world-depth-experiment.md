# Grouped world-depth preparation experiment

`withDepthCaptureMaterials(..., {materialArrays: true})` is an explicit QA
option. Default remains false; no production caller enables it. This addresses
the repaired-maize adapter's multiple color materials without assuming that its
original DoubleSide shadow depth matches FrontSide color rasterization.

The option permits a separate scalar `object.customWorldDepthMaterial`, checked
against every source material with the existing compatibility rules. It never
replaces or mutates the object's Three.js `customDepthMaterial` shadow owner.
Even a shared authored recipe replaces an array with an array: geometry material
indices and uncovered index gaps remain intact rather than drawing all indices.
Without authored depth, eligible stock groups receive their own standard depth
materials, retaining array indices, alpha textures/tests and rasterization side.
All groups must qualify; otherwise the entire original material array remains.
Override, transparency, unknown shader, clipping and raster exceptions retain
the conservative fallback. Object/material identities and flags restore even
after a throwing render callback. Explicit world-depth owners bypass the
optional empty-owner shortcut until their callbacks are separately audited.

Directed depth-capture tests cover authored FrontSide versus retained DoubleSide
shadow ownership, array identity after failure, per-group side/alpha, one unknown
group forcing complete fallback and side/alpha mismatches. Existing default
recipe, restoration, empty/hidden-owner and compatibility-cache tests also pass.
No asset was modified. A renderer must still prove deformation, alpha/discard,
growth and silhouette equivalence; a tag or unit test does not prove those.

This is preparation for separate real VFX/depth image and GPU measurements,
not performance acceptance. Do not inherit the synthetic maize color benefit,
activate the option in gameplay or promote repaired assets before that evidence.
