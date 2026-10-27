# Concurrent depth/beauty readiness: exploratory candidate withdrawn

Hypothesis: serial driver-readiness waits unnecessarily extend preparation. Candidate starts depth and beauty submissions with synchronous state restoration, then waits Promise.all before draw/fence/publication. Existing59 tests pass, but no new concurrency acceptance suite was completed.

One attributed real-game run: no GL calls>=10ms; main CPU max79.245ms, transition interval max236.155ms, travel12.528s, settled15.526s. No clear throughput recovery versus serial candidate14.751/16.613s, and still slower than original10.788/13.871s. Single diagnostic is insufficient for comparative statistical claims; withdraw rather than promote added concurrency without a convincing signal. Original serial candidate restored from HEAD. Full-depth candidate itself remains unapproved, per prior ABAB.

No change to main. Patch and raw report retained. The next useful direction is exact duplicate-work attribution or a cheaper depth recipe, not further concurrency tuning based on this pilot.
