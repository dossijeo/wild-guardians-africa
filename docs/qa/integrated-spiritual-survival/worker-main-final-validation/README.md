# PR25 final validation and integration

[Validate game run 38195483591](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38195483591) completed SUCCESS on exact head `30b1e2dc7a81e4229d95b59f7536e23399120315`: 4,003 tests, 4,002 pass, zero fail and one platform skip. The skipped case is the real PowerShell Windows visual-launcher preflight, unavailable on the Ubuntu runner. The full original workflow log and metadata are retained here.

The same workflow passed build (10.60 s) and web package validation (722 files, 445,654,474 bytes, 860 relative links, 22 runtime GLBs). Full test duration was 2,307,392.36 ms in CI; this measures the test suite, not gameplay loading or a campaign benchmark. Original legacy 100-night tests are distinct from the new frozen military calibration.

Together with final-head Windows SUCCESS, this satisfied PR25's merge gates. PR25 was merged as `fc4c3a81`. The clean publication checkout fast-forwarded to that main commit; ancestry and exact equality of the three runtime files against the approved head were verified. Its 13 worker/SFX checks pass.

The one Ubuntu-skipped preflight was also executed on this actual Windows host using the merged publication checkout: one pass, no failures and no skips. It verifies rejection of incorrect source hashes and existing evidence before launching any application. It is not a visual/native gameplay test; packaged native gameplay evidence is documented separately in `worker-main-windows-final/`.

`receipt.json` records lossless log hashes and source paths. No new full local suite was run or claimed after integration; CI supplied the final full suite. PR26 and the experimental 100-night campaign retain independent gates. The military candidate is not merged by this change.
