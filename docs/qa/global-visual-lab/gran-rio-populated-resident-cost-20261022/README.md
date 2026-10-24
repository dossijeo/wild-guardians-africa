# Gran Rio combined populated profile costs

Run `WG_FIXTURE_BIOME=gran-rio node tools/experiments/measure-biome-populated-resident-20261022.mjs` (set the environment using your shell), then `python tools/experiments/audit-biome-populated-resident-20261022.py gran-rio`.

Source056d5ce06, including aligned far-region startup. Intel UHD0x9A60,ANGLE/D3D11,1280x720,seed712,full impostors/mountains,selected closure recipe. Paid opening fixture12crops/two workers. Medium/low/medium/low, day/night,60warmup+90samples for GPU and a separate cadence/CPU pass. All25 resident ground masks uploaded before timing.720valid GPU queries; strict repeated state/workload/resource checks pass, no GL/browser errors, disjoint or lost queries, or coverage overflow.

| Profile/time | GPU mean, first/repeat ms | GPU p95 ms | CPU render mean ms | Frame interval mean ms |
|---|---|---|---|---|
| Medium day |19.623 /19.761|22.299 /22.727|7.192 /6.000|23.478 /21.300|
| Low day |17.554 /17.644|20.995 /20.058|5.718 /5.908|18.290 /18.458|
| Medium night |22.738 /22.447|29.001 /25.905|6.924 /6.730|25.542 /24.572|
| Low night |19.498 /18.166|23.924 /20.862|5.362 /5.822|19.810 /20.650|

Day medium106calls/874471triangles, low99/575541; night medium96/905468,low91/614134. Medium3104near+5384far coverage modules; low0near+4240far. Medium339geometries/113textures,low314/111. Coverage buffer allocation1207752bytes in both profiles despite fewer active low instances; counters/payload do not measure total GPU VRAM.

Low saves about2.1ms GPU in day repeats and3.2–4.3ms at night, but intentionally reduces graphic quality. It is not equivalent-image optimization. Keep selected medium artwork; obtain matching low-profile screenshots before recommending its visual compromise for this biome. No density/art rollback follows from this benchmark.

Limits: paused simulation, fixed camera and material time, resident chunks with syncChunks suspended only during timing. No active gameplay, streaming upload latency, advanced settlement or overall game FPS claim. Query and cadence runs are separate, so their durations must not be added as if measured together. Existing aligned-review images establish the medium artwork only. Summary includes device, p95 CPU/cadence, raw samples and exact resource checks.
