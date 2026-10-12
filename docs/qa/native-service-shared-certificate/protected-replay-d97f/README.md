# Expensive protected legal fixture, exact certificate AB/BA

Frozen source `d97fb7e0b7d887ea74952fac1fc8ac9e875ccba6`, 442 source hashes. PID 30180/session 68854 completed naturally with actual exit 0; PID absent afterward. No restart, source mutation, campaign, rendering measurement or production activation. No campaign process existed at initial inventory. The certificate remains OFF by default.

Command:

```
node tools/replay_native_service_certificate.mjs docs/qa/native-balance-parallel-short/native-original/state.json.gz .cache/service-certificate-abba-d97f-01
```

This is the same independent protected fixture as the rejected terrain-query-cache experiment: exact retained day-8 snapshot, one legally paid native hire, one fresh frozen funded-defense policy act with identical command IDs/reserve/options, one ordinary tick. It is not a reconstruction of lost in-memory Q15 policy history, nor a campaign with adjusted strategy. A means default OFF, B explicit ON. Sources are checked before and after every arm; raw reports and full snapshots are saved before parity assertions.

| Arm | Defense/proof time | Tick time | Certificates | Proofs |
|---|---:|---:|---:|---:|
| A1 | 145,269.92 ms | 32.45 ms | 0 | 11 |
| B1 | 139,286.01 ms | 29.44 ms | 71,738 | 11 |
| B2 | 88,029.56 ms | 30.23 ms | 71,738 | 11 |
| A2 | 92,724.02 ms | 44.86 ms | 0 | 11 |

The entire policy/geometry-proof report and action match exactly, as do initial, prepared and final snapshots (including ledger, events, RNG, clock, crops and workers). Each snapshot roundtrips exactly. Final SHA `a80f0d783598c5058e5ffad58bb3b82788734f1e297351b60d436566c5cb9247` also equals the earlier terrain-cache fixture. No action was performed by the expensive policy evaluation; this does not mean no proof work occurred.

Mean defense/proof time: control 118,996.97 ms, candidate 113,657.78 ms, reduction 4.4868%. Pair reductions are 4.1192% and 5.0628%. This is a **small descriptive improvement**, not a sufficient solution to the protected-campaign bottleneck. First/last arm differences are large, with possible JIT/cache/scheduling/concurrent-work effects. Do not compare absolute timings directly with earlier source freezes or claim significance from four arms. The repeated `approachPath` calls were skipped using complete certificates; this does not establish that 71,738 full A* traversals would otherwise have occurred. The native implementation already reuses those certificates internally.

The prior retained 638-second protected CPU profile attributes exclusive sampled time to lattice 166.14 s, coarseSegmentClear 69.85 s, fluidInside 47.34 s, slope 44.77 s and surface 36.11 s; findPathSteps is 17.56 s. That prior sample is not a profile of this replay, but it identifies further concrete costs to investigate. `TerrainField.lattice` already has a 12,000-entry native FIFO height cache. Raising another high-level cache or its capacity blindly is unjustified after the rejected terrain-query memoization (+47.94%). A next bounded diagnostic could count native surface/lattice calls and hits/misses without changing results, then consider exact amortization of repeated pure terrain work only if measured. No new variant or longer campaign is authorized by this report.

Original bytes are retained under `native-original/`, including stdout/stderr, launch provenance, summary, four full decisions and four full states. `node tools/audit_service_certificate_replay.mjs` verifies all 11 payloads, parity, roundtrip, counts and timing arithmetic; third argument can check the frozen 442 sources. Inactivity is explicitly no longer an objective or acceptance gate by user instruction; historical metrics are preserved, not recalibrated. Survival/balance, 100/180 nights, renderer performance and current-main compatibility remain separate open gates.
