# Integrated fixed512 continuous streaming diagnostic

Intel UHD, 1280x720, medium/day. Integrated fixednative option. Camera and target move together from 0 to 144 metres and back with a cosine path over 270 frames (30 warmup + 240 recorded). Whole-GPU and cadence windows run separately; simulation stays paused. Camera crosses real chunk boundaries, without settling pauses during measurement. This is an attribution diagnostic, not an A/B comparison or acceptance benchmark.

Cadence: mean interval 37.24 ms, p95 89.30 ms, maximum 135.50 ms. Render CPU mean 12.54 ms, p95 19.30 ms, max 43.30 ms. Whole GPU in the separate window: mean 25.91 ms, p95 32.56 ms, max 41.47 ms. These streaming spikes are not acceptable evidence of completion and must be attributed before promotion to default.

At the end of each path the cache returns to 25 targets / 35,209,000 bytes (33.58 MiB). No rejected requests, browser errors or GL errors. Each recorded window contains 29 observed publication increments after its first sample. Registry totals progress from 30 initial additions to 90 additions / 65 removals by the end; cache peak remains 33.58 MiB. Targets are rebuilt as chunks arrive, not retained indefinitely.

Frames with a publication correlate with long intervals: cadence mean 88.97 ms versus 29.82 ms without a publication; render CPU 15.82 versus 12.10 ms. GPU window means 28.48 versus 25.55 ms. This is NOT causal isolation: chunk creation, uploads, shader compilation and publication coincide; intervalMs is measured at frame entry and includes preceding/inter-frame work. The first recorded frame is excluded from this grouping because its prior publication count is unknown. See generation-correlation.json for top intervals and raw context.

Next: isolate bake submission/GPU and first-use material preparation from other chunk work using the same selected 512 architecture. Do not reopen lower-resolution alternatives. A continuous-path original-ground control is needed before attributing whole-scene spikes to the cache. The current shader selection remains fixed512; lifecycle integration stays opt-in.

Reproduce with WG_STREAM_PATH=1, WG_VARIANT_SEQUENCE=fixednative, WG_PHASES=day, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=frame,cadence, WG_SAMPLES=240, WG_WARMUP=30, WG_REVIEW_OUT=<new directory>; run tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs. Default camera path remains unchanged when WG_STREAM_PATH is absent. QA per-frame telemetry records cache counters only, with no production telemetry allocations added.
