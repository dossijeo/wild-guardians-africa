# Dense leaf pigment blend candidate

QA candidate: mix original sampled pigment 45% with warm leaf base (.48,.60,.25) 55%, before existing biome tint, per-leaf variation and lighting. Retains the original texture sample, geometry, root positions, growth, density, LOD, shadows and exclusions. No runtime changes and original remains selected.

Twelve captures match reviewed-profile-20261022 exactly in camera/target/time/origin/draw calls/triangles; no recorded errors. Seed712, media, 1280×720, full far impostors and mountains, paused simulation and fixed visual time. Normal day/night and reverse day inspected. Dark patch contrast is reduced with full-sized leaves retained, and texture variation remains. Rectangular spatial boundaries persist, especially reverse view. This is a useful color-integration candidate, not a completed distribution fix; do not claim density reduction as improvement.

Cost comparison started separately in mangrove-pigment-blend-cost-20261022. Do not infer negligible GPU cost from unchanged draw/triangle counts. Native integration, closer material inspection and motion validation remain pending.

Reproduce capture-mangrove-pigment-blend-20261022.mjs then compare-mangrove-pigment-blend-20261022.py. Pair images show original left, candidate right. No simulation or model changes.


## User rejection: insufficient visible leaf presence

User explicitly rejects this pigment blend because leaves become almost invisible against the ground. Unchanged geometric density does not establish preserved perceptual density. Supersedes earlier positive candidate assessment. Do not select or integrate this treatment. The uncommitted native option was removed after its capture completed. Dense original pigment, geometry and selected recipe remain unchanged. Next work must preserve original contrast as well as size and density, and target spatial boundary regularity directly.
