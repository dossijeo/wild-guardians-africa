# Bounded early native service diagnostic

One bounded five-day native diagnostic is now retained. No GPU benchmark or 100-night acceptance run was performed here.

This worktree starts from current main `02009bfc07463b95c3a59e481103a483db29d77c`, including PR15. It intentionally does not contain the rejected +25% harvest candidate. That candidate's original frozen `2bdac97e` pilot and 36.0967% failed activity gate remain preserved on `codex/campaign-balance-recovery`.

After explicit CPU release, run once from a clean committed worktree:

```powershell
node tools/diagnose_early_farm_service.mjs docs/qa/campaign-service-diagnostic/native-five-days 5 *> docs/qa/campaign-service-diagnostic/native-five-days.log
$diagnosticExit = $LASTEXITCODE
exit $diagnosticExit
```

The tool refuses more than five days or a tracked dirty source. It uses the existing `simulateIntensiveFarm`, original Canyon/Mapungubwe, seed 712 and every original responsible policy option: older female, mixed crops, dawn-only hiring, 12 living plants per desired worker, no defense walls, native labor/maintenance reserve, no burst planting and the existing camera-entry/finite-domain behavior. It changes none of those systems and adds no artificial money or actors.

The `onTick` callback only reads state/navigation and writes diagnostic files. It captures full compatible snapshots near time 100 and 200 of each day, with actual times and decompressed SHA-256, plus a compressed one-second daylight trace of workers, profiles, positions, statuses, task kinds, remaining paths, action/run budgets, queue reservations, motion statistics and actual crate delivery events. No additional route queries influence caches or routing. The complete final snapshot, native physical/accounting audit, source provenance and financial summary remain authoritative.

Reported status seconds are one-second left-endpoint estimates, rather than exact integration of internal simulation substeps. Measured position changes are endpoint chords and therefore lower bounds on distance traveled. Raid/night samples are excluded from the service-time estimate. This diagnostic measures behavior, not GPU performance, and its instrumentation adds CPU/I/O overhead; do not compare its wall time with uninstrumented benchmarks.

Failures retain partial traces, original snapshots and error information. Do not edit a result or balance, retry with another seed, or label five completed days as approval of the 100-night activity/survival gate. The purpose is to attribute early walking/carrying/action/waiting service before choosing further justified runtime parameters. Any later candidate needs current-main regression, unchanged responsible 100-night/matrix coverage and ordinary poor-management loss checks.

## Terminal evidence

The first launch failed at module resolution (`three` absent from the new worktree), before simulation started. Syntax check had passed. Its exact log and receipt are retained in `native-five-days.log` and `environment-failure-receipt.json`. No result/timeout was manufactured. Following explicit authorization, a junction to the existing repository's dependency directory was added; installed Three.js 0.180.0 matches the lock and reports revision 180. No dependencies were installed or modified.

A separate environment-ready attempt used detached exact source `38cf337390e68492ea286ec5ab4555ade8ab69b3`. It finished naturally with exit 0 in 7.19 seconds, five completed native nights, no victory/defeat result, 1,499 daylight observations and ten complete snapshots. Financial/hydration/maturity/paid physical delivery checks passed. Originals are in `native-five-days-dependencies-ready/`; the terminal receipt includes every file's SHA-256 and resolved dependency path. The duration includes diagnostic overhead and is not a performance comparison. No further simulation run followed.

## Retained-data analysis

`tools/analyse_early_farm_service.py` reads the recorded files without simulation or state edits. It verifies the trace SHA, all ten intra-day snapshots, final snapshot, native crate/ledger deliveries and consistency with the original sampling totals. Output is `native-five-days-analysis.json`.

Across five days, **1,494 global daylight seconds** were covered by valid consecutive observations. Summing those intervals over all observed employees produces **10,430 actor-seconds**, which must not be mistaken for elapsed game time. Approximately 58.04% of actor-seconds are walking toward initial/water/harvest tasks, 35.05% acting, 6.81% carrying and 0.10% arriving. No idle or same-task stationary walking is observed at this cadence. One-second samples cannot exclude shorter pauses or identify exact substep transition times.

| Day | Global sampled seconds | Actor-seconds | Paid staff | Whole-day physical deliveries | Trace daylight deliveries | Coins after day | Pending first water at last daylight sample |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 298 | 1,788 | 6 | 26 | 24 | 351 | 21 |
| 2 | 299 | 1,788 | 6 | 40 | 39 | 346 | 27 |
| 3 | 299 | 2,086 | 7 | 51 | 51 | 352 | 53 |
| 4 | 299 | 2,384 | 8 | 44 | 43 | 396 | 31 |
| 5 | 299 | 2,384 | 8 | 52 | 50 | 470 | 17 |

All 207 sampled daytime delivery IDs are unique and reference genuinely delivered crates with a corresponding native ledger credit. There are 213 native whole-day deliveries; night/raid exclusions explain why the daytime trace is not the whole-day event list. Only the latest 200 events are retained by native `emit`. An initial analysis incorrectly assumed the final save contained every event body and failed with `KeyError: event-272`; that was an analyzer assumption, not a simulation failure. The corrected read-only audit additionally matches 169 delivery IDs/type/worker/crate against retained event bodies across the complete snapshots. The other 38 event bodies are no longer independently available; their observed IDs and crate/ledger records are preserved, without reconstructing missing history or claiming full event-body verification.

Observed same-walking-task route-version changes are 0/0/20/25/58 across the five days. They are not proven reroute failures: ordinary planting changes navigation version. Null path observations likewise are not a stalled movement diagnosis, and no blocker cause is invented. Endpoint displacement is a path-distance lower bound.

The player policy's early five-day inactivity is 78% (1,071 budget + 99 shift-end seconds, no space idle), while observed employees are occupied. This supports early capital/action availability constraints alongside real service work. It does not isolate a single causal parameter. These current-main baseline days are distinct from the rejected original +25% candidate's 100-night source; they cannot establish the cause of its late saturation or justify changing policy/seed/domain to pass acceptance. No PR or release acceptance follows this diagnostic.
