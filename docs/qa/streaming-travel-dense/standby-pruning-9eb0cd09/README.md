# Removal-only standby reuse: negative traveling result

Candidate runtime `3569b34b`, QA `9eb0cd09`, control `b00cc937`. Native root Browser2 tabs 896–900, archived Gran Río/Suajili farm, seed712, medium quality, paused state, 15 seconds at 12 m/s. Control port5397 was a git archive with a separate Vite cache; candidate port5192. Public assets and dependencies were shared, unchanged during the comparison. Fixture and witness hashes match. Parameters: `fixture=gran-rio-suajili-100&seconds=15&speed=12&residentPrograms&residentTextures&crateShadow&awaitActors&isolatePreparation&trace&chunkPhases`; the separate functional run additionally used `resourceProfile` and disabled GPU timers.

All ten final/disposed raw reports are retained as deterministic gzip files with raw and compressed SHA-256 hashes in receipt.json. Run `node docs/qa/streaming-travel-dense/standby-pruning-9eb0cd09/verify.mjs`.

| Measure | A1 | B1 | B2 | A2 |
|---|---:|---:|---:|---:|
| Frame p95 ms |116.4|116.4|116.4|116.5|
| CPU render p95 ms |30.0|33.5|29.1|32.8|
| GPU p95 ms |68.269|69.226|70.206|69.050|
| Standby compile invocations |111|108|108|111|
| Resident merged invocations |104|106|104|103|

**No consistent frametime improvement. Do not promote this candidate or present it as a successful optimization PR.** The three fewer standby invocations per candidate run do not justify activation: resident counts vary, CPU/GPU outcomes are mixed, and final estimated standby bytes are essentially equal (A1 8,171,592; the other three 8,197,704). Only the candidate has a binding-query buffer probe, so it is not a paired buffer-saving measurement. Keeping this branch as an isolated experiment is justified by the correctness regressions, not by demonstrated performance.

All four timed runs use viewport1280×720, drawing buffer1600×900, DPR1.25 and the same initial/final camera positions, 180 m path and final40 chunks without failed/fallback generation. All 1,016 GPU queries resolved with no disjoint/discard/overflow/foreign/allocation events. Errors are empty and logical state is unchanged. Every final witness checks all submitted Float32 rows outside the timed frames (one submitted row, zero invalid), while descriptive samples are capped at eight per LOD. CastShadow is false; actual/prepared checksums match. This establishes the endpoint packing, not every intermediate frame's visibility.

The separate functional run observed 123,879,470 bufferData bytes requested during load/travel, peak90,036,848 and zero live buffers/bytes after disposal. These are tracked requests, excluding textures, driver caches and CPU RAM. The functional resource QA used viewport/drawing buffer1280�720 at DPR1, distinct from the timed1600�900 buffer at DPR1.25; it is not a timing or paired-resolution comparison. All five scenes confirm disposal/context loss. Root closed their tabs and reset the viewport. Agents confirmed no local heavy CPU tests/builds/benchmarks and no concurrent GPU scene during the measured window. The seventeen campaign jobs were remote GitHub Actions jobs, not evidence of local CPU contention. No exhaustive operating-system background-process, thermal or power-state control is claimed.

## Ready witness limitation

Before Run, root observed39 submitted/invalid rows in the ready report. The row samples had visibility0, isPreparedtrue, matrixExacttrue and equal Float32 checksums. This ready raw was not saved and is not reconstructed here. The observer ran before the first regular draw: the bank's preparation count was still populated while its initial visibility array was zero. The witness calls any positive count "submitted" and treats zero visibility as invalid; that description conflates preparation packing with current positive-fade draws at this phase. It is not evidence of corrupt visible rows. Final/disposed raw reports are retained. A future QA refinement should distinguish phase/prepared count from actual draw count, without changing runtime readiness.

## Next attribution

These traces do not establish a single cause of the116 ms tail. Install maxima are4.3–6.4 ms, far.attachData maxima8.3–10.4 ms, and compileAsync synchronous maxima1.7–5.2 ms. Nested render/update/sync costs overlap and must not be added. GPU p95 near68–70 ms and off-frame preparation draws/backpressure merit investigation, but neither is causally isolated here.

The resident preparer still receives the entire merged-assets root for each species when a packing proof changes. Next compare the existing `sharedPreparation` experiment, which coalesces same-turn resident requests while preserving union textures, a real upload/fence and each subscriber's exact packing/resource checks. It adds no fixture flag or shader cache and does not reuse a later packing's fence. Native AB/BA and resources/visibility remain required; compile call counts alone cannot establish its benefit. The zero-vertex loading experiment remains excluded.
