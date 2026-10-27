# Seam reuse integration gate

Candidate runtime: f69a5f2af, six-biome evidence: 08caeb2ba. Only native-far-ground.js and native-far-ground-seam.js change the production runtime relative to c63354b9a. Rejected depth experiments remain disconnected.

Build completed in 12.24 seconds. Web package verification passed: 989 files, 484461902 bytes, 855 relative links and 17 runtime GLBs. Browser script syntax verification passed. Existing bundle-size and Node JSON-module warnings remain. These checks do not establish native desktop runtime behavior or universal fluency. Full suite: 5016 tests, 4954 passed, 62 skipped, zero failures. The 17 native test files were then run with all three production WASM selection variables: 100 passed, zero skipped or failed. This covers the 62 initial skips plus 38 overlapping tests; do not sum both totals as distinct tests.

After enabling reuse explicitly at the caller, the old AB harness default-parameter override would no longer disable reuse for A. The harness now overrides the caller for explicit WG_SEAM_REUSE=0/1; an unset variable leaves production behavior intact. Historical reports remain unchanged and record the pre-activation source hashes. Use current harness for future comparisons, historical commits for exact old reproduction.

Pending: review and CI before merging this candidate; broader residual frame-stall coverage remains open.
