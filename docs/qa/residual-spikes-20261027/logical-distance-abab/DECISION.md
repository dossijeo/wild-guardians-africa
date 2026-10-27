# Cached distance ordering: not retained

Four interleaved real-game runs passed strict provenance, hardware, GPU-sample and error checks. Intel UHD, 720p, medium, active agricultural Manglares, two moving-camera sweeps per run. Detailed far-method instrumentation was disabled.

| Metric (ms unless count) | A1 | B1 | A2 | B2 |
|---|---:|---:|---:|---:|
| CPU World.render P99 |22.350|21.025|21.465|21.760|
| Presentation P95 |49.800|33.640|49.760|49.530|
| Presentation P99 |66.520|66.460|66.420|66.435|
| Presentation >50ms (count) |126|92|103|111|
| GPU P99 |35.938|32.182|33.374|32.338|

The first pair's CPU improvement does not repeat. Presentation P99 is unchanged; >50ms events improve then regress. GPU differences cannot establish an effect of cached CPU distance arithmetic. No consistent full-frame benefit demonstrated. Restore the original selection implementation, retain the candidate patch and differential tests as experimental evidence. Do not merge this candidate.

Reproduce by applying candidate.patch to the original implementation, then running node tools/experiments/run-logical-distance-abab.mjs against the Vite server on port 5220, followed by node tools/experiments/compare-release-border-abab.mjs docs/qa/residual-spikes-20261027/logical-distance-abab logical-distance. The runner restores its starting candidate in finally; restore original afterwards for the rejected configuration. Raw reports are gzip-compressed with uncompressed SHA256 checksums. Captures remain locally available in each run folder.

These results cover one scene, not final six-biome acceptance. The broader goal remains open; prioritize missing final-state coverage and confirmed large contributors.

After restoration, 10 original policy tests and the snapshot comparison pass. The latter now compares the restored original to its reference; it is not a new validation of candidate correctness. Candidate differential validation preceded benchmarking and is recorded separately.
