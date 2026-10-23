# Integrated fixed512: static-camera ABAB

Intel UHD, 1280x720, medium, seed 712, populated frozen fixture, day, normal fixed camera. 120 warm-up frames then 180 samples per window; GPU and cadence measured separately. Sequence base/fixednative/base/fixednative. All 720 GPU queries valid; workload audit passes with identical draw/triangle counts, camera and fern coverage. Simulation stays paused.

| Run | Whole GPU ms | Frame ms | Frame p95 ms | CPU render ms |
| --- | ---: | ---: | ---: | ---: |
| Original A1 | 20.6086 | 22.0350 | 25.2 | 5.8906 |
| Integrated cache B1 | 17.6469 | 19.9256 | 23.0 | 6.0344 |
| Original A2 | 19.7020 | 21.3211 | 25.3 | 5.6144 |
| Integrated cache B2 | 17.1617 | 19.4878 | 22.7 | 5.5439 |

GPU gain 2.54–2.96 ms; frame gain 1.83–2.11 ms. CPU does not consistently improve. Resident cache 35,209,000 bytes (33.58 MiB), no replacement during sampling. No browser/GL errors.

## Appearance

Manually inspected original media-base-day-0.png and integrated media-fixednative-day-1.png at full resolution. Green moss coverage, localized mud patches, shoreline, fern density and dynamic shadows remain. Some blend detail is smoother with fixed512; pixel-identical equivalence to uncached shading is NOT claimed. The large rectangular all-mud capture supplied in the conversation belongs to the deliberate changed-mask diagnostic, not this retained appearance. Its restoration is documented in ../mangrove-ground-fixed-mask-20261023/README.md.

## Scope

Static camera isolates material cost without asynchronous chunk arrival discrepancies. This is not moving/streaming performance, an active simulation benchmark, or a night result. Existing native generation stalls remain open. No new memory alternatives were tested.

Reproduce with WG_VARIANT_SEQUENCE=base,fixednative,base,fixednative; WG_PHASES=day; WG_COVER_QUALITY=media; WG_VIEW=normal; WG_MODES=frame,cadence; WG_SAMPLES=180; WG_WARMUP=120; WG_STATIC_VIEW=1; WG_REVIEW_OUT=<fresh directory>; node tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs. Audit: python tools/experiments/audit-mangrove-incremental-20261023.py <directory> base fixednative.
