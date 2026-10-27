# Volcanes seam reuse validation

Invariant comparator passes. All runs: 15 chunks, 240 advancing travel frames, no final failed/pending stream work.

CPU maxima A118.52/B62.46/A147.34/B62.38 ms. Slow GL calls A4/B0/A5/B0. Callback P95 stays about 50 ms; P99 A66.42/B66.58/A99.55/B66.69 ms. Settled seconds A6.859/B6.730/A7.219/B7.127: small differences, do not claim significant throughput gain.

Supports reduced worst CPU spikes without measured latency regression in this fixture. Together with Manglares warrants lifecycle and visual validation, not final global acceptance. Existing warnings retained, two repeats only, GPU queries include bubbles, active world changes with wall time.
