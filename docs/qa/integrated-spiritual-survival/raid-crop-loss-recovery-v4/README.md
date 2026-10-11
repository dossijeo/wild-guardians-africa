# Candidate 4: responsive military quantity after crop losses

Experimental branch `codex/raid-crop-loss-recovery`; no main integration or final balance approval.

Original seed 712 evidence is archived in commit `cea4727b` on `codex/perimeter-suppression-proof`. The good policy lost natively after 36 nights. Night 36 planned with V=295, EMA=675.7898549476145, P=0.24624502862469372 and 19 animals. Actual spawn exposed 23 living crops, all destroyed physically. The EMA deliberately takes max(current, EMA); temporal pressure remains even after losses. The square-root count recipe amplifies low pressure. Hence pressure fell, but the physical quantity fell much less than the farm.

Change only military quantity, before composition/RNG selection:

`N4 = max(1, round(N3 * V / (V + 1000)))`, for nights after the five introductions.

V is current living crops' original base harvest value at native night-plan creation. It excludes cash, maturity, magic bonuses and future income. Scale 1000 reuses the pressure formula's agricultural normalization and is a calibration candidate, not proven optimal. Quantity reaches about half the old envelope at V=1000, 80% at 4000 and 96% at 25000. Smaller farms get materially smaller hordes; at least one animal remains guaranteed. Strong farms still face the old progression approximately. First five introductory nights and permanent peaceful postgame remain intact.

Keep EMA, pressure, individual hit budgets, damage, radii, unlocks, wave concurrency and physical attacks unchanged. Q is recomputed for the smaller composition before RNG selection, never used to remove plants or suppress confirmed attacks. No economy, agriculture, wall HP/cost, repair, magic or virtual-policy changes. Query cost is constant per night-plan calculation with no new per-frame work.

Existing version 1/2/3 plans preserve their original cohort/RNG/EMA and snapshot validation. Only future newly created plans adopt version 4. Retrying readiness or loading cannot reroll or reset an already committed plan. This also means a current running campaign remains historical baseline rather than silently adopting the new candidate.

`seed-712-plan-count-replay.json` recomputes quantity at recorded original states: night 34 20â†’7, night 35 19â†’6, night 36 19â†’4. These are counterfactual plan counts, not predicted damage or a simulated victory. Actual future states and RNG diverge once the candidate runs.

118 focused tests passed: current-value count response, bounded/monotonic quantities, full original hit ranges, exact Q, deterministic RNG, old saves, reload, one-hit crops, real physical damage/AoE, independent reservations, intro, peaceful postgame and multi-wave lifecycle. The lifecycle fixture now uses a larger, natively purchased farm from explicit unit-test funding so it genuinely exercises multiple waves under the smaller quantity recipe; this is not campaign income or production starting money. Initial two failures from the old small multi-wave fixture and a stale next-version count expectation were corrected; no production rule was loosened to pass them.

Native comparison launcher `tools/run-raid-recovery-calibration.mjs` uses the exact frozen profiles and requested 100-night horizon. It verifies every original runtime hash and allows differences only in the three reviewed military configuration/planning files. No economic early-stop. A defeat or survival result is still pending; do not infer victory from unit tests.

Reproduce after committing the tracked source:

```
node tools/run-raid-recovery-calibration.mjs --run good 712 sabana mapungubwe docs/qa/integrated-spiritual-survival/military-recovery-v4-good-sabana-712
```

Then compare matched seed 123 and frozen normal/bad controls before statistical or main acceptance. Monitor losses and recovery; if quantity response overprotects small farms or leaves no defense advantage, calibrate authorized military parameters rather than improving policies or changing economy.

## Final integration gap observed during the live comparison

Read-only diff against main `690168465a35e2803b7185c8cccb4b440a2b0b54` confirms the frozen baseline and candidate do not yet contain PR 23's collinear wall-seam recovery (up to four initially overlapping modules) and invalid-origin guard for wider worker-return searches. See `production-worker-recovery-gap.diff`. This does not prove that any current campaign encountered that defect. Both arms share the same old navigation, so their quantity comparison remains explicitly historical.

Do not patch a running campaign or silently attribute an eventual failure to military pressure if a worker-navigation defect is demonstrated. Before main integration, incorporate the production fixes into a separately frozen integration and repeat relevant functional/native comparisons. Passing this historical campaign cannot establish final worker-gate regression acceptance on current main. Preserve all original sources and results.
