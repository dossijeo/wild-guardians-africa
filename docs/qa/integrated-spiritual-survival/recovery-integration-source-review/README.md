# Recovery integration source review

Reviewed experimental revision d626a735 against historical campaign-v118-q15-good-sabana-123-hundred, baseline source 9a7aa1825f30876d764783d5b1e89559cf6f7eb9. No campaign is launched by this review and no main acceptance is implied.

Current provenance records 461 source hashes: 423 historical paths unchanged, 28 changed, ten newly tracked dependencies. Full hashes, original/current mappings, exact frozen player profiles and intended opt-in options are retained in source-review.json.gz. review-script.mjs.gz reproduces the read-only inventory. The complete diff ignoring end-of-line whitespace is retained in reviewed-source.diff.gz.

## Invariants

Hashes remain identical for balance.js, agricultural-power.js, crop-impact-health.js, crops.js, workforce.js, rules.js, native-q15-labour-policy.mjs, native-campaign-protocol.mjs and native-campaign-crop-policy.mjs. All historical balance content dependencies except raid_pressure_candidate.json remain unchanged. Thus the source review does not authorize economic, wage, crop HP, growth, magic power or player-strategy modifications. Crop HP remains one. Historical strict launchers are preserved and still reject this source revision.

## Changed dependency categories

- Military quantity: raid_pressure_candidate.json, raid-pressure-budget.js and raid-pressure-plan.js introduce candidate four's response to current living agricultural value. Individual attack profiles and EMA pressure remain unchanged. A newly generated military plan is different by design.
- Native technical corrections: actor-motion.js yields before a blocked long connector terrain search; animal-exit-connectors.js separates radial and lattice work across ticks; worker-return-route.js rejects invalid A* origins; worker-wall-overlap-recovery.js handles a bounded collinear wall seam. raid-target-reservations.js preserves an already-started attack against its destroyed original target until native miss resolution consumes its strike. These can change native trajectories/strike utilization, so a comparison against old runtime is not a pure quantity experiment.
- Economic presentation: money.js calls the new settlement-observers.js after an already-confirmed transaction. There are no changes to arithmetic, debit, settlement or balance calculations. No HUD observers are attached by native campaigns.
- Audit correction: check_intensive_farm.mjs includes already-settled additional Multiply income in its delivery ledger oracle. This changes validation, not simulated credits or player actions.
- QA optimization/provenance: native-campaign-runner.mjs, run_native_campaign.mjs and native-funded-defense-policy.mjs forward and record the opt-in gate flag; native-perimeter-reused-candidate-v2.mjs, static-animal-certificate-cache.mjs, native-stable-plan-perimeter-proof.mjs and stable-prospective-wall-plan-candidate.mjs support native guarded certificate reuse. Newly hashed proof-geometry-signature-candidate.mjs omits only gate openness for hostile static geometry. Default remains false, fresh worker proofs are retained, and physical changes invalidate reuse.
- Existing production presentation integration: app/main.js, app/save-game.js, rendering/scene.js and the four changed camera modules, tutorial/controller.js, ui/guardian.js and ui/menu-integration.js include main's juice/usability/tutorial changes. Seven new UI/app/rendering files plus game-juice asset provenance accompany them. These are recorded, not imported into the old live campaign.
- simulation/game.js differs only in line endings; the normalized diff is empty. It must still be represented in exact byte hashes.

## Next comparison requirement

Freeze this integration in a separate new protocol. Repeat a matched native military reference with the old quantity recipe on the same corrected runtime, then compare candidate four. Keep good/normal/bad decisions identical and preserve the new source manifest for every arm. Historical campaign 712 remains running on its own immutable sources; its outcome remains historical evidence. Do not patch it, label technical failures as defeat or merge balance based on local proof tests.

Native functional and performance evidence for the gate optimization is in the adjacent proof-gate-phase-current-benchmark folder. Broad CI and native statistical balance acceptance remain pending.
