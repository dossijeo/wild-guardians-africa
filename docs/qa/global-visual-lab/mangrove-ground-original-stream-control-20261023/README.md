# Original material continuous streaming control

Same 144 m out-and-back cosine camera/target path as native-stream-cost, Intel UHD, 720p, medium/day, 30 warmup + 240 recorded per window. No material cache. GPU mean 28.205 ms, p95 35.577, maximum 54.062. Separate cadence mean 40.834 ms, p95 98.1, maximum 122.1; render CPU mean 13.580, p95 20.3, max 43.6. No reported browser/GL errors.

The prior integrated-cache run had GPU mean 25.906 ms and cadence mean/p95 37.238/89.3 ms. This single sequential control is not ABAB, and async chunk readiness/workloads have not been matched frame by frame. It demonstrates large streaming spikes exist without the cache, not an exact causal speedup. Do not attribute all spikes to cache generation or claim streaming acceptance.

Reproduce with WG_STREAM_PATH=1, WG_VARIANT_SEQUENCE=base, WG_PHASES=day, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=frame,cadence, WG_SAMPLES=240, WG_WARMUP=30 and WG_REVIEW_OUT=<new directory>, using measure-mangrove-ground-hybrid-20261023.mjs.
