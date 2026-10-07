# Stop counting tasks once urgency is known

`urgentWork` retains the full live eligible-worker count and exact division /
strict threshold. Its task scan can now stop as soon as enough matching tasks
make the answer true: later tasks cannot lower that count. Assigned tasks still
count. No counts are cached between workers or between queries; earlier task
completion and employee departure remain visible in the same update pass.

Baseline is the exact locomotion module from main `3dac0ed`. Five hundred
deterministic varied states before and after task removal/worker departure
produce 20,282 equal decisions, without query mutation. Thirteen directed tests
pass, including strict boundaries, assigned tasks, ignored other centers,
unread suffix after the threshold, live worker departure and shift end.

Twenty-four alternating CPU pairs per case exclude four warmups. Existing
historical campaign processes40968/41304 were running. No rendered scene or
other root benchmark ran during these measurements. This is an isolated Node
query benchmark, not a GPU/frame/mobile or allocation-byte measurement.

| Workers / tasks / centers | Baseline median | Candidate median | Baseline p95 | Candidate p95 |
| --- | ---: | ---: | ---: | ---: |
|4 /8 /1, 500 sweeps|0.625 ms|0.665 ms|0.990 ms|1.005 ms|
|140 /1600 /1, 12 sweeps|40.562 ms|14.486 ms|55.438 ms|20.617 ms|
|140 /1600 /5, 12 sweeps|30.662 ms|9.305 ms|38.837 ms|11.715 ms|

Large-case medians fall about64%/70%. The small nonurgent case does not improve;
its median and p95 are slightly higher, and no universal speedup is claimed.
These are repeated-query batches, never individual gameplay frame times.

## Integrated behavior

Both current-domain runs use32 paid crops,8 hired workers, explicit10,000-coin
QA credit and5 controlled species. The loader substitutes only the baseline
locomotion module. All other current modules, including payroll event metadata,
are identical. Both complete1630ticks and146searches with full serialized
trajectory SHA256:

`6a55b8071ce77a8f3b21bdf9e534e58550997f4472b26523c019b959724f6838`

The raid ends at163 simulated seconds; the deliberately damaged center is
ruined, with no domain result. The two trace runs were concurrent; their timing
fields are not paired performance evidence. This is not responsible100-night
survival, natural encounter balance or rendered visual acceptance.

Build passes with the existing large-bundle warning. Original source, loader,
full trace reports, benchmark samples and directed test output are retained.
The JSONL trace files end in a multiline report; they are not standalone JSON.

```powershell
node tools/benchmark_urgent_work.mjs OUTPUT.json --baseline=3dac0ed
node tools/benchmark_urgent_work.mjs BEHAVIOR.json --baseline=3dac0ed --verify-only
node --test tests/urgency-short-circuit.test.js tests/locomotion.test.js tests/worker-first-task.test.js
node --experimental-loader ./docs/qa/urgency-short-circuit/urgency-short-reference-loader.mjs tools/check_integrated_load.mjs --trace --warm-navigation
node tools/check_integrated_load.mjs --trace --warm-navigation
```
