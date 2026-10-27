# Depth demand attribution

Single active Manglares diagnostic: 95 depth requests, all locomotionVfx. The worst CPU frame (46.65 ms) includes a world render to the depth target of 24.03 ms and color render of 3.94 ms. Next worst: depth19.58/color7.19 ms. CPU call wall time, not GPU execution. No claim of redundant depth: soft particles intentionally sample it.

Native dust stepMode sampling every0.05s through1.6s found every emitted sprite has positive soft and alpha; sprites disappear around1.35s. Therefore replacing any-sprite demand with positive-soft demand alone does not solve the observed cost. Do not implement that as the solution.

Investigate conservative screen-region restriction for depth capture: retain full resolution, valid coordinates and depth precision; clear and render only the union of projected soft-particle regions, accounting for camera, billboard extents and near-plane crossings. Full fallback required when bounds cannot be proven. Measure CPU submission/culling as well as GPU rasterization; scissor alone may not fix CPU stalls. Preserve all occluders intersecting the region. No implementation accepted yet.
