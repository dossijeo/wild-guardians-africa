# Bounded early native service diagnostic

Preparation only: no replay, benchmark, GPU or acceptance run has been executed.

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
