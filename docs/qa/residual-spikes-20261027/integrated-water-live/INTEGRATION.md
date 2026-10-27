# Incremental water integrated into experimental chunk streaming

Scene preparation now invokes the shared incremental bed sampler only when asynchronous preparation is requested and the native payload has no prepared waterBed. It preserves the exact sampling, bytes, shaders and private group publication. Native precomputed beds are reused. The synchronous compatibility path is unchanged. Iterator return closes child sampling on cancellation; scheduler labels retain water-bed / water-edges attribution.

Validation: 24 targeted tests passed; vite production build passed (warnings: existing static/dynamic far-atmosphere import and large bundle). Integrated live run completed, five observed calls and 141 yields including post-benchmark probes. Live bed: 23,364 identical bytes. Real private iterator cancellation disposes group, water geometry and material once, leaves resident groups unchanged. No page/console errors captured. QA adds counters by delegating to the same shared implementation; it no longer injects a separate scene control flow.

The explicit WG_CHUNK_WATER_BED=0 QA setting restores synchronous bed preparation for valid A/B comparisons. Unset uses production integration. Prior ABAB showed lower water unit maxima and improved delivery tails, not a presentation P95/P99 improvement. No new performance claim is made from this single integrated run.

Main remains unchanged. Before promotion: integrated quality/context and construction validation, broader regression checks, reproducible performance comparison, review. Other regional ground attachment and mud geometry costs remain unresolved.
