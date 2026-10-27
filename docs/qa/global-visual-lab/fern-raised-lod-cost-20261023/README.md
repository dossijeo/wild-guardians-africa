# Raised fern LOD: controlled moving-camera costs

Source56de4f3f8 plus QA raised candidate, Intel UHD0x9A60/ANGLE D3D11,1280x720,medium,seed712,populated paused save. Approved native32triangle far clumps versus8triangle composite; near unchanged. ABABday/night,60warmup+90samples each GPU/cadence separately;720valid GPU queries. Same2048 shadows,instance culling,fullbackgrounds,density and camera sequence. Wind clock sample-driven; ground material clock held. No simulation performance claim.

| Pass | Time | GPU mean ms | CPU render mean ms | Frame interval mean ms |
|---|---|---|---|---|
| Native1 | day |22.600|9.351|29.146|
| Raised1 | day |21.304|7.976|26.884|
| Native2 | day |21.850|8.369|27.653|
| Raised2 | day |21.471|8.736|28.911|
| Native1 | night |25.428|9.426|31.003|
| Raised1 | night |22.517|8.146|28.720|
| Native2 | night |22.414|8.334|28.684|
| Raised2 | night |22.973|8.127|30.154|

Day GPU decreases1.296/0.379ms; night decreases2.911 then increases0.559ms. Cadence improves2.262/2.283ms in first day/night pair, worsens1.258/1.470ms in second. No robust whole-frame improvement established. Do not attribute variation to a specific thermal/driver cause without measurement.

Same-variant repeats exactly match calls and triangles per frame in GPU and cadence passes, initial memory matches. Saved state and camera sequences match all variants. No recorded errors, disjoint/discarded/pending GPU queries or coverage overflow. Mean whole-frame123.289 calls unchanged; triangles907905->868885 (~4.3% reduction including shadows). This does not contradict75% reduction for the FAR fern mesh alone: the rest of the renderer remains. The candidate adds two512px mipmapped maps (~2.67MiB nominal RGBA8 payload), and does not reduce instance counts, selection or uploads. No quantitative overdraw measurement yet.

Decision: keep as QA candidate, not production optimization. User likes the direction; retain it for projected-size/angle selection and temporal validation, without further arbitrary artistic matching. Baseline approved art is intact. Engine-baked lighting was suggested then made optional by the user; do not switch approaches solely because timings are inconclusive. Current horizontal-distance selection and32triangle near clumps still limit savings in elevated/topdown views.

Reproduce with Vite5190: node tools/experiments/measure-fern-raised-lod-20261023.mjs, then python tools/experiments/audit-holly-fern-shadow-20261023.py docs/qa/global-visual-lab/fern-raised-lod-cost-20261023. Static16capture comparison including topdown is in ../fern-raised-lod-review-20261023; it does not prove smooth LOD transitions. No native source/main changes.
