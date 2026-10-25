# Subtle cloud latitude cost

A/B/A/B, four fresh pages, day and night per page; seed712, media,1280x720, Intel UHD ANGLE D3D11. Each phase measures 90 GPU-query frames after60 warmup, then90 separate cadence frames after60 warmup. Camera fixed at first low view; grass wind follows identical frame indices. A is cloud-protected grading; B adds -.025 latitude remap. Run measure-sky-cloud-latitude-cost-20261022.mjs then audit-sky-cloud-latitude-cost-20261022.py. All frame camera/draw/triangle signatures match, state unchanged, no GL errors. 720 valid GPU samples, no disjoint/discarded/pending queries. CPU is JS render duration; interval is RAF cadence, not GPU time. No other machine workloads were controlled.

|Phase|A1 GPU mean|B1|A2|B2|
|---|---:|---:|---:|---:|
|Day|21.07|22.83|23.75|24.16|
|Night|26.36|25.29|25.87|25.04|

Milliseconds. Day GPU p95:21.78,24.12,25.70,30.21. Day CPU means4.42,4.41,4.08,3.82; RAF means25.23,25.66,25.81,25.14. Night CPU means4.08,4.19,3.90,4.12; RAF means26.96,27.14,26.91,27.72. Complete values in summary.json.

No speedup claim. Day baseline itself drifts2.68ms between runs, larger than either paired candidate delta (+1.76,+.41ms); night is a shader-branch control yet also varies. This full-scene run cannot reliably isolate a few extra sky arithmetic operations. Keep the visible candidate for further validation, not rejection solely on this noisy cost estimate. No extra texture samples, geometry, passes or resources in code. GPU memory bytes not measured; renderer counts are in raw records. Native integration requires reflection/sky consistency, twilight/motion and other biome review; a more stable same-page comparison should precede a performance conclusion.
