# Water distance change: ABAB streaming outcome

Intel UHD / 720p / medium/day, integrated fixed512 and numeric mud lookup in both versions. Only the water boundary-distance reduction differs: A serves the previous per-segment Math.hypot implementation, B uses squared comparisons and one square root. Same 144 m camera/target path, 30 warmup / 240 recorded cadence frames, repeated A/B/A/B. No GPU query instrumentation in this cadence test.

| Pair | A mean frame ms | B mean frame ms | A p95 ms | B p95 ms | A max ms | B max ms |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 39.538 | 38.497 | 92.6 | 94.1 | 150.6 | 122.2 |
| 2 | 37.829 | 37.672 | 83.6 | 85.9 | 135.5 | 135.4 |

Conclusion: no demonstrated p95 improvement; mean improvement is small/inconsistent in magnitude. Do not call this a solved streaming optimization. Per-frame calls/triangles differ at 23 and 16 observations due to async readiness (contributors not traced here), despite identical cameras. Therefore this does not isolate a causal whole-frame regression either. Render CPU mean changes in opposite directions between pairs. No reported browser errors.

Final images differ at 11 and 50 pixels, with RGBA MAE 0.000025 and 0.000236. Earlier byte tests match all 430,216 channels across 40 representative masks. Keep the simpler local distance reduction for its measured preparation saving, but do not infer whole-game FPS success. The cache remains fixed512 and the green substrate/vegetation/shoreline appearance unchanged.

Next work should address scheduling or moving expensive visual preparation out of the main-thread arrival burst, with bounded publication and image parity, rather than further local arithmetic tweaks. This requires preserving current terrain, mask and water outputs; no simulation or navigation work should move as part of that change. Cache default promotion remains pending.

Reproduce with WG_VARIANT_SEQUENCE=fixednativewaterlegacy,fixednative,fixednativewaterlegacy,fixednative; WG_STREAM_PATH=1; WG_PHASES=day; WG_COVER_QUALITY=media; WG_VIEW=normal; WG_MODES=cadence; WG_SAMPLES=240; WG_WARMUP=30; WG_REVIEW_OUT=<new directory>; run measure-mangrove-ground-hybrid-20261023.mjs.
