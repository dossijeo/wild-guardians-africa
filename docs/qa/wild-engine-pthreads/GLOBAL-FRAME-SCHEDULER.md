# Global Frame Scheduler — work in progress

Reference: `54075e228`, experimental branch only. Candidate opt-in: `?frameScheduler=1`. No performance benefit claimed yet. No scheduler migration is complete.

## Confirmed inventory and costs

- Quality prewarm report: active simulation produced roughly 985 ms presentation stalls, including 832 ms Mangroves ground and 117 ms far terrain synchronous driver work. These atomic calls cannot be preempted. Existing whole-scene retries are not a production solution.
- `loading-frame-slack`: 12-sample lane policy; `loading-yield-budget`: independent CPU budgets; `loading-sync-queue`: owner pump with fixed budget. Consolidation pending, not yet connected.
- Native pthread generates private data in shared memory. Publication stays authoritative. Current stream single busy request includes subsequent graphics preparation, limiting pipeline overlap.
- Terrain already has private incremental geometry/material/prop-slot construction. Final installation includes additional ground-detail work, not yet divided.
- Simulation, navigation, native synchronization and GPU fence/compile completion remain specialized; they must not be delayed as optional visual jobs.

## First implementation checkpoint

Presentation-owned JS scheduler, rolling two-second observations, median/P95/P99 and mandatory CPU P95, immediate spike cooldown and gradual capacity growth. No additional RAF. Actual callback lateness reduces measured headroom; missed refresh periods are never treated as extra time. Deadlines borrow only current measured headroom. GPU time is not inferred from RAF intervals.

Private terrain steps are the first consumer. Quality/current-request validity is checked before each unit; cancellation returns the generator and releases private resources. A chunk is returned only when complete. Query off preserves the previous path. Admission bounded to 128 jobs; replacement by key and abort supported.

## Pending / limitations

This is infrastructure plus one real producer, not acceptance. Need renderer A/B, long-session and streaming throughput validation, queue aging/tail-cost handling, resource-owner scopes, explicit dependencies/versions and coalescing, decoupled bounded native production, initial loading integration, shader transactions and program reuse. Current stats sort a small window at 100 ms intervals; measure overhead before adoption. Unknown atomic units can still overrun their estimate; report them, do not conceal them. Native publication and final installation remain outside this queue.

Run `node --test tests/global-frame-scheduler.test.js tests/prepare-terrain-chunk.test.js` for deterministic lifecycle/admission checks. Full six-biome real game acceptance remains pending.

## First real-renderer pilot — not adopted

Intel UHD / ANGLE D3D11, Mangroves 720p media, actual production streaming defaults, pthreads, active simulation, identical saved initial state frozen until readiness. Files: `scheduler-baseline-active-a1.json` and `scheduler-candidate-active-b1.json`. Only one A/B pair, not statistical acceptance; simulation evolves with wall time. The earlier `scheduler-first-active.json` had no initial freeze and is functional evidence only.

| Metric | Reference | First scheduler |
|---|---:|---:|
| Initial readiness | 28.04 s | 28.65 s |
| Completed travel chunks | 10 | 10 |
| Final install mean | 11.53 ms | 0.60 ms |
| Presentation P95 | 66.51 ms | 66.51 ms |
| Presentation max | 182.8 ms | 216.1 ms |
| Frames including queue drain | 180 | 296 |
| Candidate private preparation CPU / chunk | — | 9.48 ms |
| Candidate private preparation latency / chunk | — | 1005.78 ms |

Both runs settle without unexpected browser errors. Candidate runs 876 units including initial load, 332.53 ms accumulated work and 41.54 ms accumulated coordination (not per-frame overhead). Largest unit 7.86 ms; 12 deadline overruns. Runtime remains one authoritative shared pthread world.

**Regression confirmed in this pilot:** final install is shorter but overall streaming is delayed; presentation tails do not improve. Do not enable this candidate by default. Current 60 Hz admission under a 30-ish Hz GPU/presentation workload is overly restrictive, while the stream serializes generation behind graphics staging. Further work must address both measured capacity and pipeline overlap, without treating missed frames as free CPU time. Shader driver spikes remain independent and unresolved. No benefit claim and no six-biome acceptance yet.
