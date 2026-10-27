# Screen-size prelit LOD: topdown ABAB cost

Source e538f1341 plus QA screen-size selector. Intel UHD0x9A60/ANGLE D3D11,1280x720,medium. Same saved populated campaign, paused simulation, day/night, full far backgrounds enabled. Camera38m above target,8m X oscillation. 60warmup90GPU samples + separate60warmup90cadence samples per phase/pass. Native versus screen64px60/68hysteresis prelit+ground-shadow composite; no thinning. Visual equivalence is NOT established.

| Pass | Phase | GPU mean ms | CPU render mean ms | Interval mean ms | Interval p95 ms |
|---|---|---:|---:|---:|---:|
|native1|day|17.383|8.024|22.442|26.400|
|native1|night|18.016|8.110|22.677|25.000|
|prelit1|day|14.841|7.059|20.032|26.600|
|prelit1|night|15.612|6.511|20.774|23.100|
|native2|day|17.235|7.668|22.671|26.900|
|native2|night|21.792|7.676|23.207|26.500|
|prelit2|day|14.942|6.420|19.382|22.800|
|prelit2|night|15.327|6.271|20.654|24.900|

720valid GPU queries, no errors/disjoint/unresolved/overflow. Same camera sequence, saved workers/elapsed/target. Same-variant repeat draw/triangle sequences and initial resources exactly match. Candidate final coverage0near3100far; native1267near1833far. The benchmark uses a saved populated fixture distinct from static shoreline artistic captures (3860instances there).

Day GPU savings2.542/2.293ms (14.6%/13.3%). Night2.404/6.466ms, but native nighttime repeat drifts18.016 to21.792ms; do not advertise6.466ms as stable expected saving. Cadence mean improves2.410/3.289ms day and1.902/2.553ms night. Firstday intervalp95 worsens0.2ms; otherp95 improve. No stable60fps claim, no active-simulation result.

Mean whole-frame triangles871824->332192; mean calls91.11->57.02. Native shadow draws increase304 during each phase measurement scope (both measurement passes and endpoint); candidate46. Current candidate removes dynamic fern shadow casting and wind when all modules become composites. Other scene/camera invalidations still draw shadows. Reduction is a combined geometry/material/shadow result, NOT isolated proof that baked fragment illumination is faster. Ground-shadow alpha blending and textures remain additional costs.

Retains three generated atlases (~8MiB nominal RGBA8 including mipmaps), original near textures, and one extra shadow geometry. Physical VRAM/overdraw not measured. QA screenshot capture consumes no concurrent benchmark GPU work.

Recommendation: KEEP AS A PROMISING ELEVATED-CAMERA CANDIDATE, do not promote yet. Earlier ordinary-camera prelit hybrid regressed day GPU; this result does not supersede it. Need smoother geometric/material transitions, external-shadow reception and matching crown shade, moving pitch/zoom validation, normal-camera ABAB and active-world verification before any native integration. Hysteresis is not a crossfade and near shape is only preserved while selected detailed. Approved native Mangroves unchanged.

Reproduce: node tools/experiments/measure-fern-screen-prelit-topdown-20261023.mjs; python tools/experiments/audit-holly-fern-shadow-20261023.py docs/qa/global-visual-lab/fern-screen-prelit-topdown-cost-20261023. Paired static images in ../fern-screen-prelit-review-20261023.
