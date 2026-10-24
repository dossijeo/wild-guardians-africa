# Initial fixed512 generation CPU observation

Intel UHD, 720p, medium, day, seed 712. Two fresh pages in one Chrome process. Opt-in QA response instrumentation wraps the integrated controller update from its creation, recording only calls that publish a target. No production telemetry or shader changes. This records synchronous CPU duration including allocation and renderer submission; it is NOT a GPU timer.

| Run | First publication CPU ms | Later mean CPU ms | Total CPU across 30 publications ms | Factory-to-last-publication wall ms |
| --- | ---: | ---: | ---: | ---: |
| 1 | 59.60 | 0.517 | 74.60 | 6447.30 |
| 2 | 5.30 | 0.376 | 16.20 | 5492.40 |

Both publish 30 targets over initial load plus harness repositioning, ending with 25 resident targets / 35,209,000 bytes. No browser errors. Shader/program cache warmth is not controlled: fresh page is not a cold driver. Do not ascribe the difference exclusively to compilation, or interpret elapsed publication span as additional load delay. Other loading work, chunk arrival and harness preparation occur between publications.

The earlier steady ~0.35 ms CPU generation measurement does not describe first-use cost. A first update can block tens of milliseconds in this environment. The main ground draw occurs after controller.update and may have additional compilation cost not captured here. No GPU completion or main-material compilation timing is included.

Source inspection: Scene.drawRenderFrame invokes controller.update, and loading preparation also invokes drawRenderFrame. App performs a render before dismissing the loading overlay. The timing record does not capture which loading presentation was visible at first publication, so these data do not prove a visible gameplay hitch or prove that preloading hides it. That attribution remains open before deciding whether to change initialization.

Reproduce: WG_VARIANT_SEQUENCE=fixednative,fixednative; WG_PHASES=day; WG_COVER_QUALITY=media; WG_MODES=cadence; WG_SAMPLES=10; WG_WARMUP=30; WG_STATIC_VIEW=1; WG_INITIAL_CACHE_TIMING=1; WG_REVIEW_OUT=<new directory>; node tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs. Ten-frame cadence preamble is not performance evidence. Raw per-publication records are in sceneAudit.initialCacheTiming.
