# Actual loading: full-scene versus isolated preparation GPU attribution

Frozen source `dfaf8880`, including main `621ed947` whose native World default is isolated far preparation. Real application Continue through the native menu, same temporary validated day101/time360 dense archive (23,894 historical plants,36 workers),1280×720. Arm A144 explicitly uses DEV `qa-loading-far-full-scene`; B146 retains the new default. Both enable optional loading timer queries. These two runs are attribution, **not an ABBA frametime acceptance test**. No concurrent agent renderer, heavy build or local campaign ran during them.

| GPU envelope | A resolved / median / p95 / max ms | B resolved / median / p95 / max ms |
| --- | --- | --- |
| Diorama |912 /5.013 /10.149 /11.889 |929 /5.078 /9.968 /13.598 |
| Synchronous far upload draw |30 /23.970 /52.804 /57.611 |34 /0.438 /9.754 /52.607 |
| Cinematic step |109 /9.288 /58.768 /78.089 |118 /5.058 /63.561 /78.660 |

The lower typical far-draw work with isolation is visible in this observation. However, **one B far draw still costs52.607ms and records140 calls/2,876,324 triangles** in the final renderer.info subpass; it has not been removed from the result. A's largest draw records174 calls/3,415,966 triangles. The second-largest B draw costs9.754ms and records23 calls/455,503 triangles. These counters describe the final subpass under Three autoReset, not total shadow/color work. The GPU query includes synchronous commands submitted by the draw, not compilation/decode/fence awaits. No query crosses an await, and no nested queries were started.

All far-draw queries resolved. Each run preserves four unresolved final queries from other labels, disposed and counted rather than treated as zero. Disjoint/discarded/backpressure/foreign/allocation/nested counts are all zero. Raw label/sample IDs, last-subpass counters and every RAF interval remain in the adjacent reports.

A:1025 captured intervals,p95 49.3ms,max166.2ms,three over100ms (149.8,116.5,166.2). B:1051,p95 33.3ms,max133.1ms,**seven** over100ms (133.1,116.2,116.4,133.1,116.5,132.9,116.4). Initial negative capture values (-65.3/-112.5ms) are retained: manual owner begin can occur after the already scheduled RAF timestamp. They are instrumentation boundaries, not negative physical frames or evidence of duplicate loops. Neither the mixed frame results nor this two-arm GPU profiling justify a causal global smoothness claim. Timer polling can itself change pacing; the next paired frame comparison should omit GPU probes.

Both reach genuine readiness/progress1 with no pending milestones or loading error. Both complete36 queued actors,failed/pending0 (A31 yields/282.3ms accumulated syncCPU/maxjob16.7; B32/291.1/max13.8). Work elapsed20.535/20.642s includes the cinematic. Each observes231 network responses and one confirmed cache response,106,750,632 decoded response bytes; download interval-union1089.9/991.6ms. The16000ms preparation estimate still requires final calibration rather than silently claiming precise time weighting.

Actual autoplay: night ambience starts on the ambient bus,AudioContext running,mastergain0.7. The loading emitter stops at handoff; loadingVoices empty. Warn/error console logs empty in both. No extra planting occurred, so this pair is not a028 interaction test.

Cleanup: each application saves only its temporary QA slot and returns to the verified native menu before closing. Seed143/145 visibly confirms temporary-slot removal, then closes. Viewport reset and browser inventory empty after each arm. The original archive is untouched.

The isolated default was accepted independently by root using traveling ABBA, multi-biome image/ownership and resource evidence; this report does not replace those gates. **Loading fluency, final visual polish, full resource/lifecycle coverage and release acceptance remain open. No PR.**
