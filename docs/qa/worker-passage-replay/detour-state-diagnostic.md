# Detour state at mobile-collision recovery

This observer-only experiment starts from `main` at `c9eee6071`. The `nav.motionObserver` payload now includes whether the actor has an incremental terrain detour pending or an exact local detour previously marked blocked. It does not enter game events, saves or movement decisions.

The continuous Sabana/Mapungubwe/712 native-intent campaign completed 14 nights with the established whole-state SHA-256 `2224d0ea4889a693d5b396704b444b3dc383a44e02dd2db507d096c08741ec05`, 1,317 deliveries, 899 coins, 145 living crops and 43 late overlap pair-ticks. The trace has 164 mobile recoveries: 141 workers and 23 animals.

| Actor | Recoveries | Incremental detour pending | Local detour marked blocked |
| --- | ---: | ---: | ---: |
| Workers | 141 | 0 | 139 |
| Animals | 23 | 0 | 16 |

`prepareActorMotion()` records a blocked exact detour when its disc graph fails and `nav.findPathSteps` is absent. The Wild Engine navigation facade has `workerPath`, but does not expose that incremental legacy search. Thus a proposal to delay phasing only while a terrain search is pending cannot affect this native campaign. The blocked marker describes the current body positions, not a permanent physical impossibility: the saved day-9 crossing resolves without phasing when its two workers continue moving. It also does not prove that a native bypass exists for every recovery.

Reproduce with:

```powershell
$env:WG_WORKER_RECOVERY_DETAIL='1'
$env:WG_WORKER_PROBE_OUTPUT='test-results/worker-detour-pending-14.json'
node tools/experiments/probe-worker-overlaps.mjs 14 712 good sabana mapungubwe wild-engine
node -e "const r=require('./test-results/worker-detour-pending-14.json'); for(const kind of ['worker','animal']) { const a=r.motionSamples.filter(x=>x.kind==='mobileCollisionRecovery'&&x.actorId.startsWith(kind+'-')); console.log(kind,a.length,a.filter(x=>x.detour?.pending).length,a.filter(x=>x.detour?.blocked).length); }"
```

The next useful prototype is a bounded physical bypass search around the live blockers using the authoritative native worker route and full swept body clearance, only at the recovery boundary. It must preserve the original target/task, validate rejoin segments and third-party bodies, and pass the 14-night throughput comparison. Simply extending a timer has already failed.
