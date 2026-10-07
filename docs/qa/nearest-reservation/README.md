# Nearest reservation without sorting every reachable pool

For pools of eight or more idle employees, reservation now finds the nearest
candidate with one distance calculation per employee. If that route fails, the
fallback sorts by those saved distances and the existing ID tie-break, then
queries the remaining employees in exactly the original order. Distances and
candidate pools remain local to the synchronous reservation pass. Smaller pools
retain the original sort/find path. FIFO, eligibility and failed-route behavior
are preserved.

Fifteen directed tests pass, including 500 varied full-state comparisons,
historical farms, ties, missing targets, exhausted pools, blocked candidates,
exact route-query order and new-contract/raid-return behavior. Build passes with
the existing bundle-size warning.

The benchmark loads the exact committed 332e242c task module. Twenty-four
alternating pairs per case exclude four warmups and setup; all resulting states
match. Median CPU milliseconds for batches of reservation calls:

| Workers/tasks | Calls per batch | Baseline | Candidate |
| --- | --- | --- | --- |
| 4/8 reachable | 100 | 0.933 | 0.970 |
| 40/100 reachable | 20 | 8.826 | 4.180 |
| 140/1600 reachable | 4 | 31.114 | 10.658 |
| 40/100 all blocked | 10 | 22.364 | 19.831 |
| 140/160 all blocked | 2 | 27.847 | 23.729 |

Large reachable batches improve about 53–66%; blocked batches improve about
11–15%. Small-pool tails are worse in this sample despite retaining the same
algorithm; no small-case speedup is claimed. The first candidate recomputed
distances on fallback and regressed blocked cases; its rejected measurement is
preserved. No A* cost is included. Three historical/current campaign processes
and other browser processes were present; no FPS, GPU or mobile gain is proven.

The native domain integration probe compares the archived task module against
the candidate with other modules current: 32 paid crops/eight paid workers using
explicit QA credit, followed by five controlled species. Both complete 1,630
ticks and 146 searches with identical full serialized trajectory hash
`edb6bafd9fd0ab679401a805ae756e17e934e0a12e6a0e22defd5d164d47b91a`.
These simultaneous runs verify behavior, not comparative timing or a normal
economy campaign. The running 100-night campaign stays on frozen 9c2db027.

Reproduce the CPU comparison with
`node tools/benchmark_nearest_reservation.mjs 332e242c`. Integrated baseline uses
`node --loader ./docs/qa/nearest-reservation/reference-loader.mjs tools/check_integrated_load.mjs --trace`;
candidate omits the loader. JSONL files end with a multiline report.
