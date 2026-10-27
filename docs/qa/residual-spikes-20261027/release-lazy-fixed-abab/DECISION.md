# Corrected deferred selection: ABAB decision

All four runs completed successfully. comparison.json verifies same hardware, fixture and harness hashes and no page/console/request errors. Two active-simulation camera sweeps per run; asynchronous residency remains variable.

The eviction CPU spike is consistently reduced: recorded release maxima A21.335/25.180ms vs B4.025/3.655ms. CPU World.render frames above33.333ms: A7/7 vs B1/2. Max World.render CPU: A69.10/63.05ms vs B54.85/56.02ms.

Global presentation P95 remains about33.4ms and P99 about50ms. Intervals above50ms are A73/64 vs B72/76. CPU render P99 improves in the first pair but worsens in the second (A21.79/20.89 vs B19.91/22.57ms). Thus there is no consistent global percentile improvement. Do not present the local saving as completion of the overall fluency goal.

Decision: preserve candidate for broader validation as a demonstrated elimination of a specific eviction spike; keep official production binaries unchanged for now. Next attribution is far vegetation update (world-frame-stage:3) and render submission, not another unmeasured eviction micro-optimization. No visual density reduction is involved.

Correctness evidence: seven native differential tests, six-biome pthread eviction/lifecycle test, and actual memory-growth payload test pass. Visual review of the corrected captures, wider world edits/save-load lifecycle and distribution validation remain pending before production adoption. Raw data retained as gzip with SHA256 in raw-data.json.
