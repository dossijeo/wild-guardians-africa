# Integrated fixed512 low-quality ABAB

Intel UHD / 1280x720 / low (baja) / seed 712 / normal static camera / paused populated fixture. 120 warm-up and 180 measured frames per GPU/cadence window; fresh page each run. Day/night interleaved within original/cache/original/cache sequence. 1,440 GPU samples valid; all workload audits pass, identical camera, fern coverage, draw calls and triangle counts within each phase. No GL/browser errors or simulation state progression.

| Run | Whole GPU ms | Frame ms | Frame p95 ms | CPU render ms |
| --- | ---: | ---: | ---: | ---: |
| 0 base day | 18.2595 | 19.8167 | 22.50 | 5.3711 |
| 1 base night | 19.1959 | 20.3494 | 23.80 | 4.6228 |
| 2 fixednative day | 15.1569 | 16.7739 | 18.00 | 4.5933 |
| 3 fixednative night | 16.1982 | 17.7278 | 20.10 | 4.6956 |
| 4 base day | 17.4631 | 19.3072 | 22.40 | 4.6967 |
| 5 base night | 18.6147 | 20.2278 | 23.00 | 4.6844 |
| 6 fixednative day | 15.1319 | 16.7489 | 17.70 | 4.8550 |
| 7 fixednative night | 16.1454 | 17.6256 | 19.70 | 4.5161 |

Day pair savings: 3.1026 / 2.3312 ms GPU, 3.0428 / 2.5583 ms frame. Night: 2.9977 / 2.4693 ms GPU, 2.6216 / 2.6022 ms frame. p95 improves in all pairs. CPU changes are inconsistent; do not claim CPU optimization. Cache remains 35,209,000 bytes (33.58 MiB), no rebakes during sampling. Shader resolution unchanged at 512.

Visually inspected original and integrated first-pair captures for both phases. Moss coverage, localized mud and fern density remain; fixed512 retains the documented slight blend smoothing. Low-quality shadows differ from medium by the pre-existing quality profile, equally in both sides; this is not removal of features by the cache. Images are not claimed pixel-identical.

Scope: stationary paused resident scene. No conclusion about active-game FPS, streaming stalls or first-load compilation. Earlier source attribution of synchronous native chunk generation still applies. This is validation of the selected cache in low quality, not a new lower-memory experiment.

Reproduce: WG_VARIANT_SEQUENCE=base,fixednative,base,fixednative; WG_PHASES=day,night; WG_COVER_QUALITY=baja; WG_VIEW=normal; WG_MODES=frame,cadence; WG_SAMPLES=180; WG_WARMUP=120; WG_STATIC_VIEW=1; WG_REVIEW_OUT=<fresh directory>; node tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs. Audit: python tools/experiments/audit-mangrove-incremental-20261023.py <directory> base fixednative.
