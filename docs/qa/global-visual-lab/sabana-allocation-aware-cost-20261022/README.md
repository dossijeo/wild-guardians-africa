# Sabana combined populated costs with fade residency census

Reproduce with WG_FIXTURE_BIOME=sabana and tools/experiments/measure-biome-allocation-aware-20261022.mjs, then python tools/experiments/audit-biome-allocation-aware-20261022.py sabana. Source056d5ce06, Intel UHD0x9A60/ANGLE D3D11,1280x720,seed712,full backgrounds,selected closure recipe. Paused paid opening fixture with12crops/two workers. Medium/low/medium/low,day/night,60warmup+90samples per GPU/cadence pass.720valid GPU samples; state/workload checks pass, no errors/disjoint/discarded queries/coverage overflow.

| Profile/time | GPU mean first/repeat ms | GPU p95 ms | CPU render mean ms | Frame interval mean ms |
|---|---|---|---|---|
| Medium day |21.982 /20.317|27.607 /23.166|6.458 /6.182|22.219 /22.229|
| Low day |17.428 /15.801|20.352 /17.631|5.893 /5.904|19.540 /16.896|
| Medium night |21.320 /21.048|26.287 /24.808|6.820 /5.813|25.209 /22.711|
| Low night |16.853 /17.649|19.017 /19.956|5.138 /5.803|17.987 /19.788|

Day medium109calls/1229129triangles,low103/866807;night medium100/1257038,low96/902050. Medium2326near+2750far grass modules;low0near+2513far. Medium344geometries/111textures,low320/109,identical in both repetitions. Registered fade geometries33medium/28low, nominal buffer payload7987086/6659456bytes, also equal in repeats. This payload is not total VRAM and does not include driver overhead.

The earlier344/345 variance did not recur. That earlier benchmark remains provisional; this run does not prove its exact cause retrospectively. The new read-only census occurs before timing and does not clear/resize/hide resources. Its audit checks visible fade descriptors, non-fade geometry counts, textures and complete rendered workload. In this actual run even the total resource counts match exactly, so acceptance does not depend on permitting a discrepancy. Listener-based registration inspection is diagnostic for the current Three version, not production API coupling.

Recommendation: retain selected medium art. Low saves about4.5ms GPU by day and3.4–4.5ms at night here, by reducing quality; it is not an equivalent-image optimization. Matching low-profile screenshots are still required before recommending its visual compromise. CPU benefit varies, especially the second night repeat. Do not turn static cadence intervals into an overall gameplay FPS claim.

Limits: fixed camera/material clock; coverage animation uses deterministic sample-index time. All25 ground masks uploaded before timing; resident syncChunks suspended during measurement. Simulation, active campaigns, streaming and upload latency excluded. GPU and CPU/cadence passes are separate. Existing medium aligned-review captures document the selected art; these timing results alone do not close the global experiment.
