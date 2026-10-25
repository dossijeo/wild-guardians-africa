# Initial cache work versus loading dismissal

Two fresh pages in one Chrome process, Intel UHD / medium / 720p / seed 712. QA-only response instrumentation records controller publication CPU spans, stage loading class/aria-busy and a performance.now marker immediately after loadingOverlay.dispose. Production behavior unchanged except existing fixture pause. No browser errors.

| Run | First CPU ms | First publication before dismissal ms | Published before / after dismissal | Post-dismiss total / max CPU ms |
| --- | ---: | ---: | ---: | ---: |
| 1 | 91.0 | 5703.9 | 25 / 5 | 2.2 / 0.8 |
| 2 | 6.1 | 4707.2 | 25 / 5 | 2.2 / 0.5 |

At first publication both runs have #stage present, world-loading=true, aria-busy=true and no dismissal marker. All 25 initial chunk targets publish before dismissal. The remaining five follow the harness camera repositioning. First-use CPU spike is thus before the loading overlay is disposed in this path, not demonstrated as a gameplay hitch. Factory-to-dismiss elapsed spans include unrelated preparation and cannot be presented as cache-added loading time.

Decision: do not add a redundant new preload stage based on the first-publication spike. Existing loading preparation already executes it. However, the loading screen is interactive: a synchronous 91 ms call may still affect its animation/input. This probe does not measure loading presentation frametimes, GPU completion, total load delta against uncached, or the main ground shader compile after cache update. No claim of smooth loading, cold-driver guarantee or compiler-only attribution.

Reproduce: WG_VARIANT_SEQUENCE=fixednative,fixednative; WG_PHASES=day; WG_COVER_QUALITY=media; WG_MODES=cadence; WG_SAMPLES=10; WG_WARMUP=30; WG_STATIC_VIEW=1; WG_INITIAL_CACHE_TIMING=1; WG_REVIEW_OUT=<fresh directory>; node tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs. The ten-frame cadence preamble is not a performance comparison. Raw timestamp/state rows in sceneAudit.initialCacheTiming, dismissal in sceneAudit.overlayDismissedAt.
