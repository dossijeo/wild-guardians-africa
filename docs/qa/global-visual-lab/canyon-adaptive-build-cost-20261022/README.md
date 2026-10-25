# Adaptive horizon construction optimization

QA builder only. Numeric coordinate keys and binary-search edge slices preserve topology. Profiling then identified packing as dominant: allocating temporary point/colour arrays and growing Geometry.v consumed242–373 ms in sampled runs. Final variant writes directly into a preallocated Float32Array, preserving original normal arithmetic and vertex order.

Three origins, alternating original/fast eight runs each. Excluding first pair per origin, median total construction:

|Origin Z|Original ms|Fast ms|
|---|---|---|
|96|478.9|210.4|
|192|507.8|241.1|
|288|453.8|159.9|

All24 runs have exactly equal terrain and water buffers. Node construction measurements, not browser FPS/GPU timing. Variation remains substantial. The full native base horizon is still generated to reuse water; more work can be removed later. Memory peak has not been measured; lower allocation churn is an implementation observation, not a measured heap saving.

Six new real game captures in ../canyon-horizon-adaptive-fast-20261022 are pixel-identical to the original adaptive candidate, day/night at all three poses. Keep optimized QA builder; production density unchanged. Long moving-camera latency and alternate views/seeds remain pending. No FPS improvement claim.

Reproduce: node tools/experiments/benchmark-canyon-adaptive-build-20261022.mjs. cost.json is final A/B data; profile.json preserves the intermediate binary-search-only profile before direct packing. profile-canyon-adaptive-build now profiles the current implementation and will replace that historical file if run.
