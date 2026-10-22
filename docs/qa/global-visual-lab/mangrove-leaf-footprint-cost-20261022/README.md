# Mangrove leaf footprint: single-world moving ABAB

Intel UHD / ANGLE D3D11, medium, 1280x720, seed712, full far backgrounds and smooth transitions. Same loaded campaign alternates rectangle/triangles/rectangle/triangles. Both representations inspect neighboring chunks; this isolates water-footprint shape, not the old neighbor omission. Camera follows the same 24-unit lateral path. 60 warmup +90 samples per GPU and separate cadence pass. No navigation/engine queries added.

720 GPU queries valid with no disjoint/errors. Workload check is NOT fully equivalent: daytime cadence pair2 frames31/32 differ by an additional draw/tree representation; nighttime GPU pair1 frame89 also differs. All other frame pairs differ only by recovered leaf geometry. Raw mismatches retained in summary.json; no samples removed.

| Phase | Run | Footprint | GPU mean/p95 ms | CPU mean/p95 ms | Interval mean ms |
|---|---|---|---|---|---|
| day | 0 | box | 27.52/34.12 | 9.11/13.80 | 32.97 |
| night | 0 | box | 23.50/28.25 | 8.30/12.60 | 33.82 |
| day | 1 | triangles | 23.13/28.07 | 6.24/10.60 | 27.52 |
| night | 1 | triangles | 24.43/29.04 | 6.88/10.80 | 32.08 |
| day | 2 | box | 23.84/27.55 | 6.59/10.30 | 27.83 |
| night | 2 | box | 24.11/29.02 | 6.77/11.00 | 29.62 |
| day | 3 | triangles | 23.03/29.01 | 6.19/9.30 | 27.03 |
| night | 3 | triangles | 23.36/27.39 | 6.73/11.70 | 27.57 |

Recovered leaf workload: mean2062, p953680, maximum3944 additional triangles along the sampled path. Same coverage buffers and material; no new draw call required for leaves. This is an artistic coverage correction, not less rendering work.

The first rectangle pass is slower than its repeat. Day GPU deltas -4.38/-0.81ms and night +0.93/-0.75ms are therefore not evidence that restoring geometry optimizes rendering. No consistent disproportionate GPU penalty appears in this path, but three workload mismatches and warm/system variation prevent a precise causal cost claim. Retain the visible fix.

One-time visible-tile rebuild (outside frame samples): rectangle13.3/10.7ms, triangles26.7/10.8ms. These timings include leaf placement/exclusion on the current view, not rebuilding the per-chunk water triangle index. The latter remains unmeasured; current benchmark toggles already-created resident data. Streaming/index memory and modest-quality validation remain separate requirements.

Reproduce: measure-mangrove-leaf-footprint-cost-20261022.mjs and audit-mangrove-leaf-footprint-cost-20261022.py, Vite5190. The auditor reports mismatches without hiding data; inspect controls before interpreting timings. Render PNGs accompany each pass.
