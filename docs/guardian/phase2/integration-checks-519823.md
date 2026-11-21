# Guardian integration checkpoint

Source revision: 519823098. Executed 50 current test files, expanding the historical integration selection with current Guardian, awakening and worker-recovery suites. All 310 tests passed, zero failures and zero skipped; Node test duration 122674.731 ms. The full file list and source revision are in [JSON](integration-checks-519823.json); raw Node TAP is preserved in [compressed output](integration-checks-519823.tap.gz).

The historical guardian-attack-echoes.test.js file no longer exists and was explicitly recorded as absent, not counted as a pass. Current singleton/pose/hand emitter coverage is included. No acceptance threshold or production code changed for this run.

Coverage includes gameplay Attack, physics, authored and baked recovery contacts, placement, singleton lifecycle, audio cancellation, morph targets, hand emitters and awakening components. This is a selected integration suite, not every repository test. It does not establish frame-rate, visual quality, perceptual lip sync or full-HUD tutorial video completion.
