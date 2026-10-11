# Isolated corrected-runtime military reference

QA-only branch codex/raid-recovery-current-reference, created from c7e59a79. Never merge this reference into main or use it as a production downgrade.

Only three runtime files are restored byte-for-byte from the original military baseline 9a7aa1825f30876d764783d5b1e89559cf6f7eb9: content/balance/raid_pressure_candidate.json, src/simulation/raid-pressure-budget.js and src/simulation/raid-pressure-plan.js. This restores candidate-three quantity, keeping the current integration's technical actor/navigation/committed-attack fixes, settlement observers and opt-in QA tooling intact. Player profiles and every other reviewed runtime dependency must remain identical.

tests/raid-current-reference.test.js checks all 461 reviewed dependency hashes, allows exactly those three differences and matches each to the original recorded hash. The low-value historical example remains 19 animals at night 36; varying current value while holding pressure/RNG fixed cannot invoke candidate-four recovery in this reference.

This branch generates candidate-three plans for comparison and is not a compatible production replacement for candidate-four saved plans. Existing candidate-four recovery tests on this checkout intentionally target another implementation and must not be reported as accepted. Native reference checks use the unchanged plan/lifecycle tests and the new precise source/count oracle. No running campaign is patched or restarted. A strict new source freeze and a matched native reference/candidate execution are still required before comparing balance outcomes.
