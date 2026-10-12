# Current recovery campaign: worker route CPU diagnostic

The verified native recovery process PID 51388 was sampled for ten seconds
while the frozen good/123/Sabana/Mapungubwe campaign progressed through day 19.
The process command, inspector title/URL and owning TCP process were checked
before attachment. The listener belongs to that PID on loopback only.

Only Profiler enable, 2,000-microsecond sampling interval, start, stop and
disable commands were sent. No breakpoint, Runtime evaluation, restart,
application expression or game-state edit occurred. The profiling client
disconnected afterward. The activated localhost inspector listener remains;
no application evaluation was sent to close it.

The capture contains 4,221 samples and 10,912.061 ms of summed deltas.
Inclusive CPU fractions in this sample:

| Stack frame | Inclusive sampled fraction |
| --- | ---: |
| updateWorkers | 94.33% |
| reserveAvailableTasks | 93.96% |
| wateringRoute | 92.28% |
| findBuildingRoute | 75.65% |

These are nested frames: their percentages must not be added. They describe
this sample, not whole-campaign proportions. Sampling has overhead and does
not measure uninstrumented throughput, render frames or GPU time.

Unlike the retained historical day-23 profile, which mainly captured virtual
defense quote certification, this sample is dominated by the native worker
task-assignment/watering approach path. It changes the next investigation:
audit repeated geometric route probes and their cache admission/invalidation.
The building-candidate cache is bounded at 128 queries, but this capture alone
does not establish cache thrashing or prove that a larger/route-result cache
is safe. Preserve exact native choices, terrain/body constraints and dynamic
invalidations when testing any candidate. Do not improve the frozen player
policy or change economic/military coefficients to compensate for CPU cost.

All 464 recorded dependency hashes match both before and after capture.
The campaign remains active: subsequent observation is day 19, time 300,
260 living crops, 23 workers, no result. No completion, defeat or military
acceptance is inferred. Original receipts and journals remain untouched.
Raw profile (lossless gzip), executed capture/aggregation scripts and source
audits are retained beside this report.
