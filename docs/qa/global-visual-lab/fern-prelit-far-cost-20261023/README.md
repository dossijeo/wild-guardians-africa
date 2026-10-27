# Hybrid prelit fern far LOD: measured outcome

Source c9a50e2df plus QA far-only module. Approved near geometry/material/wind/shadow casting unchanged. Far32triangle ferns become8triangle prelit composites and2triangle solar shadow quads. Same instances/distribution and2048 shadow map. Existing native far wind is already zero; near wind remains active. Full backgrounds,Intel UHD0x9A60/ANGLE D3D11,1280x720,medium,seed712,populated paused scene.8m camera oscillation;ABABday/night,60warmup+90samples, GPU and cadence separate.

| Pass | Time | GPU mean ms | CPU render mean ms | Interval mean ms | Interval p95 ms |
|---|---|---|---|---|---|
| Native1 | day |21.675|8.451|27.851|33.200|
| Hybrid1 | day |23.402|7.811|27.836|33.300|
| Native2 | day |21.626|8.306|27.721|35.100|
| Hybrid2 | day |23.004|8.448|29.728|37.500|
| Native1 | night |23.345|8.678|29.099|36.600|
| Hybrid1 | night |22.474|7.983|28.297|35.300|
| Native2 | night |23.680|8.091|28.597|34.200|
| Hybrid2 | night |22.604|8.576|28.963|39.100|

720valid GPU queries; no errors/disjoint/discarded/pending queries or overflow. Same saved state/camera sequences. Same-variant repeats exactly match per-frame calls/triangles in GPU/cadence and initial resources. Mean whole-frame triangles907905->864008, calls123.289 unchanged. Extra color-shadow draw offsets removed far shadow draw. Native shadow cache draws304–305 across both passes/preparation/capture in BOTH variants: animated near ferns still force shadow updates. This explains why this hybrid does not eliminate the full shadow pass; it does not by itself explain the precise GPU regression.

Day GPU regresses1.727/1.378ms. Night improves0.871/1.076ms. Cadence is effectively unchanged firstday(-0.015ms), then worsens2.007ms; firstnight improves0.802ms, second worsens0.366ms with worsep95. No overall performance benefit established. Alpha blending/atlas fetches are possible contributors, but overdraw and per-pass GPU attribution are not measured. Do not claim a proven cause.

Resource residency adds1geometry and3textures, repeatable: native day278/133,hybrid279/136;night285/133vs286/136. Nominal atlas payload8MiB with RGBA8 mipmaps, not physical VRAM. Candidate retains original near maps and preserves dense coverage.

Recommendation: do not promote this hybrid as an optimization. Preserve approved native version and all QA artifacts. This result does NOT refute all precomputed lighting: the previous all-prelit prototype reduced GPU at a visual cost, while this particular near-native hybrid retains nearly all shadow update work. Further work needs a new measured mechanism, such as preserving near shape with cheaper lighting, not simply increasing the far range or deleting shadows. Current far sprites still miss external-object shadow reception, interpolate tone-mapped day/night colors and use approximate overlapping solar shadow alpha. Continuous transitions/projected-size selection remain unvalidated; do not expand current artifact into production.

Reproduce Vite5190: node tools/experiments/measure-prelit-far-fern-20261023.mjs; python tools/experiments/audit-holly-fern-shadow-20261023.py docs/qa/global-visual-lab/fern-prelit-far-cost-20261023.16paired static capture images and controls in ../fern-prelit-far-review-20261023. Main/simulation/native art unchanged.
