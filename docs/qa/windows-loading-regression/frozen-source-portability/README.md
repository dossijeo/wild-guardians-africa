# Shallow-checkout source invariant portability

Original Validate38024594104:3882tests,3875pass,6fail,1skip. Every failure was gitshow of absent historical refs: crop App baseline0e94/8fb, smoke fixtureb76, traceApp/CLIs719, pairScene9cc and pairwiring71d4. Native28b Windows SUCCESS remains separate and unchanged. No assertion is skipped or replaced by a weakened readiness check.

19 selected source blobs are checked in as deterministic gzip (148850Bcompressed /475517Braw), with full commit/path, Git blob SHA1, SHA256 and exact lengths. The test helper uses only Node fs/zlib/crypto, bounded1MiB decompression, checks gzip and decoded SHA/length, and rejects unknown/ambiguous selections. The identity test checks all19 original Git blob OIDs. Offline verify_source_fixtures.py independently compares each decompressed blob against original Git objects when that history is available. Runtime tests require neither gitshow nor historical refs/fetch.

Actual reproduction: temporary shared bare proxy owns only its own allowFilter config; depth1 blobless clone selects source/test files, no original GLB history/payload copied. Installed node_modules shared by scoped junction; no npm install. Checkout is genuinely shallow with exactly1commit and missing0e94 history. All6 previously failing invariant comparisons plus fixtureidentity PASS7/7;24 unrelated tests deselected by explicit name pattern to avoid heavy CPU during root native reservation. First sparse attempt lacked imported tools/experiments source files; that harness negative is retained, source-only tools were added to sparse selection, successful repeat unchanged application sources.

Local affected-file suite30/30 PASS8379.0378ms completed before root reservation; new fixtureidentity1/1 PASS198.067ms. No fullsuite or build rerun, because runtime/wiring/assets/workflow/package unchanged vs28b. No native/GPU/CI run or PR/promotion. Existing non-Windows PowerShell skip only applies to actual PowerShell argv execution, not invariant tests.

Reproduction: python docs/qa/windows-loading-regression/frozen-source-portability/reproduce_shallow.py
Offline provenance: python docs/qa/windows-loading-regression/frozen-source-portability/verify_source_fixtures.py
Receipt verifier: python docs/qa/windows-loading-regression/frozen-source-portability/verify.py

Original raw Validate full log and both shallow outcomes are preserved compressed with hashes. No timings here imply a performance improvement.
