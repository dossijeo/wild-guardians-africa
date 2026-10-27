# Integrated water runtime acceptance checks

Quality, context and legal-edit runs completed on the integrated scene implementation (ed761c642 plus QA edit-mode runner). The QA scene hook only delegates the integrated sampler to a counter wrapper; its control flow is production code.

- Low / medium / low with camera travel: 240 advancing frames, no paused frames, 15 generated chunks, no stream failures, no queued/preparing work at completion.
- Context restoration: authoritative snapshot unchanged, restored rendering (78 draw calls). Simulation deliberately paused for equality.
- Construction/removal/crop: three commands overlapped confirmed pthread status 2. Wall visible after building; barrier count 0 -> 1 -> 0. Both stale wall-generation results rejected (-2). Crop retained and observed by renderer batch. Stream completed without failures or pending work.
- Candidate exposure: quality 1 call / 1 yield; context 1 / 1; edits 2 / 1. This proves coexistence, not that quality/context happened precisely inside a water sampling yield. The live iterator closure and scheduler module tests cover cancellation separately.
- Compiler warnings: 28 / 29 / 29 messages containing X4000 potentially-uninitialized variables. No other captured errors. Warning provenance is not established by these runs.

These are functional checks, not A/B performance evidence. The edit case pauses between commands and is not an active raid/route stress test. Next gate: interleaved integrated performance comparison and broader regression checks before main promotion. Existing reports retain all warnings and timings.

Reproduce with run-chunk-water-runtime-validation.mjs and the output directory; add --edits for the legal-edit run. Exact canonical harness snapshot is preserved in the earlier chunk-water-runtime-validation/canonical-harness.mjs.gz; original local edits were not staged.
