# Committed attack target invalidation

Isolated branch `codex/raid-committed-target-fix`, based on `7c6f4a77`. No running campaign was patched. No main integration or balance approval is implied.

The original `animal-actions` invalidated-target test fails on both the frozen v3 baseline and the v4 recovery candidate: `targetId` becomes null halfway through an already committed attack. The reservation reconciler calls the general release function as soon as the target is ruined, which also clears the identity and approach data needed to finish the clip. This is a functional defect, not an obsolete one-hit or shared-magic expectation.

The correction removes ownership of an invalid target immediately while preserving the committed attack's identity and approach until its native animation finishes. The existing resolver then consumes one strike and emits one `AnimalLogicalMiss` against the original target. It never retargets a replacement or applies phantom damage. Normal non-attacking invalid-target release is unchanged; RNG, damage, hit allocation, military quantity and player policies are unchanged.

The original test is retained and strengthened with immediate reservation release, exact miss identifiers, save/load equality, physical retreat and no repeated miss. A separate test removes the target object entirely and verifies the same identity and single-resolution behavior through reload.

Focused attack checks: 24 passed, five GLB inspection cases explicitly excluded in that first run. Individual reservations and shield regression checks: all 18 passed. A subsequent complete run of animal actions/models, physical area impacts and native multi-wave lifecycle passes all 60 tests, with no skips. Raw results are retained alongside this report, including the original failing test on v4. These results do not constitute full-repository, visual, GPU or statistical balance acceptance.

This fix must enter the next separately frozen integration and receive relevant native comparisons. Do not inject it into the ongoing historical quantity experiment or report that experiment as containing it.
