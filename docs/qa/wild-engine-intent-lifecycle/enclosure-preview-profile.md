# Speculative enclosure planning cost (experimental PR #53)

The existing crop enclosure service was measured in a continuous, legal Sabana/712 native-intent campaign at day 3 daylight. The 3-night run completed with verified raid observations. This is a single frozen workload, not evidence of campaign-wide speed or of a completed native enclosure-planning endpoint.

| Measurement | Result |
| --- | ---: |
| Live crop group examined | 66 crops |
| Proposed enclosure | 35 modules, 350 coins, one placement gap |
| Plan status | `ready` (native animal-profile certification) |
| Full plan | 6,592 ms |
| Outer wall preview, including nested previews | 6,574 ms |
| Preview callback | 357 ms |
| Preview outside its callback | 6,217 ms |
| Native crop-group query within preview | 14 ms, 2 calls |
| Placement checks | 13 ms, 109 calls |

The corrected phase measurement is [sabana3-native-enclosure-mutation.json](sabana3-native-enclosure-mutation.json). The source commit was `b9ec9051`; the WASM SHA-256 was `d757c2197f98fded1cb42b7759154f1bd95a532504da9539c2e8ade17a9f47b6`. `previewMutationMs` excludes the callback of the outer preview; three nested previews (333 ms in total) are included in that callback. Timings are wall-clock measurements from one process and should not be summed across nested calls.

The preview transaction in `spatial-game-session.js` applies proposed barriers, runs the protection query, and restores the original barriers and worker portals. `spatial_apply_barrier_batch` calls `flushBarrierBatch`, which refreshes affected sectors for each built navigation profile. That is a plausible source of the measured cost, but this experiment did not instrument individual C++ sector refreshes, so their exact share is unproven. The much smaller crop-group query and JS placement times rule those out as the primary bottleneck for this case.

A temporary variant skipped explicit worker-portal refresh for the service's animal-protection preview. It returned the same `ready` result and 35 modules, but took 6,517 ms versus 6,624 ms in the matching baseline ([variant report](sabana3-native-enclosure-no-portals.json), [baseline](sabana3-native-enclosure-stages.json)). This single-host difference is too small to justify changing portal semantics. The source was restored before committing.

The first sample at day 3's end returned `blocked` because construction permission had closed; [that negative result](sabana3-native-enclosure-profile.json) is retained. [sabana3-native-enclosure-phases.json](sabana3-native-enclosure-phases.json) double-counted nested previews and must not be used for timing. [The corrected run](sabana3-native-enclosure-phases-corrected.json) established that preview dominates, and the later mutation sample separated callback time from topology-transaction time. [The daylight sample](sabana3-native-enclosure-daylight.json) records the original valid plan.

Decision: do not call this whole-enclosure speculative certification for every income or topology event in the bot. The current event-driven policy remains in place. A future native planner should avoid applying and restoring a full wall chain over every navigation profile to answer a single group's certification question. It must preserve worker access, species-specific protection, natural barriers, unknown sectors, and speculative isolation, then be benchmarked on this frozen workload and a sustained campaign before replacing the existing service.
