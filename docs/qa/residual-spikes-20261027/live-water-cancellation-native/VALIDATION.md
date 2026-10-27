# Live private water preparation cancellation

The real scene iterator used the resident native chunk payload, preserving/restoring the native selected chunk. The QA driver forwards worker waitFor values, then closes the iterator after the first sampled incremental water yield. This does not publish the prepared group.

Result: interruption confirmed after 9 steps; private group disposal once, water geometry disposal once, owned water material disposal once; resident chunk references unchanged; no captured page/console errors. Subsequent live bed check retained 23,364 identical bytes. Module scheduler tests separately prove the invalidations that close the iterator. This run is not forced context loss or construction overlap.

Negative attempts retained: initial run aborted because the QA driver omitted waitFor forwarding; corrected driver first failed because null payload entered legacy terrain generation (field.lattice unavailable). The accepted run reads core.chunkPayload() for the already resident chunk, matching the production stream. No production fallback was added to accommodate the test.

Next: integrate the shared implementation into the experimental scene path, retaining byte equivalence and private-group publication; validate changes with the real native streaming pipeline before promotion to main. No new performance claim from this functional check.
