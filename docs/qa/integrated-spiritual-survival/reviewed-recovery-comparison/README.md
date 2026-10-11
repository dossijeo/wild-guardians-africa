# Matched corrected-runtime recovery comparison

tools/run-reviewed-recovery-comparison.mjs uses the source inventory audited in recovery-integration-source-review. It accepts exactly the reviewed candidate-four dependencies, or those same dependencies with precisely the three historical military files restored to their recorded candidate-three hashes. Missing/new dependencies, an economic/navigation/policy change, a hybrid recipe or a novel military recipe reject before simulation.

good/normal/bad decisions are copied unchanged from military-only-policy-freeze-v1. Options must exactly match one profile, including the 100-night horizon. An override of days, worker policy, reserve behavior or strategy is rejected. Only gateAnimationInvariant=true is added as a validated QA optimization, with fresh worker proofs retained. No historical strict launcher is weakened.

Use --plan|--run PROFILE SEED BIOME CULTURE NEW_OUTPUT_DIRECTORY. Each source journal records the detected reference/recovery arm, recipe version, player profile, review hash, frozen profile id and complete dependency hashes. Native run journaling, persistence, actual ledger, real attacks and technical-error classification remain those of run_native_campaign.mjs.

Three guard tests pass, zero failures/skips. They exercise both accepted hash maps, all prohibited drift categories and profile option identity. These are guards, not native campaign or balance acceptance. A --plan checks real source/parameters without starting a campaign. Matching full campaigns must still be executed and reviewed; no main integration is approved here.
