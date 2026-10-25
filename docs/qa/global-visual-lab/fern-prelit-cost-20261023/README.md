# Engine-baked fern lighting + solar shadow quads: first experiment

2026-10-23, based on d90bb6ca3 plus QA files. Requested by user. Production remains unchanged. Native fern shader/depth shader rendered into8orientation day/night sprites and separate solar ground shadow. Near and far BOTH replaced by8triangle shallow composite plus2triangle shadow quad, same instance positions/counts. No live normal sampling or fern shadow casting. Wind frozen, outside-object shadow reception absent. These differences mean this is NOT an equivalent-image optimization.

## Performance

Intel UHD0x9A60/ANGLE D3D11,1280x720,medium,seed712,populated paused scene,8m camera oscillation,full backgrounds. ABABday/night,60warmup+90samples each GPU/cadence pass.720valid queries, no captured errors/disjoint/pending/overflow, same saved scene and camera sequence. Same-variant repeat draws/triangles and initial resources match exactly.

| Pass | Time | GPU mean ms | CPU render mean ms | Frame interval mean ms | Interval p95 ms |
|---|---|---|---|---|---|
| Native1 | day |21.802|9.464|29.956|37.700|
| Prelit1 | day |20.066|7.270|25.660|33.500|
| Native2 | day |21.534|7.857|27.642|35.200|
| Prelit2 | day |19.595|7.529|27.663|38.700|
| Native1 | night |23.378|8.190|29.944|35.600|
| Prelit1 | night |20.906|7.221|26.389|33.800|
| Native2 | night |22.410|7.807|28.460|34.200|
| Prelit2 | night |20.515|6.760|25.926|33.200|

GPU saves1.736/1.939ms day,2.472/1.895night. Cadence improves4.296ms firstday, worsens0.021ms secondday with worsep95; night improves3.555/2.534ms. Mean whole-frame calls123.3->90.4, triangles907905->424441. Shadow quads add2color draws but removing dynamic fern shadow casting reduces whole-frame work. Do not attribute this entire gain to fragment lighting alone: geometry, animation and shadow work all changed. No active campaign or modest-profile guarantee.

Three2048x256 RGBA8 mip atlases require nominal8MiB, not measured VRAM. QA retains original near source textures/materials for disposal; not optimized residency. Atlas mip boundaries, alpha coverage and overlap were not quantitatively audited. A quad uses alpha blending and can darken overlaps repeatedly; fixed0.55solar opacity is a diagnostic approximation, not physically equivalent direct-light attenuation. Solar shadow alpha is multiplied by1-uNight; it vanishes atnight. Prelit day/night colors mix after original tone mapping, another non-equivalence during dusk/dawn.

## Visual decision

Sixteen actual captures in ../fern-prelit-review-20261023:close/game/reverse/topdown,day/night. All8pairs have identical camera,target,time,origin and near/far instance counts. Inspected close day/night side-by-sides: near foliage is flatter with poorer separated fronds; color changes, and static shadow overlap differs. Do NOT replace approved Mangrove art with this version. Retain as proof that precomputation has measurable GPU potential. Next controlled refinement should preserve close geometry/wind and dynamic external shading, or limit approximation to genuinely distant patches; then remeasure rather than promise the same savings.

## Reproduction

Vite5190:
1. node tools/experiments/run-native-fern-sprite-bake-20261023.mjs
2. node tools/experiments/capture-prelit-fern-20261023.mjs
3. python tools/experiments/review-prelit-fern-20261023.py
4. node tools/experiments/measure-prelit-fern-20261023.mjs
5. python tools/experiments/audit-holly-fern-shadow-20261023.py docs/qa/global-visual-lab/fern-prelit-cost-20261023

The runtime QA loads bakes from docs/qa/global-visual-lab/fern-native-sprite-bake-20261023. No main, simulation or native renderer code changed.
