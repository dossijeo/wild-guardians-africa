# Per-center available workers during FIFO reservation

`reserveTasks` now builds one eligible-worker list per center for its synchronous
pass. Each successful assignment removes that worker from the list. Remaining
tasks keep the original FIFO order, nearest-first reachability queries, blocked
flags and missing-target behavior. Lists do not survive a pass, so hires,
contract changes, removals and queue rebuilds are observed next time. The
reachability predicate remains pure with respect to employee eligibility.

17 directed tests pass, including 500 varied-state comparisons against the
original selection, ties, unreachable candidates, multiple centers, paid first
assignments, automatic harvest, expired/busy workers and historical queues.
The new 1600-task/140-worker case verifies full reservation state and bounds
center reads to three per worker, including after available lists are exhausted.

`benchmark.json` records exact baseline/candidate/tool hashes. Four synthetic
CPU cases use 10000 historical crops,1600 pending tasks,140 workers and one/five
centers, with/without blocked targets. All 96 alternating pairs have identical
full resulting state; four warmup pairs per case are excluded from timings.
Median CPU cost decreases about 30–55%; sample p95 and maxima decrease in all
four cases. This excludes cloning and real A* cost, and is not GPU/frame/mobile
or campaign performance evidence.

`integrated-baseline.json` and `integrated-candidate.json` execute the existing
paid domain stress fixture:32 crops,8 employees,10000 explicitly credited QA
coins and five animal species. The baseline loader substitutes only the tasks
module from5e1ea92, retaining current other modules. Every serialized step feeds
SHA256; both1630-step trajectories match
`fa022a98f3125d777e4ad082cf167a2b2462e1d14d9062d94ac4ffa680f6e5e0`.
Both use146 searches, preserve event counts, complete the raid at163 simulated
seconds and leave the prepared center ruined without a domain defeat. This
does not establish survival of100 nights or rendering/audio acceptance.

Build passes with the existing bundle warning. Reproduce the CPU comparison:
`node tools/benchmark_center_task_pools.mjs OUTPUT.json`. Reproduce the current
integrated trace with `node tools/check_integrated_load.mjs --trace --warm-navigation`.
