# Integrated fixed512: nighttime ABAB

Intel UHD, 1280x720, medium, seed 712, populated frozen fixture; normal fixed camera. 120 warm-up frames and 180 samples per window. Separate GPU and cadence windows. Sequence original/integrated cache/original/integrated cache.

| Run | Whole GPU ms | Frame ms | Frame p95 ms | CPU render ms |
| --- | ---: | ---: | ---: | ---: |
| Original A1 | 21.5276 | 23.2706 | 29.0 | 6.0656 |
| Fixed512 B1 | 19.1246 | 20.6072 | 25.4 | 6.1306 |
| Original A2 | 20.7972 | 22.4311 | 25.2 | 6.0122 |
| Fixed512 B2 | 18.3681 | 20.0339 | 23.3 | 5.7767 |

All 720 GPU queries valid; workload audit passes. Draw/triangle counts, camera and fern coverage agree exactly in the sampled windows. No browser/GL errors; simulation state remains unchanged. GPU gain 2.40–2.43 ms and frame gain 2.40–2.66 ms. CPU improvement is not consistent. Resident cache: 35,209,000 bytes (33.58 MiB), no rejected requests.

Inspected media-base-night-0.png and media-fixednative-night-1.png visually at full resolution. Green ground coverage, localized exposed soil, shoreline, shadows and vegetation remain. Blend smoothing from fixed512 remains visible in some transitions; this is not pixel-identical rendering. No all-mud rectangular region appears. Night illumination is not baked into the material cache.

This validates a stationary paused scene only, not moving/streaming frame spikes or active simulation. Do not infer global completion or extend to other biomes from this benchmark.

Reproduce: WG_VARIANT_SEQUENCE=base,fixednative,base,fixednative; WG_PHASES=night; WG_COVER_QUALITY=media; WG_VIEW=normal; WG_MODES=frame,cadence; WG_SAMPLES=180; WG_WARMUP=120; WG_STATIC_VIEW=1; WG_REVIEW_OUT=<fresh directory>; node tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs. Audit with python tools/experiments/audit-mangrove-incremental-20261023.py <directory> base fixednative.
