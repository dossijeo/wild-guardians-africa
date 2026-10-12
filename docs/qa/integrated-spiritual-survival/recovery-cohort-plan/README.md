# Frozen recovery cohort preflight

This is configuration preparation, not new campaign execution. The existing `reviewedRecoveryOptions` and `reviewedRecoveryProvenance` helpers generated and validated 48 cases against the unchanged source review and `military-only-policy-freeze-v1`:

- Matched cohort: good / normal / bad, seeds 712 / 123 / 2026, Sabana/Mapungubwe and Gran Cañón/Saheliana: 18 cases.
- Held-out cohort: the same three policies, seeds 811 / 1947 / 4099 / 6037 / 9011, Gran Río/Mapungubwe and Volcanes/Saheliana: 30 cases.

The active good/123/Sabana case is referenced once and marked `existing-run-do-not-relaunch`. No new case was launched. Output paths are unique. Every plan contains exactly the frozen options, the reviewed candidate-4 source hashes and comparison provenance; all 48 share the same 464-file inventory. Originals are preserved losslessly in `plans.json.gz`, with hash/size in `receipt.json`.

Good starts defense at day 6; normal retains the already-frozen delay to day 10 and omits the maintenance reserve; bad retains the native bad strategy. No policy, price, productivity, wall resistance, magic power, crop HP or military parameter was changed during this preparation. Economic early stops remain disabled. Technical faults and timeouts must be classified separately from authentic defeat.

Plans are not results and contribute zero completed cases to any win-rate denominator. Keep matched and held-out cohorts separate, and never pool candidate-3 reference outcomes with candidate-4 recovery outcomes. Six matched cases per profile and ten held-out cases per profile provide limited statistical precision; eventual rates need uncertainty intervals, not claims that a percentage proves the population target.

The current runtime is the frozen experimental family, not a future main build containing PR25/PR26. Before launching more campaigns after a technical integration, regenerate provenance and review the changed runtime equally across comparison arms. Preserve the current plan and live campaign rather than silently rebasing their sources. Do not start all 48 concurrently or treat this preflight as permission to ignore performance gates. The next launch remains conditional on native results and reviewed runtime/performance readiness.
