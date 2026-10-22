# Matched reflection latitude: ABAB cost

Reproduce with Vite5190 and WG_REVIEW_BIOMES=gran-rio: measure-sky-reflection-cost-20261022.mjs then audit-sky-reflection-cost-20261022.py. Intel UHD ANGLE D3D11,1280x720,media,seed712,fixed river-west camera. A and B share the revised sky; only B remaps day environment UVs. Four pages A/B/A/B,day/night each. Each measurement:60 warmup+90 GPU query frames,then60 warmup+90 separate RAF/cpu frames. Identical grass animation indices. All camera/draw/triangle signatures match; state unchanged,zero GL errors,720 valid GPU samples without disjoint/discarded/pending/overflow events. Other machine workloads not controlled.

|Phase / GPU mean ms|A1|B1|A2|B2|
|---|---:|---:|---:|---:|
|Day|13.391|13.387|13.297|13.455|
|Night|13.999|14.408|14.136|14.098|

Day p95 GPU:14.028,14.228,14.229,14.254ms. Night p95:14.589,16.358,14.878,14.891ms. CPU render means4.04-4.50ms by day and4.09-4.27ms at night. All cadence means16.62-16.63ms, consistent with display pacing; these are not unbounded FPS estimates. Day paired GPU changes -.004/+ .157ms show no large added cost in this fixture, not proof of zero cost. The first night B p95 spike is retained in the evidence; the second repetition does not reproduce it. Full numbers in summary.json.

Keep the candidate: directional correctness has visible benefit without a substantial repeated GPU penalty here. No texture/draw/resource additions; actual GPU byte residency was not measured, renderer object counts are recorded. This narrow static river fixture does not prove all biomes, all quality profiles, moving-camera performance or full sky quality. Shared color response is still pending before native integration.
