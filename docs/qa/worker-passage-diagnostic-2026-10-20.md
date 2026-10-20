# Mobile-worker passage at the recovery boundary

The nine-night Sabana/Mapungubwe/712 Wild Engine baseline has 24 `ActorMobileCollisionRecovery` events, 12 work-period overlapping pair-ticks and a 0.331 m maximum work penetration. [The prior probe](worker-recovery-main-2026-10-20.md) counted those effects after each campaign step, which could not identify the exact body that triggered a recovery.

The optional `WG_WORKER_RECOVERY_DETAIL=1` mode now attaches to `observeGameEvents` and records each worker recovery synchronously at `emit()`. It identifies the bodies that block the same half-metre segment used by `walkTo()` at the point where phasing begins. This observer reads positions and paths only; it makes no extra navigation queries. Replaying nine nights with the observer produced the identical final serialized-state SHA-256 `60576f84a72a357ea078af79a9e7695428f41829215639fb552453168e48f5ef`, 780 deliveries, 1,047 coins and 123 living crops. [The raw report](worker-passage-exact-9.json) retains all 24 event-time samples.

| Observation at the recovery event | Count |
| --- | ---: |
| Walking / returning / carrying worker | 14 / 8 / 2 |
| One / two / three bodies blocking the next half-metre | 20 / 3 / 1 |
| Departure crowd with bodies already overlapping near time 3.1 on day 9 | 3 |
| Stationary acting worker blocking the probe | 1 |

Comparing each actor's current route head with each blocking body's route head gives 12 roughly same-direction, 9 opposing and 7 crossing relationships; one blocker has no route head. These 29 relationships are **not** 29 events, and the heading categories are diagnostic approximations, not proof of a safe bypass. The same-direction group includes the three simultaneous village departures. Most later events involve a moving blocker, sometimes during the common return to the village.

This narrows the next implementation problem. A single distance-based retry rule cannot handle all cases: same-direction traffic needs orderly following and a nonoverlapping village release; opposing or crossing traffic needs deterministic yielding to verified free space or a queued passage; an acting worker at an interaction point needs the existing reservation/task semantics. Any proposal must keep the static swept-segment test, preserve the current task and return destinations, and prove that no worker moves through another body. The [14-night counterexample](worker-route-progress-detour.md) shows why a lower recovery-event count alone is insufficient: it lost 60 deliveries and 126 coins while still overlapping.

Reproduce from a clean checkout with:

```powershell
$env:WG_WORKER_RECOVERY_DETAIL='1'
$env:WG_WORKER_PROBE_OUTPUT='test-results/worker-passage-exact-9.json'
node tools/experiments/probe-worker-overlaps.mjs 9 712 good sabana mapungubwe wild-engine
```

The extra observer is opt-in and belongs to the QA tool. The production movement and balance code are unchanged.
