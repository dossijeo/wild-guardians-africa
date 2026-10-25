# Dense pigment blend cost

Original/candidate/original/candidate, Chrome Intel UHD, media, seed712,1280×720. Full backgrounds, fixed camera, paused simulation, resident scene; streaming/tile construction excluded. GPU queries and cadence measured separately,60 warmup +90 samples each phase/run. 720 valid GPU samples; no query failures, GL or recorded page errors. Exact calls/triangles across all runs per phase, GPU and cadence: original geometry/density retained. Same texture sample count by shader inspection; one RGB mix added in vertex shader.

GPU mean ms original → candidate:
- Day 18.675 →21.957; repeat20.417 →22.611 (+3.282,+2.194).
- Night22.748 →22.911; repeat25.999 →23.040 (+.163,-2.959).

CPU means mixed; see summary.json. Do not claim zero cost, speedup or gameplay FPS improvement. Daytime regression observed in both repeats, causal attribution to the added arithmetic unproven; device/system drift has not been isolated. Preserve the attractive candidate as optional pending cost investigation and complete-scene validation; original selected recipe unchanged.

Reproduce measure-mangrove-pigment-blend-cost-20261022.mjs then audit-mangrove-pigment-blend-cost-20261022.py. Raw samples in benchmarks.json.


## User rejection: insufficient visible leaf presence

User explicitly rejects this pigment blend because leaves become almost invisible against the ground. Unchanged geometric density does not establish preserved perceptual density. Supersedes earlier positive candidate assessment. Do not select or integrate this treatment. The uncommitted native option was removed after its capture completed. Dense original pigment, geometry and selected recipe remain unchanged. Next work must preserve original contrast as well as size and density, and target spatial boundary regularity directly.
