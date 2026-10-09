# Detailed frozen F10 physical-service control

One authorized run, observer source70dd28fb, producer frozen83b1c1e, session98601 /
PID44640, terminal exit0,134520ms measured wall time. No baseline repeat,15-day
or100-day run. All376 producer hashes were verified before imports. Entire F10
stateSHA5fa1a0bebd54299c4abf45f425bc361c46fba12fc5f8c0864145b7528206920f,
policy and allfirst10 daily rows exactly match the original negative case and
F100 prefix. Nine observer tests passed before this run. Original RNG, money,
commands, routes and all persisted state are bound by full-state parity.
Survival, physical ledger/hydration and daily delivery pass. Early activity
1079/3000=35.9667% still fails; original F10026.4333% is still rejected.

Raw frames/decisions3790 include one terminal day11/time0 callback, not an11th
working day. TaskIDs16854 represent repeated queue reconstructions, not plants:
15922 first observed duringdays1–10 and932 first observed only at terminalday11.
The latter remain pending and are separately excluded from early waiting
distributions. All early taskIDs have disappeared by the terminal reconstruction;
that does not mean the final logical queue is empty.

## Observed queue waits

| Task | Early taskIDs | Completion evidence | Censored removal | First-observed→reservation median / p90 |
| --- | ---: | ---: | ---: | --- |
| Initial | 7651 | 1520 WaterSatisfied | 6131 | 198 / 273s |
| Water | 4532 | 1061 WaterSatisfied | 3471 | 81 / 199s |
| Harvest | 3738 | 830 CropPicked | 2908 | 40 / 130s |
| Loose crate | 0 | 0 | 0 | unavailable |
| Repair | 1 | 0 | 1 | unreserved throughout observation |

Reservation statistics include only taskIDs with observed reservation. These
are callback endpoint ages, with1s daytime/5s inactive-night uncertainty; they
are neither original enqueue timestamps nor total lifetime waits per plant.
Task reconstruction ends an observed taskID without proving task completion.
Queue seconds sum concurrently waiting tasks and differ from worker actor-seconds
and global time. No loose-crate queue case occurred: no invented wait or pickup
metric is assigned. Normal carrying is observed separately, and a carried crate
is never equated to paid delivery. Per-crate delivery timestamps were not retained.

## Walking represents substantial actual movement in this early case

| Phase | Observed actor-s | Endpoint displacement | Zero-displacement actor-s | Path-null actor-s |
| --- | ---: | ---: | ---: | ---: |
| Walking initial | 39876 | 42866.73m | 0 | 172 |
| Walking water | 22097 | 28372.27m | 0 | 126 |
| Walking harvest | 15422 | 29896.59m | 0 | 65 |

Gate-wait/fall observations are0 for these three walking categories. Endpoint
displacement is a lower bound on path distance within each tick. Brief path-null
samples can be newly reserved work before its route is prepared; they are not
evidence of CPU search cost or collision failure. Private actor-motion search/
blocked/yield WeakMaps remain unavailable. Substep stops or oscillation are not
excluded by nonzero endpoint displacement. These are physical simulated travel
observations, not CPU/GPU performance measurements or evidence for late100.

Duringday6,8094/9932 walking worker-samples have runRemaining exhausted; during
day10,14253/17533 do (about81.3%). These are unweighted worker-samples before300s,
not unique workers or exact global durations. Running-flag samples are1817 and
3259 respectively. Actual state fields therefore support testing work travel
capacity, rather than assuming walking status is hidden idle or adding income.

Detailed traces integrate only bounded same-day daylight intervals with no raid
on either endpoint and no crossing300s. This includes the299→300 interval omitted
by the old opportunity trace, so actor totals need not equal that narrower trace.
Creation order never becomes a timestamp, mismatched worker completion is
censored, and carrier pickup has its own evidence type distinct from delivery.
Raw hashes and the trace generator hashes are in receipt.json; analysis preserves
these payloads byte-exact. Root independently checked raw hashes and state parity.

## Proposed parameter-only experiments, not implemented or run

First proposal G changes only the real canonical workers.daily_run_distance_long_trips
from3 to4 atop frozenF. It preserves walking1.08m/s/running2.4m/s and existing
animation clocks, urgency threshold2, FIFO/route logic, dawn staffing living/12,
wages30/40, prices/growth/damage/magic and all original policy/domain. Current
budget105.804m becomes141.072m using the native35.268m long-trip unit.
This targets measured exhausted work-running quota without breaking the user's
already-applied +50% movement/animation requirement or inventing a faster walk.

If the extra35.268m substitutes fully for ordinary walking at the two native
speeds, arithmetic ceiling is17.961s saved per worker/day,1347 actor-s for the
75-person day10 crew. This is a bound, not a measured gain or inactivity prediction;
quota may not be used, route geometry may change and faster service can increase
purchases/occupancy. Flight already bypasses work quota; carrying still cannot
run. Gameplay/visual QA must ensure animation/foot movement and fatigue behavior
remain convincing, and physical daily deliveries/bad-management loss still hold.

A distinct second proposal H, only if travel quota lacks a useful signal, would
scale actual task action durations to0.85 while preserving profile ratios:
initial7.2→6.12,water3.4→2.89,harvest3.6→3.06s before demographic speed.
It would require a canonical generated parameter and careful watering/harvest
animation/VFX QA; no existing timing/visual behavior is silently changed here.
The observed17398 acting actor-s gives only a static15%=2609.7 actor-s bound
over10days, not an approved result. Repair timing should stay unchanged initially
to isolate crop service. Neither proposal changes task priority, routing, hiring
policy, camera/domain, money arithmetic or the acceptance gate.

Before either run: source/diff review, native quota/action boundary and save/restore
fixtures, controlled physical-motion/animation checks and a single bounded F10
comparison with the original policy/gates. No100 or promotion until reviewed
pilot evidence and bad-management checks justify it. This document requests no
change to the preserved F10/F100 verdicts.
