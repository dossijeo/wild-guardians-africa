# Pending Canyon handoff: reversal, exit and retained data

Real Chrome game, current review, atomic handoff, populated Canyon fixture, media, frozen simulation, pthreads and scheduler. QA overrides only the adoption predicate to false so completed worker data remains pending. This intentionally delayed test is not a performance measurement.

Sequence: settle original scene; move 48 m along Z; await completed pending horizon; reverse to original camera and verify pending data discarded without replacing original group; permit adoption and move again; hold another destination, then invoke the real menu exit. Both runs passed: pending data released, world disposed, horizon generator dead, menu present, zero late chunk installations, no unexpected console errors. Known X4000 warnings remain. This does not inspect pthread worker termination independently; earlier runtime lifecycle tests cover that separate component.

First run sampled held state immediately (26 chunks). Second run waits until all desired chunks are installed while still forbidding adoption (30 chunks). The second is the useful full-prefetch overlap sample:

| State | Chunks | Unique backing buffers of scene geometry, bytes | Pending terrain+water arrays, bytes |
| --- | ---: | ---: | ---: |
| Before | 25 | 82205778 | 0 |
| Held, full prefetch | 30 | 82788062 | 3881520 |
| After adoption | 25 | 82163466 | 0 |

Scene geometry backing arrays increased 582284 bytes (~0.56 MiB); pending horizon arrays add ~3.70 MiB. Counts deduplicate ArrayBuffer identities across geometry attributes/index. They are CPU backing storage, not driver VRAM, do not include textures/other runtime allocations, and are checkpoint samples rather than a universal peak bound. No resource leak or GPU memory claim follows from these totals.

The held-full-prefetch predicate is in the committed helper; the first report predates that extra wait. Both raw reports are preserved. Next unresolved correctness case is forced near-chunk rebuild during an adopted/pending horizon; current syncChunks(force) removes installed groups and requires special review. Keep the QA gate disabled by default until that is handled.

Reproduce check-spatial-thread-game.mjs with WG_CURRENT_REVIEW=1, WG_THREAD_PORT=5190, WG_THREAD_BIOME=gran-canon, WG_THREAD_FROZEN=1, WG_THREAD_RETAIN_APP=1, WG_FRAME_SCHEDULER=1, WG_HORIZON_HANDOFF=atomic, WG_HORIZON_PENDING_CASE=1 and a fresh WG_THREAD_REPORT.
