# Physical route rejection without per-tick replanning

The saved Sabana/712 day-13 buffalo exposed a route-selection defect and a polling pattern. A native grid route started with a bend rejected by the continuous movement check, even though the straight swept segment from the buffalo to its confirmed exit was clear. Before the direct-exit correction, each ordinary movement tick requested the same rejected route again. The archived state and paired campaign evidence are in [service-sites-sabana712](service-sites-sabana712/README.md).

The direct-exit correction lets an exhausted retreating animal take a continuous exit only after the existing native `walkable` and `segmentClear` checks pass. Every movement step still passes the normal continuous collision controller. The saved-state test completes the raid at the exact exit, with the original speed, no additional hit, and **one** route refresh across the entire movement.

A separate synthetic static-rejection test covers the general failure mode. It forces the planner to return an unusable route, then checks that the actor retries once and stops issuing the same full route request on each tick. A relevant navigation revision wakes the actor immediately. Repeated rejection enters the pre-existing bounded exit-connector recovery; an impossible retreat ends with the existing audited `AnimalRetreatExitAbandoned` event. In that test there are four full route requests total, including those on both sides of the topology revision. Incremental recovery steps are reported as `routeRecoveryStep`, not incorrectly counted as fresh route requests.

No movement speed, collision radius, terrain rule, hit budget, damage, raid composition or economic rule changed. A static route rejected outside this controlled case may still require a real-world fixture; the low-frequency wait and bounded recovery prevent one bad route from causing unbounded per-tick planning. The focused native/retreat suite passed 27/27, `test:playable` passed 196/196, and the web build passed locally. This is a targeted correctness and request-count regression, not a sustained campaign speed benchmark.

## Native rejection of a physically invalid edge

The later Sabana/123 defended run exposed the remaining case: on night 45 a
buffalo repeatedly received the same route through a diagonal wall. Its grid
endpoints were legal, and sampling every 0.2 m missed the wall crossing near
the final waypoint. Continuous movement correctly refused the fractional
landing, but the next plan rediscovered the same edge.

Wild Engine now checks each candidate wall segment against the continuous
oriented barrier rectangles while building grid edges and local connectors.
If the movement controller still rejects a static segment, it reports the
directed grid edge to `lazy_reject_route_edge`. Native route search excludes
that edge for the unit's movement profile and finds another route. This is a
route-search overlay, not a confirmed world edit: it leaves topology and
physical rules unchanged. Affected sector rebuilds or portal changes discard
the relevant rejection; unrelated sector changes do not. The native route
revision prevents a cached answer from returning the rejected route.

The explicit rejection applies to short cardinal grid connectors. Longer or
ambiguous fractional connectors continue to use the existing bounded retry
and recovery, without declaring unknown terrain blocked. Focused tests cover
both buffalo and worker alternatives and a wall crossing missed by sampling.
