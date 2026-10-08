# Dense traveling chunk attribution

Native IAB tab 863, runtime 5b113c18, archived Gran Río/Suajili farm, medium quality,
15 seconds at 12 m/s (180 m). Program-only preparation, resident textures, crate
shadow, 34 actors awaited and isolated uploads; owned compiler/waits disabled.
Trace and chunk-phase wrappers are diagnostics, not an uninstrumented benchmark.
Report/fixture hashes are retained; run `node docs/qa/streaming-travel-dense/chunk-phases-5b113c18/verify.mjs`.

15 chunks installed (25→40), no failed/fallback generation, logical state intact.
Install max 3.4 ms; prop slots max 1.5 ms per chunk, terrain remainder max 1.8 ms,
adoption remainder max 0.3 ms. Terrain includes prop timings; do not sum nested
categories again. The largest observed far attachData segment is 10.6 ms.

264 frames / 263 intervals: frame p95 116.4 ms, max 149.6 ms, 17 above 100 ms. CPU render
p95 31.1 ms / max 44.1 ms; GPU query p95 65.69 ms / max 79.20 ms, all 264 samples resolved,
no disjoint/discarded/foreign/allocation/overflow events. Six LongTasks, max 63 ms.
CPU rendering, GPU work and frame intervals overlap; these are not additive.
Driver/backpressure/scheduling and off-frame callbacks prevent inferring a
precise cause from their difference. There is no paired control or speedup claim.

This evidence does not justify treating chunk installation as the sole source
of large traveling spikes. Continue investigating GPU draw/upload/program and
far adoption costs with matched controls. No production scheduler was changed.
The run completed, disposed/lost its context and closed its tab before yielding
GPU to other QA. Frame stability remains unapproved.
