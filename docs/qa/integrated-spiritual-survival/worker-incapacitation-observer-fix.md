# Native raid observer: incapacitating worker impacts

The protected candidate-three fourteen-night seed-712 pilot ends natively with 555 coins, 173 living crops and 89 cumulative crop destructions. Its old observer reports two unconsumed-or-unobserved hits: one lion hit on night 10 and one warthog hit on night 12. All recorded retirements for those nights have zero remaining budget. The global native event counts include two WorkerIncapacitated events.

The source diagnosis finds the second physical worker injury consumes an animal hit but emits WorkerIncapacitated instead of WorkerHit. The observer formerly counted only WorkerHit, overlooking this valid native consumption. The correction counts both impact events in workerHits and separately records workerIncapacitations, while leaving agricultural and structural damage unchanged. It does not adjust combat, prices, RNG or old campaign data.

A regression invokes the real updateWorkerEncounters with two physical overlaps, including an already injured worker. It fails against the old observer (one counted impact instead of two), then passes after the correction. Both native impacts reduce the real animal budget; the observer is read-only, does not count either impact as crop/structure damage and does not duplicate them on repeated observation. All 22 encounter, raid-observer and campaign-evidence tests pass.

Original reports, hashes and the two old budget gaps remain untouched. The global counts are consistent with the missing event class; the archived report does not contain enough per-event facts to reconstruct and certify an exact historical attribution retrospectively. Subsequent campaigns must use the corrected observer and their new source hash, rather than silently rewriting historical evidence.

All previously active campaigns were terminal before modifying the observer. No performance or full balance acceptance follows from this reporting fix.
