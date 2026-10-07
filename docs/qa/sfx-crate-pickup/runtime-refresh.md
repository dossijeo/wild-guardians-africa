# Opus routing metadata follow-up

Validate game run 37549202839 failed on c309dc0 before the test suite: `verify_sfx_runtime.mjs` rejected the source hash of `content/sfx-routing.json`. The new 117 binding had changed that original routing file without refreshing its derived Opus copy and the hash-bound runtime manifest. The earlier directed playback tests did not exercise this verifier.

The failure was reproduced locally, then `node tools/prepare_sfx_runtime.mjs` regenerated the derivative and manifest using the existing audited encodes. No audio was re-encoded or replaced. `npm run verify:audio-runtime` now passes for 21 music files, 550 music windows, 126 SFX and their three metadata copies. The verifier also checks that the Opus routing preserves the live integration decisions, including 026 on drop and 117 on physical pickup.

Repeat validation: 67 directed audio tests, build, web-package check and web-asset verification. New remote CI remains a separate gate; these local results do not establish that it has finished.
