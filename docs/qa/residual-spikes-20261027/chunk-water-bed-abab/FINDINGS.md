# Chunk water-bed A/B/A/B: better delivery, overall fluency not yet established

Original/candidate/original/candidate, Intel UHD,1280x720 medium, same save/camera/initial25 resident chunks, active simulation and40-second144-unit excursion. Warmup to elapsed30s plus stable-residency gate; dynamic simulation state is not forced identical. All four runs pass no page/console errors; no dropped diagnostic rows. Candidate execution asserted nonzero. Source hashes frozen across the sequence. Screenshots outside timed windows.

|Metric|A1|B1|A2|B2|
|---|---:|---:|---:|---:|
|Max recorded water unit ms|24.91|4.86|41.36|7.15|
|Completed requests /30|19|23|20|23|
|Pending at window end|11|7|10|7|
|Completed-demand latency P95 ms|10360|2873|6655|2340|
|Main synchronous callback max ms|38.40|30.62|50.02|38.61|
|World.render CPU P95 ms|16.24|16.38|16.18|17.53|
|Presentation P95 ms|49.92|49.95|49.93|49.99|
|Presentation P99 ms|66.51|66.57|66.53|66.59|
|Presentation maximum ms|99.69|83.17|83.15|83.20|

Delivery ends after onData returns, not proof of GPU readiness. Completed-demand latency statistics are censored: pending requests are retained separately and cannot be silently excluded from the decision. Matched completed keys: first pair15/19 faster, median delta -326ms; second9/20 faster, median delta +35ms. Improvement is concentrated in slow delivery tails/throughput, not uniformly faster individual chunks. No cancelled requests in these windows. Same40 distinct chunks traversed is not equivalent to identical resource residency throughout the run.

Water unit logging omits durations below1ms; its percentiles/totals are not complete-work distributions. The .75ms cooperation target is not a hard bound: observed units reach7.15ms, including indivisible generator setup/block work. endFrame is async; main callback metric only includes its synchronous prefix. GPU queries retain normal bubble/driver limits.

Interpretation: repeated evidence supports removing the indivisible water-bed fallback and improves demand delivery without extending this fixed traversal. It does NOT establish higher FPS or lower presentation P95/P99. B2 CPU is higher; frames above50ms are44/61/52/67 (threshold close to refresh quantization). Do not suppress these results or claim all fluency solved. Prior unchanged-runtime variance remains relevant. Candidate remains isolated; production source untouched.

Required next gates: bank/water visual comparison in a camera that actually shows the affected surface; construction/invalidation and cancellation during staged preparation; quality/context lifecycle; then integrate the shared implementation on the experimental branch only if these pass. Regional ground attachment and worker data-access tails remain separate unresolved costs. Current screenshot endpoints look down at crops and are not art-equivalence proof.

Reproduce: node tools/experiments/run-chunk-water-bed-abab.mjs, then node tools/experiments/compare-chunk-water-bed-abab.mjs. Raw JSON/logs committed compressed; decompress to original paths before summarizing a fresh checkout. The chunk-delivery probe has three passing tests for replan deduplication, cancellation/epochs and ownership restoration. Existing ten byte-equivalence/ownership water tests remain the functional foundation, not substitute for live validation.
