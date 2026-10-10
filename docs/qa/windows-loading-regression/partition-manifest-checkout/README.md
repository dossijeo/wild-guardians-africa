# Preserve partition manifest bytes under Windows Git checkout

Original trial38018893383 on bb1 failed before Rust/native execution. The immutable 2313-byte JSON manifest was checked out as 2385 bytes: Git core.autocrlf=true converted72 LF lines to CRLF and invalidated its addressed SHA. The official run/job/log bytes and root's real sparse-checkout pre-fix receipt are retained unchanged; this is not a world loading/readiness failure.

The sole production correction is `.gitattributes` rule `public/assets/crop-partition-*/partition-manifest.json -text`. The runtime descriptor SHA, expectedBytes and checker remain unchanged. No loader, crop geometry, parser, rendering recipe, readiness timeout, native gate or QA action changed. Unfinished visual action work was stashed on its separate QA branch and is absent here.

Regression test clones the actual Git repository with --shared --no-checkout into a unique .cache directory, configures core.autocrlf=true, checks out HEAD with the real tracked attributes via sparse checkout, and asserts2313 bytes, SHA98e4f7db..., noCRLF, text:unset and a clean tracked checkout. It does not write or normalize the resource manually. These small clones remain as reproducible evidence. The tests and existing web package tests pass4/4; build10.94s/package720files445273952B/860links/24GLB pass. Existing173-test integration evidence remains unchanged; repeating it is not required for this byte-preservation-only correction.

No native execution, new dispatch, retry, PR or promotion occurred. Root review and a subsequently authorized ordinary Windows run remain necessary. The prior bb1 ref and its original failure are preserved.
