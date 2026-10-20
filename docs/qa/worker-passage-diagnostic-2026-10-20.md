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

The [extended 14-night replay](worker-passage-exact-14.json) has the same serialized-state SHA-256 as the uninstrumented baseline, `2224d0ea4889a693d5b396704b444b3dc383a44e02dd2db507d096c08741ec05`: 1,317 deliveries, 899 coins, 145 living crops, 164 total recovery events and 43 work-period overlapping pair-ticks. The synchronous observer captured 141 worker recoveries; the other 23 events belong to animals. Of those workers, 104 were returning, 32 walking and 5 carrying. Return recoveries were not confined to the village doorway: 92 occurred more than 20 m from its entry, with a median distance of 36.4 m. Days 13 and 14 alone contributed 87 worker recoveries. This shifts the priority from a doorway-only fix to safe movement through the shared homeward traffic.

An isolated nine-night experiment updated returners nearest to their village first, without reordering the persistent worker array or non-returning updates. It produced the same 780 deliveries, 1,047 coins and 123 crops but **worsened** recovery events from 24 to 35, work overlap pair-ticks from 12 to 15 and deepest work penetration from 0.331 m to 0.559 m. The ordering change was discarded before this report was committed; update order by itself is not a safe traffic policy.

Reproduce from a clean checkout with:

```powershell
$env:WG_WORKER_RECOVERY_DETAIL='1'
$env:WG_WORKER_PROBE_OUTPUT='test-results/worker-passage-exact-9.json'
node tools/experiments/probe-worker-overlaps.mjs 9 712 good sabana mapungubwe wild-engine
# Replace 9 with 14 to reproduce the extended report.
```

The extra observer is opt-in and belongs to the QA tool. The production movement and balance code are unchanged.
