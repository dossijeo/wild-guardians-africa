# Sol handoff: compiler admission candidate and smaller QA histories

**Working agreement updated by the user:** Astra provides code corrections for architectural blockers; Sol owns integration, broad regression and GPU validation. No further Astra GPU window or parallel broad suite is planned. The earlier recovery/admission/pick corrections remain integrated. This handoff does not close cadence or any migration gate.

## Ready for integration, not applied to production

[candidate.patch](performance/native-pipeline-admission-candidate-20261120/candidate.patch) contains the complete Host change and six directed tests. Production `remote-webgpu-host.js` remains unchanged. Its base SHA is in [base.json](performance/native-pipeline-admission-candidate-20261120/base.json). The unapplied test is included in the patch, not registered as a failing test in the current suite.

The Host currently starts asynchronous native pipeline factories without bounding concurrent native work. The candidate keeps unstarted continuations in the **existing `pendingResources` jobs**, retaining their promises and exact dependencies. A single active-entry identity bounds explicit native compilation. Capacity is taken only after dependencies resolve, and released in settlement `finally` only for that identity. Existing `resourceBudget` controls resumption. Transport credits, unrelated resource dispatch, RAF, inspection and direct native control remain independent; no second FIFO, pool, cache or resource manager is added.

Disposal does not wait for compilation. A native retirement prevents further factory starts even when the old compilation resolves later; disposal rejects the remaining unstarted promises. Cancelling a recoverable frame is not permission to destroy its retained shared resources or to pretend its active native compiler has completed.

Source comparison: installed Three.js **0.180.0**, [WorkerPool.js at r180](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/utils/WorkerPool.js), `postMessage` and `_onMessage`: take execution capacity at actual start and release/transfer it at completion. The source and SHA are preserved in this delivery. Its worker pool and its weaker resolver disposal are not imported; the Host retains its existing lifecycle guarantees.

```powershell
git apply --check docs/guardian/performance/native-pipeline-admission-candidate-20261120/candidate.patch
git apply docs/guardian/performance/native-pipeline-admission-candidate-20261120/candidate.patch
.cache/tooling/node20.exe --test tests/remote-pipeline-admission.test.js tests/remote-resource-transport.test.js
```

Review the current Host before applying; do not force a patch onto conflicting edits. `git apply --check` passed on the unchanged Host after Sol's `3c00a2936` native component. Applying, committing and validating this candidate now belong to Sol.

[Preserved evidence and SHA manifest](performance/native-pipeline-admission-candidate-20261120/manifest.json), with distinct versions:

- Original Host with final six tests: **1 pass / 5 fail**, no cancellations. Fails because a second native factory starts while the first remains unresolved.
- Rejected first candidate awaited the whole dispatch FIFO: **164 pass / 103 cancelled** in 267 tests. It violated existing transport/cancellation requirements. Its failure is retained; expectations were not changed.
- Pending-resource candidate before the final retirement refinement: **267/267** in 18 existing remote test files, unchanged expectations.
- Final patch: **17/17 directed** (six new tests plus transport regressions), including real WASM/publication/Host with a virtual GPU, late completion after native retirement, and disposal during a budget yield. **No final broad suite, new build or physical GPU run** is claimed.

A preliminary negative had an unrelated scheduler timing failure; a fixed virtual clock produced the valid negative. A later negative exposed a late restart after native retirement and drove the final guard. Both are preserved rather than presented as successes. Limiting concurrent compilation may increase preparation latency; that tradeoff and total work require Sol's integrated measurements.

## Implemented QA changes, opt-in

`tools/guardian/native-audit-preparation-costs.mjs` now supports `QA_NATIVE_TRACE_ONLY_HISTORY=true`. It requires full CDP tracing plus ordinary/mutation observers. Every opportunity, draw, ordinary stage and terminal counter still goes into CDP; growing ordinary/opportunity arrays are no longer copied through every inspect response. Only the emitted QA performance marks are cleared locally. Small preparation/mutation summaries remain for existing fixtures. Loss-free completion and contiguous terminal ordinals are still required; browser preservation of cleared marks awaits Sol's real capture.

`QA_NATIVE_PIPELINE_PHASE_TRACE=true` reuses the existing pipeline timing rewriter from `native-audit-pipeline-timings.mjs` in the same Host response. It records IDs and native factory start/return/settlement times without copying descriptors or WGSL. This can distinguish explicit pending factories from unlabelled or implicit browser work. The original descriptor-rich pipeline auditor is preserved.

27/27 QA tests passed, including mark/seam preservation, unchanged awaits/fences, trace-only configuration rejection and raw/gzip reporting guards. No physical reduction is claimed yet.

Use the [existing full Farm command](native-60fps-capture-handoff-20261120.md) with these flags when Sol reaches the relevant validation. Capture a fresh source/native-build fingerprint. To isolate effects, compare the same runtime first with/without trace-only history, then the Host candidate with the same observer settings. Do not rerun old suites merely to reproduce this handoff.

## Findings still open

The [complete STREAM1 archive](native-60fps-capture-20261120.md) remains the physical evidence. Derived windows here locate **24.414 ms in Host response serialization** during gap ordinal 4808; the final receipt repeats 122,280 ordinary rows for 19,584 unique rows and 41,552 opportunities for 4,959 unique rows. This establishes duplicated observation storage and a serialization stall, not the fraction of that stall attributable to each array.

At most six generic Dawn worker tasks overlap on a four-core/eight-thread CPU; gaps 2353/410 overlap five/four. That motivates bounding explicit factory admission, but **does not prove physical causality or savings**. The bootstrap 168.275 ms gap overlaps only one task and remains separate. Hold1=23.850 ms and hold11=8.175 ms with a missed opportunity also remain open. No claim that this patch resolves those holds or all stutters.

Sol should forward only a concrete blocker or cadence violation with its trace, commit, owners and reproduction. Astra investigates that issue and supplies the code correction; Sol continues integrated validation. This avoids duplicated expensive runs while preserving the acceptance criteria.
