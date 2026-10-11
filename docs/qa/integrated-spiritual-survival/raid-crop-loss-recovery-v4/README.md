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

## Full-suite validation: failed, integration blocked

GitHub Validate run `38161299163` on productive source `39aaf3b9bdc262c6ea938285a79c2a82e6d9576c` completed with 4,449 tests: 4,376 passed, 72 failed, one skipped. The complete failed-step log is preserved losslessly in `validate-38161299163/failed-tests.log.gz`; `summary.json` lists every failed test. The earlier 118 focused passes do not supersede this negative result.

Failures include agriculture/magic expectations, group reservation expectations, native campaign outcomes, worker return, shield contacts, evidence reproducibility and SFX inventory. These are not yet individually triaged: neither obsolete expectations nor production regressions should be assumed without reproduction and comparison. Do not relax assertions to obtain a green check. Keep the running campaign's source frozen, preserve its eventual native outcome, and resolve integration/test incompatibilities in a separately frozen revision before proposing main integration.

Initial local comparison on Node 20.11.0 selected exactly three tests (30 others explicitly skipped): Growth with pre-existing watering debt, contiguous crop reservation/destruction, and nightly RNG/hit planning. All three fail on both the frozen v3 baseline (`cea4727b`, runtime unchanged) and v4 (`2c699929`, runtime unchanged). Full outputs are `baseline-three-failures.txt` and `candidate-three-failures.txt`. Growth has the same `147.92307692307452 != 148.5` discrepancy and reservation/destruction the same `6 != 3` discrepancy in both arms. Planning fails its hit expectation in both arms, with different values because the cohorts differ. This establishes that these three failures already exist without the v4 quantity adjustment; it does not establish that all 72 failures are pre-existing, that the expectations are correct, or that production behavior is acceptable. No test or runtime source was modified.

Subsequent shield triage identified six stale two-hit expectations in `tests/shield-expiry.test.js`. The earlier assertions already verify the crop survives an expired shield-border animation with no distant hit, native movement resumes on legal segments, shield contacts consume strikes, and save/reload preserves the animation. Only the later expectation that a physically reached crop survives its first hit (and requires two unshielded hits) was updated for the explicitly authorized one-HP rule. All seven tests in that file pass on Node 20.11.0, covering five species and all cultures for border expiry. No assertion about physical range, movement, shield placement, RNG, pause, reload, strike budgets or unique attack IDs was removed. No runtime, balance or virtual-policy source changed. The other full-suite failures remain unresolved; this focused result is not a full-suite pass.

Two further stale two-hit expectations were corrected in the contiguous-crop acceptance and active-crop cache tests. The former now verifies six distinct one-HP plants are physically hit and destroyed, connected pairs remain search groups, individual reservations do not overlap, and complete saved/unsaved raid trajectories remain identical. The cache test verifies one confirmed physical hit retires the crop while preserving its historical object and damage. `node --test tests/acceptance-defensive-reservations.test.js tests/active-crops.test.js` passes all 13 tests, including center approaches in five cultures and legacy lease migration. No runtime or strategy changes. Eight of the original 72 failing tests have now been addressed; no updated full-suite result is claimed.

The nightly RNG oracle still used two hit-pressure steps, whereas the frozen v3 recipe already uses four and v4 preserves that exact recipe. Only the independent test table's coefficient was corrected to four; production hit budgets were not changed. `node --test tests/acceptance-raid-planning.test.js` passes eight tests, including 95 successive nights with exact timing, two RNG draws per actor, independently computed hit rolls, all attraction boundaries and composition enumeration. Nine original failing tests are now addressed; the complete suite still has no updated passing result.

The SFX catalogue was regenerated with its existing auditor. Three source hashes (`game.js`, `raids.js`, `navigation.js`) and source locations changed; all 126 original byte hashes, 100 assignments, 26 unassigned entries, categories, context limitations, reserves, alternatives and semantic metadata remain identical (location line numbers excluded from semantic comparison). `node --test tests/sfx-catalog-audit.test.js` passes all three tests. No playback or new binding is claimed. This addresses two more original suite failures, bringing the focused corrections to eleven, while full-suite and campaign acceptance remain pending.
