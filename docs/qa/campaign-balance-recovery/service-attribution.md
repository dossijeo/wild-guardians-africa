# Native service attribution after the rejected pilot

This is diagnostic source/snapshot analysis of original `2bdac97e`, not a replay, causal benchmark or acceptance of the candidate. The complete terminal archive and 321 verified source hashes remain authoritative.

## What the terminal snapshot establishes

The farm has one intact center and 2,608 living plants, 2,198 awaiting first water. All 3,010 queued tasks are unassigned and unblocked; no workers remain after daily cleanup. Those flags do not describe daytime task reservations, route failures, utilization or actor locations. The earlier heartbeat in status is a different observation and must not be treated as a full snapshot of the final state.

Euclidean distances from the center (not actual native path lengths):

| Living cohort | Count | Median | 90th percentile | Maximum |
| --- | ---: | ---: | ---: | ---: |
| All living plants | 2,608 | 66.74 m | 121.92 m | 147.91 m |
| Awaiting first water | 2,198 | 64.10 m | 117.33 m | 147.91 m |
| First water completed | 410 | 82.34 m | 127.38 m | 147.36 m |

Pending first water is not confined to the furthest edge. No plant's first-water wait exceeds twelve days, and none reaches twenty days. Neither the age nor the coordinates prove permanent inaccessibility.

## Mechanisms visible in the unchanged source

- `choosePlot` requires ordinary placement and native routes both to and from the center service point. Its 1.5 m grid is bounded to the original center's active region. Route approval at planting does not establish that every future watering stand-off route succeeds or that workers have sufficient shift time to reach it.
- Paid staff is `ceil(living / 12)`, limited by affordability. The observed approximately 220 staff follows the occupied plot count; there is no literal 220-worker gameplay cap.
- Task reservation preserves FIFO creation order and selects the nearest eligible reachable employee. Initial watering uses a watering stand-off route, rather than walking to the plant's center. Task rebuilding at dawn/after raids must remain native in any diagnostic.
- Worker actions take 7.2 seconds for initial sowing/watering, 3.4 for subsequent watering and 3.6 for harvest, divided by the worker profile's speed. Those action durations alone do not establish the dominant service cost.
- Calibrated walking is 0.72 m/s with the already applied 1.5 multiplier, yielding 1.08 m/s. Running is 1.6 × 1.5 = 2.4 m/s with a finite daily run budget. Carrying explicitly cannot run. Euclidean delivery legs of 67–122 m imply roughly 62–113 seconds of carrying travel before considering the center's closest-edge point, terrain path length or detours. This is a lower-order estimate, not a measured travel-time distribution.
- `actorBlockers` for workers only selects qualifying animals. Other employees do not obstruct each other during an animal-free working day. A crowd of employees by itself is therefore not a peer-body-collision mechanism in this implementation.
- PR15 adds a fallback only for `returning`, `fleeing` and `incapacitated` people after both the ordinary path and slope recovery fail. It does not directly change initial/watering/harvest/carrying speeds or reservations. It can affect later available people and unresolved returns indirectly; that requires separate evidence on current main.

## Activity labels have limited diagnostic precision

The historical numeric activity metric is preserved. After an unsuccessful action, the policy labels idle as `space` when its candidate cursor has exhausted the grid and otherwise as `budget`. An exhausted cursor plus insufficient funds could consequently be labeled space even when affordability also blocks planting. Conversely a failed plant operation does not emit a comprehensive set of blocker causes. These categories are useful policy diagnostics, not an independent physical attribution system. Late cash after hiring is abundant in this pilot and budget idle is zero, so its late space attribution has supporting economic evidence. No labels or historical totals are changed here.

## Next bounded diagnostic design

The original candidate terminal contains no actor to replay. Retained frozen `3324d17d` Canyon Mapungubwe/Sahelian terminals each contain one real fleeing actor. They can support a bounded direct `walkTo` comparison of the exact actor and destination under old versus PR15 fallback, preserving the original result, time, ledger and geography. Such a comparison only tests return-route reachability; it cannot establish early daytime throughput or campaign acceptance. Desert's retained legal-start day-nine snapshot has 25 employees already home and cannot provide that missing actor case.

Early service attribution needs a source-pinned native capture during the original unchanged policy's working day. Record positions, statuses, task IDs/kinds, path length/replan reasons, run budget and delivered crate handoffs, then integrate time spent walking, carrying, acting, waiting and returning. Do not fabricate actors, clear a saved victory result, inject money or call an edited snapshot a responsible campaign. Run only after the shared loading/GPU reservation releases CPU. Preserve the original source/run as separate evidence from any current-main diagnostic.

Revenue/cost changes cannot by themselves shorten transport routes, add a center that this policy never chooses, or increase staff once the policy's plant ratio is already affordable. Further revenue-only increases may fill the same finite domain sooner. New balance parameters require the service evidence above; weakening the policy, selecting another seed or using destruction merely to manufacture planting actions would not answer this diagnostic.
