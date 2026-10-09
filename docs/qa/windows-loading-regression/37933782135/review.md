# Transfer and readiness attribution

The original packaged smoke passes in 85.19 seconds with no errors. The visibility fixture fails its separate unchanged 90-second loading gate before minimization, while visible and focused. The first success is not a correction: this commit changed only diagnostics.

Bridges load takes 6516.3 ms; parse after main response collection takes 45.2 ms. This excludes primary GLB transfer from parse and demonstrates substantial pre-parse delay in this sample. The preceding failure had a 19.3 s bridges phase, so transfer variability remains material. The second fixture also has worker models/actor preparation absent from the first.

The first smoke has 94 compile submissions (60.4 ms synchronous wall total), with 30.75 seconds of awaited readiness across the phases. World compile takes 20.64 seconds and staging 6.14 seconds. These scopes overlap and are not summed into CPU/GPU work. Each bounded object group currently waits for readiness before sending the next group.

The candidate retains bounded submissions, accumulated CPU16 budget, target-scene lighting and synchronous screen restoration. It snapshots readiness programs for every submitted group and retains the final barrier over all groups, cancellation, deadlines and cleanup. Only smoke explicitly enables it; ordinary production keeps the sequential recipe until both original native gates pass. No resources, variants or readiness checks are removed.
