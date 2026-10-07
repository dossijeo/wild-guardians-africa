# Progress samples inside long campaign days

The single-case and serial-matrix campaign tools now publish a compact live
sample at the first onTick callback and at most once per 30 seconds of monotonic
wall time thereafter. Parallel matrices inherit this through their case child
processes. Samples record simulated day/time/elapsed, completed nights, pauses,
living plants, undelivered crates, worker statuses, pending/reserved/blocked
tasks and animal positions, targets, remaining hits and path lengths.

Samples contain copied scalar data; they neither retain live entity references
nor issue game commands or consume RNG. Animal detail is capped at 32 entries,
with complete population/status counts and an explicit truncation flag.
Skipped sampling does not inspect the simulation state. A wall-time jump emits
one sample rather than a catch-up burst. The helper is included in input hashes
recorded before each new run starts.

This is offline diagnostic instrumentation, with no app renderer, game balance
or acceptance-threshold changes. A synchronous navigation search cannot emit
until onTick is reached again. A stale sample therefore does not prove that a
process has exited or hung: inspect the actual process handle separately.
`live` is the last sampled state, including after a run ends; final report/state
and top-level status remain the authoritative completion evidence.

## Verification

Three tests pass: monotonic boundaries and zero state reads on skipped calls;
input/previous-snapshot preservation after live mutation; bounded animal detail
with full counts and interval validation. `tests.tap` retains the result.

The actual CLI completed one night with seed 712, Gran Cañón/Mapungubwe, the
ordinary mixed responsible reinvestment policy, a maximum of 70 living crops,
328 final coins and no defeat. Its status, report, summary and source provenance
are retained here. The first live sample was written and the helper hash is
present. This fast run exercised initial sample/file integration; periodic
30-second sampling is covered by the injected-clock tests, not by that short
native-terrain run. This does not prove 100-night survival or any FPS gain.

Reproduce from repository root:

```powershell
node --test tests/intensive-heartbeat.test.js
node tools/check_intensive_case.mjs gran-canon mapungubwe 1 OUTPUT_DIRECTORY
```

The pre-existing 100-night processes 40968 and 41304 were confirmed alive while
this was implemented and were left running on their frozen source revisions.
They do not acquire this instrumentation retroactively. Their old reports
remain historical evidence and must not be relabeled as current-main results.
