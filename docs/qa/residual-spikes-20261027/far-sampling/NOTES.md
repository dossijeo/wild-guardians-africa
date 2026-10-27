# CPU sampling attribution

Real active agricultural fixture, Manglares, Intel UHD, 1280x720 medium; native lazy-fixed runtime, one 40-second sweep, no spell cast. Run completed successfully. Statistical CPU profiler adds overhead: these are attribution estimates, not ABAB timings or GPU duration.

Profile wall span 41697.848 ms. Samples beneath far-system ancestors represent 4042.908 ms including asynchronous preparation. Far leaf estimates include standby update 449.871 ms, frustum intersectsBox 380.641 ms, transition setCoverage 285.991 ms, native fade update 275.303 ms and identity key construction 263.093 ms. Inclusive and leaf totals must not be added.

Outside this scope, shadow-cache attribute traversal accounts for 1147.683 ms of leaf samples and its object callback another 584.582 ms. Source inspection confirms every active instanced attribute value is copied into a newly allocated snapshot, even for static data. This is a candidate for structural savings; correctness requires retaining detection of relevant changes, including unchanged-version mutations under the existing contract. No production optimization or improvement claimed yet.

Next: audit shadow-cache tests and mutation producers before choosing an incremental mechanism. Preserve unknown-shader fallback, animated casters, resource/context invalidations and shadow geometry independent of camera culling.
