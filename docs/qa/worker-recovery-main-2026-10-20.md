# Current-main worker recovery baseline — 20 October 2026

The mobile-body phase in `walkTo()` is still present after PR #178. Before changing movement, this probe reproduced the known failure on `main` `a6da9dc26` with the production Wild Engine WASM SHA-256 `0d2901425c9d16fa38cdafc916680d3086c1b18f6730a0bfc584f6b1315d817d`. It ran Sabana/Mapungubwe/712 for nine nights using the `good` virtual player, native intentions and native wall plans. No balance or game code changed.

Two runs produced the same final serialized-state SHA-256 `60576f84a72a357ea078af79a9e7695428f41829215639fb552453168e48f5ef`, 780 deliveries, 1,047 coins, 123 living crops and 24 mobile-collision recovery events. During work (`time > 30`), nine distinct worker pairs overlapped across 12 sampled pair-ticks. Eleven of those 12 pair-ticks involved a phased worker. The deepest work-period penetration was 0.331 m between workers #7072 and #7088 on day 9 around time 115; both were walking toward different tasks. The overall 0.56 m maximum includes workers initially emitted at the village entrance and must not be confused with work-period traffic. [The retained report](worker-recovery-main-2026-10-20.json) contains positions, destinations, route heads and per-day counts.

Reproduce from a clean checkout with:

```powershell
$env:WG_WORKER_PROBE_OUTPUT='docs/qa/worker-recovery-main-2026-10-20.json'
node tools/experiments/probe-worker-overlaps.mjs 9 712 good sabana mapungubwe wild-engine
```

Setting `WG_WORKER_PROBE_OUTPUT` writes detailed JSON and prints a short summary. Without it, the existing stdout JSON contract remains unchanged. The probe now records distinct work pairs, maximum work-period penetration and a final-state hash so a future traffic-management proposal can be compared against both physical separation and campaign behavior. `gameTickMs` is wall time on a shared host, not a performance acceptance threshold.

The [prior four recovery variants](worker-recovery-event-gate.md) reduced some overlaps but lost production or money. This baseline confirms the issue survives on current `main`; it does not make those variants suitable for integration. A candidate must prevent the day-9 crossing while preserving legal task completion, route/terrain clearance, determinism and comparable production over a sustained campaign. Initial entrance crowding needs a separate fix.
