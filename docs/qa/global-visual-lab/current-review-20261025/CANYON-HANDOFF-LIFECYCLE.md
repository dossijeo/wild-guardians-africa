# Canyon atomic handoff: stationary lifecycle checks

Both runs use horizonHandoff=atomic, current review, populated native Canyon fixture, media initial quality, frozen simulation, pthreads, 720p, retained programs. The scheduler run additionally sets frameScheduler=1. These are correctness tests, not interleaved performance comparisons.

Both completed media/baja/media/baja quality cycles and forced WebGL context restoration. Quality and context snapshots report worldUnchanged=true; no unexpected console errors (known X4000 environment shader warnings remain). Context generation records zero stale and unknown deletes. Scheduler run completed 62 jobs with zero failures.

Inspected both after-context screenshots: canyon wall, river, bank and buildings visible, no rectangular sky opening or stale context-loss notification. Final quality is baja. This does not certify high-quality shadow equivalence.

Measured recovery durations: 633.155 ms without scheduler, 1431.125 ms with scheduler. Quality transition durations without scheduler: 217.84/4311.10/225.12/213.99 ms; with scheduler: 213.55/232.48/210.11/244.15 ms. These elapsed correctness-protocol durations include preparation/waits, are cache-order dependent, and do NOT isolate GPU time or establish a scheduler speedup/regression.

Important scope limit: stationary settled scene, not a context loss or quality rebuild while horizon adoption is pending. The per-frame moving coverage test is separate. Remaining checks: forced chunk rebuild, world exit during held work, delayed chunk/adoption under camera reversal, real resource/cost A/B. Default recipe remains unchanged.

Reproduce using check-spatial-thread-game.mjs with WG_CURRENT_REVIEW=1, WG_THREAD_PORT=5190, WG_THREAD_BIOME=gran-canon, WG_THREAD_QUALITY=media, WG_THREAD_FROZEN=1, WG_THREAD_RETAIN_APP=1, WG_HORIZON_HANDOFF=atomic, WG_THREAD_QUALITY_CYCLE=1, WG_THREAD_CONTEXT=1 and a fresh WG_THREAD_REPORT. Add WG_FRAME_SCHEDULER=1 for the second run.
