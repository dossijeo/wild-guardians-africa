# Loading CI failure and targeted correction

Validate game run `37913182993` tested immutable feature head `41f57d037d79d4a2f5925b04bb77a2f926279e25`. It finished with failure: 3,681 tests, 3,679 passed, two failed, zero cancelled/skipped. Both failures were in the static SFX catalogue audit: the generated source fingerprint and caller line references were stale after feature source changes. Build/package stages were skipped by CI, not passed. Separate local build/package evidence is documented elsewhere.

`failed-test.log` is the exact `gh run view 37913182993 --log-failed` output retained by root. SHA-256: `38e0cc2b9bf80bf5eefd60ed67bc3f2481edfbee9b504806bd9720bad9da55ee`.

Root regenerated the catalogue with its existing generator, reviewed current source hashes/line references and new loading-audio source mentions, and verified that all 126 IDs, original file hashes, classifications, runtime statuses and audible-playback evidence flags remain unchanged. The three catalogue audit tests then passed without editing or weakening tests. The correction is feature commit `f2adc0b2211165dad0bfbd4a3540ae6c5bc0ce68`; it changes only generated catalogue documents, not production runtime.

Replacement Validate game run `37914538279` was confirmed in progress on exactly that corrected commit. Its launch is not a passing CI result; inspect its terminal state before integration. Do not rerun the old failed commit expecting regeneration to exist there.

## Corrected terminal result

Root subsequently inspected the completed replacement run on exactly `f2adc0b2211165dad0bfbd4a3540ae6c5bc0ce68`: SUCCESS. The full log reports 3,681 tests, 3,681 passed and zero failed; build passed in 9.21 seconds. The web package check passed with 711 files / 445,234,566 bytes, 860 relative links and 22 runtime GLBs. The itch ZIP was CRC-verified at 388,361,020 bytes and uploaded as artifact `11608853226`.

`corrected-full-success.log` preserves the complete `gh run view 37914538279 --log` output. This closes automated CI on the corrected feature commit, not the outstanding visual, lifecycle or before/after loading comparison gates. The earlier failure log remains unchanged.
