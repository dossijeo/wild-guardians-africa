# Worker routes after rebuilding walls: native performance gate

Branch: `codex/campaign-unfunded-geometry-guard`, implementation commit
`fed10dca`. Economic and agricultural parameters, military parameters and
the frozen good/Q15/cashflow/shore virtual-player policy were unchanged.

## Change

Repairing an intact wall changes its HP but not the traversable geometry, so
the navigator retains its epoch and cached routes. Rebuilding a ruined wall
still increments the navigation epoch. After rebuilding, only active worker
paths whose **every remaining segment** lies outside the new wall's
radius-expanded collision bounds receive the new epoch. Paths that intersect
the bounds replan normally. Rebuilt gates conservatively replan everyone
because their moving leaves can extend beyond the rigid wall bounds. Nothing
is moved or teleported to make a path pass.

## Exact-checkpoint replay

The day-13 time-140 save from `pilot-v129-day13-worker-checkpoint/` was replayed
from the same state for 30 simulated seconds with no virtual-player decisions.
The two baseline and two candidate runs were sequential on the same host
(ABBA); each run built a fresh navigator. Raw compact traces are named
`day13-v129-30s-baseline*.json` and `day13-v132-30s-replay*.json`.

| Replay | Sum of 300 tick times | Ticks >50 ms | Cold maximum |
|---|---:|---:|---:|
| Baseline A | 4,562 ms | 9 | 757 ms |
| Candidate B | 1,848 ms | 6 | 724 ms |
| Candidate B | 1,914 ms | 6 | 760 ms |
| Baseline A | 4,250 ms | 9 | 732 ms |

The approximate total-time reduction is 57–59%. The cold first-tick peak
remains; this change is not a complete stutter fix. At 30 seconds both versions
had the same balance, living crops, structure HP/status, worker status and
task assignments. Their event type/target sequence matched. Event IDs and
several worker coordinates differed because preserved routes avoid unnecessary
replanning; the largest coordinate difference was about 0.77 m. This is a
technical routing change with a real productivity effect, not exact state
identity.

## Uninterrupted native pilot

The fully frozen candidate run is in `pilot-v132-route-preservation-frozen/`:
14 nights completed, same seed 123, biome Sabana, culture Mapungubwe and policy
as the previous `pilot-v129-worker-target-hints/` run. The original first
attempt in `pilot-v132-route-preservation/` correctly stopped before starting
because tracked runtime had not been committed; it was a harness error, not a
game defeat. The runtime was then committed and the pilot rerun in a new
evidence directory.

| Day-13 native tick timing | Before | After |
|---|---:|---:|
| Samples | 416 | 422 |
| Sum | 21,508 ms | 14,942 ms |
| Peak | 1,293 ms | 910 ms |
| p95 | 197 ms | 139 ms |
| p99 | 790 ms | 531 ms |
| Samples over 100 ms | 34 | 28 |

The previously dominant time-139 worker phase fell from 1,243 ms across ten
0.1-second substeps to about 4.5 ms. New prominent peaks remain around times
191–210 and 493. Both pilots survived 14 nights and reached 210 maximum living
crops. Cash at the horizon was 640 before and 828 after, consistent with
workers losing less productive time to replanning. These single-seed results
do not establish balance or campaign win rates.

Directed worker, navigation and repair suites passed: 21 tests in the repair
selection and 41 in the broader routing/navigation/wall selection, both
including the new tests. The 100-night campaign remains on hold because
day-13 long frames still exceed the accepted smoothness range. Next isolate
the time-191 and time-493 spikes without changing player policies or balance
parameters. The deprecated inactivity measure was not used for acceptance.
