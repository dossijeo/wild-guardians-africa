# Watering-side detours: candidates not promoted

Baseline: main `3d6dc1b0`, seed 712, native terrain and unchanged responsible
policy. The optional `--detours` probe in `tools/diagnose_canyon_opening.mjs`
checks alternative watering sides in a navigator with separate mutable caches.
It never substitutes the actor's route or changes a task. All three original
one-day daily records, phase measurements and sampled route fields remained
exactly identical to the previous uninstructed diagnostic.

Two Canyon/Sahelian counterexamples have original snapshots: worker-14 watering
plant-38 can use 12.720 m instead of 33.756 m; plant-24 can use 14.893 m instead
of 32.930 m. Alternatives retain the native body, slope, fluid, building and
watering-height tests. The first accessible watering side can therefore cause
a real avoidable detour. This does not prove all longer paths are erroneous.

Three prototypes were tried locally, never committed as production code:

| Prototype | Baseline CPU A1/A2 (ms) | Candidate CPU B1/B2 (ms) | Canyon first-day paid deliveries A/B |
| --- | ---: | ---: | ---: |
| Search the other watering sides | 2625 / 3077 | 3547 / 3542 | 17 / 19 |
| Reuse validated building-corner shortcuts | 2831 / 2848 | 3402 / 3326 | 17 / 20 |
| Same shortcuts with a bounded route cache | 3224 / 3331 | 4014 / 3468 | 17 / 20 |

These are one-process **ABBA CPU wall times for the entire simulated day**,
not GPU/FPS measurements or equal-workload microbenchmarks. The candidate
changes physical deliveries and subsequent planting, so elapsed differences
cannot be attributed exclusively to route selection. Baseline drift is visible;
no statistical performance gain is claimed. The additional work and uncertainty
do not justify promotion under the user's optimization priority.

The cached prototype also failed a regression in which the same field object
changed from blocked terrain to Canyon water. It retained a stale null route.
That failure is not removed by claiming ordinary gameplay changes epochs.
All runtime/observer modifications were restored to HEAD. The next candidate
should bound alternative-side checks more tightly and prove its own cache
invalidation if a cache is still justified.

The expensive prototype passed 19 watering/observer checks. Wider regression
passed 135 of 136 checks; the full-state golden changed. A separate baseline
graph reconstructed from Git reproduced the exact old golden. Candidate
golden changed only three event ordering/ID records; plants, crates, ledger and
every other top-level state field were identical, with 27 paid deliveries and
409 coins. This discrepancy is preserved, not repaired by replacing the test
hash. Current production still uses the original golden and route selection.

`receipt.json` hashes the original uncompressed JSON/source payloads, which are
losslessly gzip archived. Each ABBA report retains complete original states,
all four elapsed measurements and hashes. Prototype test/benchmark source is
archival text, not an active test. Reproduction needs the baseline checkout and
the selected archived work-points source; the benchmark was executed from the
repository's `.cache` directory with relative imports and the original module
graph. This archive does not claim that running its text in place is sufficient.

## Independent Windows result

Main53a4a996 Validate Game37926380301 is terminal SUCCESS. Windows37926380207
is terminal FAILURE: desktop build, executable and installer pass, then the
WebView2 smoke reaches its 90-second world-readiness deadline. The original
report is retained as `windows-53a4a996-smoke-failure.json`: 22 decoded models,
audio/WebGL2/worker/storage/menu pass, but no completed-world receipt exists.
The loading agent is investigating; the web acceptance is not relabeled a
Windows success, and the timeout has not been increased.
