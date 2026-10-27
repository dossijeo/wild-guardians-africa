# Candidate-bounded transition updates (experimental)

Current-runtime attribution, one instrumented Mangrove sweep, Intel UHD720p medium: far update P959. **Correction: P95 5.08ms, P99 9.515ms**, maximum18.70ms. Method clocks are nested and include instrumentation overhead. Transition coverage totals763.585ms across6828 calls; standby872.615ms, logical preload416.850ms. Do not add these to their enclosing layer/adapter times.

The joint coverage predicate can only return true for an entry in the active prepared standby bank. Expose those IDs as a conservative candidate enumeration. The transition controller evaluates their union with previously positive targets, retaining exact coverage.has checks, existing revision invalidations and immediate revocation. Full enumeration remains for other coverage providers. Rebinding seeds prior positive states so retained fades cannot escape revocation.

This is different from the rejected revision-change experiment: no invalidation is removed and no unprepared entry becomes authorized. Two new differential tests compare the candidate path with full enumeration across400 deterministic replacements, suppressions, loss of readiness and rebinds. Together with native coverage/preparation/standby tests:38 pass. No game-performance benefit claimed until measured; do not promote to main yet.
