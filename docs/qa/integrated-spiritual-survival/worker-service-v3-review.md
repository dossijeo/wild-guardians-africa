# Return-aware worker certificate candidate

Experimental QA only; no main integration and no 100-night campaign restart.
The original v2 function and default perimeter behavior remain unchanged. The
perimeter checker accepts an explicit `workerServiceProof` callback for controlled
comparisons; only the new probe supplies v3.

V3 checks returning/fleeing/incapacitated people against their actual village
entry. Every such person needs an ordinary native worker path, the narrowly
validated wall-overlap recovery, or the existing slope recovery. Missing homes
and unproved routes reject the certificate. Active workers and every living crop
still undergo all v2 centre/watering/delivery checks. An absent active workforce
still rejects. There is no state mutation or worker silently discarded from QA.
This static proof does not drain the resumable return search or certify animated
gates, dynamic bodies or completed paid defenses.

## Frozen snapshot evidence

`v111-worker-service-v3.json`: v2 rejects worker-6087 after 73.4 ms; v3 checks its
wall-overlap home route and all active worker/crop routes successfully in 399.2 ms.
The times are sequential cold observations with different coverage, not a speed
comparison. Full serialized state is unchanged.

`v111-integrated-worker-v3.json`: default v2 cold perimeter proof takes 11087.1 ms
and rejects the same worker. Explicit v3 on the retained animal certificate takes
297.1 ms, then 38.8 ms on repetition. Animal checks are exactly identical to the
original cold certificate, and both v3 worker certificates are exactly identical.
State remains byte-for-byte serialized equal. The animal certificate is retained
with its declared coverage; workers and crops are checked again every call.
These are sequential observations, not AB/BA or rendering benchmarks.

Native movement of the returning worker, including a mid-prefix save/reload,
was separately demonstrated by the preceding wall-recovery probe. V3 itself is
predictive static access, not evidence that all work has actually been delivered.

## Tests and remaining work

11 tests pass across return-aware service and integrated perimeter QA. Tests
retain active/crop v2 results and reject missing homes, blocked return routes,
absent active workers and orphan crops. The wall-recovery tests independently
verify physical motion, blockers and reload.

Cold certificates still cost about eleven seconds on this snapshot. New plants,
navigation invalidation, impossible repeated recovery and short native policy
throughput remain to be evaluated before resuming long campaigns. These results
do not establish human inactivity, economic balance or campaign survival.

```powershell
node --test tests/native-worker-service-v3.test.js tests/native-integrated-perimeter-proof.test.js
node tools/probe-worker-service-v3.mjs STOPPED_V111_DIRECTORY FRESH_OUTPUT_JSON
node tools/probe-integrated-worker-v3.mjs STOPPED_V111_DIRECTORY FRESH_OUTPUT_JSON
```
