# Decision: retain fixed 512 material cache

2026-10-23. User accepts the larger VRAM footprint and requests ending lower-memory alternatives if the last candidate remains slower. Selected implementation: `installHybridCache(w, 512, "weights")` in `qa-mangrove-hybrid-cache-20261023.js`. The incremental smooth-entry variant is retained only as experimental evidence, not selected for integration.

## Final direct comparison

Intel UHD (ANGLE D3D11), 1280x720, medium quality, same frozen populated Mangrove fixture, camera path, fern coverage and phase. Sequence fixed512 / incremental-smooth / fixed512 / incremental-smooth; each runs day and night, 120 warmup and 120 samples per measurement mode. GPU and cadence measured separately. Raw data and screenshots accompany this report.

| Day run | Fixed512 GPU ms | Candidate GPU ms | Fixed512 frame ms | Candidate frame ms | Fixed512 p95 ms | Candidate p95 ms |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 22.125 | 23.257 | 27.714 | 28.952 | 33.2 | 35.5 |
| 2 | 22.008 | 22.674 | 28.670 | 29.933 | 35.2 | 37.4 |

The candidate costs another 0.666–1.133 ms GPU and 1.238–1.263 ms total frame time in the valid day comparison. Day workload audit passes, allowing only the candidate's two-triangle baking pass; world camera and fern coverage match. CPU cadence means: fixed 8.343/8.537 ms; candidate 8.318/8.204 ms. This small CPU reduction does not offset GPU/frame cost.

All 960 GPU samples are valid, without reported disjoint queries, GL errors or state advancement. Night fails strict workload equivalence at three frames (extra calls or 708 triangles), so night results are descriptive only. No additional alternative runs will be made to resolve this: the valid daytime evidence and earlier fixed512 baseline support the user's preferred choice. See `summary.json` and `workload-audit.json` for all measurements and exceptions.

## Memory and scope

Fixed512 uses approximately 33.58 MiB for 25 resident 514x514 RGBA8 targets including gutters and mipmaps. The candidate peaks at 22.88 MiB. These figures cover cache textures, not total GPU memory or driver allocations. The higher fixed-cache footprint is explicitly accepted by the user.

The chosen cache precomputes static material weights, AO and roughness; shared detail textures, dynamic normal response, lighting, shadows and approved fern density remain. Earlier close-view checks found some smoothing of material mixture at 512; this limitation remains, rather than claiming pixel equivalence.

Stop investigating smaller/projection-dependent alternatives. Next work is integration and lifecycle validation of the chosen fixed512 implementation (chunk arrival, invalidation, release and bounded generation), not another search for cache resolutions. The current winner remains a QA installer; this decision does not claim production streaming integration is finished. PR #159 remains draft, main unchanged.

## Reproduction

Run `tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs` with WG_VARIANT_SEQUENCE=cache512,incrementalsmooth,cache512,incrementalsmooth; WG_PHASES=day,night; WG_COVER_QUALITY=media; WG_VIEW=normal; WG_MODES=frame,cadence; WG_SAMPLES=120; WG_WARMUP=120; WG_REVIEW_OUT set to a new output directory. The candidate source in this commit includes entry blending.

Audit using `python tools/experiments/audit-mangrove-incremental-20261023.py <output> cache512 incrementalsmooth`. Nonzero status in this evidence is intentional: it reports the night workload mismatch and must not be suppressed.
