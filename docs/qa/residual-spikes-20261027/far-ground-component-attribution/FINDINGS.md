# Regional ground component attribution

In the integrated water ABAB, synchronous far-region ground attachment remained 22.85–26.60 ms in the candidates. The additional diagnostic run reproduces 22.02 ms. Nested sampled normals cost 1.345 ms in that traversal. UV, material attach and toon wrappers emitted no >=1 ms sample in the measurement window; startup samples are retained separately. Missing samples are censored, not proof of zero cost.

Do not rewrite normals based on the whole attachment total. Most of that total remains unattributed. Next inspect seam setup/update and other remaining synchronous portions, including worker dispatch/serialization, with bounded spans before proposing a change. Awaited GPU-ready/worker spans are latency, not synchronous CPU or GPU execution time. This is diagnostic only; no production rendering change.

The new module route instruments Vite-transformed source so bare Three imports remain resolved. Raw reports and source hashes retained; no page/console errors, no dropped regional spans. Use summarize-regional-tail-attribution.mjs to reproduce after decompressing the raw report.
