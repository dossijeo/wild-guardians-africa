# Fixed final camera: ordinary versus cinematic World render

Native fixture155, source `da324e84` including main's corrected sky-before-depth order. URL `interactive-loading-run.html?save=dense&time=360&measurement&fixed-pose`,1280×720, original dense archive. Initialization completes before this comparison. No concurrent agent renderer or heavy CPU task.

This **does not replay the moving cinematic**. Both recipes submit the native `World.render(0)` at the exact final intended gameplay camera. A uses ordinary camera/hands updates; B uses the cinematic flag. The same existing fixture RAF performs settling, warmup and measurement. No second renderer/loop, simulation advancement, camera override, quality reduction or disabled streaming.

The readonly pending witness includes native merged preparation, regional worker plus candidate/seam/GPU fence, and standby queued/in-flight work. Twelve consecutive quiescent frames precede four ABBA blocks, each30 unqueried warmup frames plus120 queried renders. If pending work reappears, pose changes or clock changes, every frame is retained and work comparability fails. There are **zero contamination/pose/clock mismatches** here; day101/time360/elapsed60218.69999939698 remain constant.

| Arm | Resolved GPU samples | GPU median ms | GPU p95 ms | GPU maximum ms | Measured RAF p95 / max ms |
| --- | ---: | ---: | ---: | ---: | --- |
| A1 ordinary |120 |44.804 |45.668 |46.166 |50.0 /66.5 |
| B1 cinematic flag |120 |44.508 |45.383 |47.522 |50.1 /66.7 |
| B2 cinematic flag |120 |44.567 |45.643 |45.795 |50.0 /50.0 |
| A2 ordinary |116 |44.746 |45.652 |46.174 |50.1 /66.6 |

All480 render labels record169 calls/3,337,550 triangles in the final subpass under Three autoReset. Four final GPU queries remain unresolved at close and are disposed/countable, not zero. No disjoint/drop/foreign/nested/allocation errors. The query covers synchronous submitted subdraws; it excludes async preparation outside the render envelope. Its polling/checks can affect CPU/RAF, so these intervals are diagnostic rather than uninstrumented FPS.

These observations show similar steady GPU work in the two render recipes at this pose and no extra expensive draw introduced solely by `world.cinematic`. No measured interval exceeds100ms in any block. CPU p95 is24.7/24.7/24.2/24.2ms, maxima27.5/28.3/30.0/26.3ms. A dense farm's steady render is already expensive on this device. **This does not explain away the116.4ms moving-transition intervals**, whose pose and potentially asynchronous preparation differ; those remain preserved in the real-application ABBA reports.

The entire fixture initialization is also retained:21.137s total,16.831s initialization,1035 initial RAF samples,max399.1ms/four over100. The fixture synchronously decodes the archived save before rendering, unlike the actual application's owned snapshot worker; this negative record is not presented as actual-app loading performance or excluded from its raw fixture report. Post-loading comparison lasts29.854s/612 frames (12 settling +600 warmup/measurement).

Result export and explicit Dispose confirm errors[],disposedtrue/contextLosttrue. Query owner closed, fixture RAF cancelled, borrowed flags restored. Tab closed,viewport reset,browser inventory empty. Raw report and independently recalculated summary are adjacent.

**Loading release gates remain open:** moving transition pacing, final mockup UI/visual matrix, peak resources and repeated lifecycle/current compatibility coverage. No PR or quality change.
