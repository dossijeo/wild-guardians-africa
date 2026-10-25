# Spatial Mangrove coverage cost

Original/candidate/original/candidate, medium, Intel UHD reported by raw device metadata,1280x720, fixed matched camera, full backgrounds, day/night.60 warmup+90 samples per pass.720 valid GPU samples, no recorded disjoint/query failures/errors. CPU/cadence collected separately. Paused simulation; resident chunks; no recording during measurement. Excludes tile construction and streaming costs, including new CPU noise evaluation. Not an active-game FPS claim.

Workloads repeat consistently: original day82 draws603425 triangles; candidate82/603377. Night original78/609469; candidate78/609421.48 triangle difference matches two fewer far leaf modules from changed exclusions. Same nominal quality/geometry, different artistic image and placement; this is not an equivalent-image optimization.

|Variant|Light|GPU mean ms|CPU mean ms|Interval mean ms|
|---|---|---:|---:|---:|
|original|day|20.271|4.977|25.284|
|original|night|23.704|4.563|25.486|
|candidate|day|22.125|4.261|23.287|
|candidate|night|23.037|4.179|23.614|
|original|day|17.583|4.342|22.336|
|original|night|22.895|4.011|22.494|
|candidate|day|18.195|4.486|20.627|
|candidate|night|22.368|4.612|23.954|

Day candidate +1.854/+0.612ms GPU; night -0.667/-0.527ms. CPU mixed. No consistent overall improvement and no zero-cost claim. Retain visual candidate for review, not native promotion: it reduces regular rows but homogeneous coverage remains. Do not discard accepted water/moss or attractive options solely on these timings. Need assess size/placement versus current recipe as whole scene; avoid indefinite tiny variations.

Reproduce: node tools/experiments/measure-mangrove-spatial-jitter-cost-20261022.mjs; python tools/experiments/audit-mangrove-spatial-jitter-cost-20261022.py. Vite5190 required. Raw benchmarks preserve device, GPU queries, per-frame calls/triangles/camera and timing.
