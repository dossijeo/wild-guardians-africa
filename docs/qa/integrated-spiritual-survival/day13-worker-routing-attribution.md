# Day 13 native worker-routing attribution (experimental balance branch)

The frozen good/Q15/cashflow/shore native pilot, seed 123 in Sabana/Mapungubwe,
completed 14 nights. Its day-13 daylight ticks still breached the performance
gate for a 100-night campaign. The run was repeated cooperatively to day 13,
time 140, using the same parameters and no changed virtual-player policy.
The checkpoint, run receipt and ten phase-traced substeps are in
`pilot-v129-day13-worker-checkpoint/`.

At time 139, those ten native substeps spent 1,243 ms in `worker-update` and
less than 1 ms in `raid-update`. The three largest worker substeps were 555,
472 and 161 ms. Thus this daylight hitch is worker routing, not the raid
target preparation optimized earlier.

`tools/profile-native-worker-checkpoint.mjs` replays the exact saved state for
five simulated seconds without any virtual-player decisions. This is a cold
navigation replay, so its absolute times are diagnostic rather than comparable
to a continuously running campaign. Its query log in
`day13-v129-worker-replay-t140.json` contains 8,673 `nav.path` calls, of which
8,626 returned no route. Two idle workers made 3,401 calls each; a third made
1,476. The replay had 25 workers, 116 queued tasks and 1,067 historical crop
records (151 alive) at the checkpoint. Its worker phase consumed 1,991 ms over
50 ticks; the raid phase consumed less than 1 ms. The main peaks coincide with
repeated task-reachability scans and route-cache invalidations.

Follow-up per-query attribution refined this diagnosis: the two idle workers
account for the *number* of calls, but their cached failures are usually cheap.
Several already-walking workers dominate the expensive queries immediately
after navigation invalidation. The route-preservation experiment below targets
those active paths. Do not interpret the 8,673-call count alone as a timing
profile.

The two invalidations at times 141.2 and 142.5 came from physical repairs of
walls whose previous status was **ruined**. Rebuilding those pieces changes
collision geometry. An experimental shortcut that kept the route epoch across
all wall repairs gave no improvement (8,673 queries again) and would risk stale
routes. It was reverted; production files and balance parameters are unchanged.
Unchanged-geometry repair tests passed during the experiment, but they do not
justify applying the shortcut to the ruined walls in this checkpoint.

The next experiment, documented in `day13-wall-route-preservation.md`, keeps
active worker paths only when they cannot touch the rebuilt wall. The 100-night
campaign remains gated by the remaining long frames.
