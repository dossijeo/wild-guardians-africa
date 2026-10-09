# Resident preparation cadence experiment

`streaming-travel.html?preparationInterval=120` opts into at most one admission
per species every120ms for resident merged preparation. The default is zero,
preserving every eligible attempt. This is a QA candidate, not production
activation or an accepted improvement.

The gate is checked only after owner, context, busy and uncovered-ID checks.
It introduces no timer, task queue, asynchronous work or new coverage proof.
Deferred work is reconsidered on a later scene update. Snapshot identity,
packing/resource signatures and GPU fences still decide whether any preparation
can be accepted. Existing standby and impostor lifetime remain unchanged;
logical standby preload is not independently throttled.

The hypothesis follows native864: 101 resident merged preparations and108
standby preparations during15s of camera travel. Camera-dependent native LOD
bins legitimately repack trees. Reducing preparation frequency may reduce extra
draws, but could increase reliance on backups or delay the visual transition.
Neither fewer invocations nor passing unit contracts proves smoother traveling.

Directed cadence, immutable proof and standby contracts passed30 tests. Native
pilot, matched AB/BA, transition visibility and lifetime validation are required
before adopting a nonzero interval. CPU/GPU/frame measurements must remain
separate. Explicitly record the interval in every native report.
