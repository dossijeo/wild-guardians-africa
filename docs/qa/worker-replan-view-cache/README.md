# V6: bounded private views for worker replanning

QA only. Production navigation and movement are unchanged. This builds on the V5 risk metadata guard, retaining its limitations: coarse risk classification is not a continuous proof of safe terrain/fluid boundaries.

V5 rebuilt the private navigation view on every request after a rejected landing. V6 keeps at most eight actor views, keyed by geometry version, radius, ignored obstacle and exact avoided-coordinate signature. Each view has an immutable point snapshot and bounded private caches. Large closed/search regions are discarded whole rather than truncated into invalid connectivity proofs. Native gate positions/links are shared; each usable edge still goes through the view's checks.

Results:

- Six unit cases pass: repeated failures, actor/proposed-building isolation, invalidation, eight-view LRU, bounded collections/whole-region eviction, and sharing a populated two-node gate graph.
- On the native historical farm with a constructed stationary worker targeting its confirmed invalid avoided point, 100 identical null queries invoke `findPath` 100 times in V5 and once in V6. This is an invocation count, not a timing or graph-expansion benchmark; the invalid endpoint can return early.
- The native connector that previously admitted an invalid landing is rejected once and rerouted. The constructed worker reaches its destination in 70 steps; every sampled position is valid.
- Save/restore immediately after rejection at step seven yields 63 identical complete serialized state pairs and reaches the destination. Only the constructed worker moves; the other actors and clock are frozen.
- A separate 100-tick historical farm continuation observes two new invalid worker positions with the reference and zero with V6. This does not establish full campaign acceptance.

No CPU/GPU timing was collected for V6. V5's previous +8% CPU result must not be attributed to this candidate. Broad terrain/fluid, gate, save and populated-farm acceptance plus a controlled timing run remain necessary before integration.

Compressed files preserve exact tested sources and reports; `receipt.json` records raw byte counts and SHA-256. Sources retain their original `.cache` import paths and require the V5/native project dependencies. Run `node docs/qa/worker-replan-view-cache/verify.mjs` to verify this archive.
