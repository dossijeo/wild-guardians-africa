# Native preparation attribution, 2026-10-09

Frozen main 8be777f4, native tab864, Gran Río / Suajili historical intensive
farm, seed712, media, 15 seconds at 12 units/second. Parameters:
`fixture=gran-rio-suajili-100&seconds=15&speed=12&residentPrograms&residentTextures&crateShadow&awaitActors&isolatePreparation&trace&chunkPhases`.
The frozen fixture and complete compressed DOM report are retained with hashes.
Run `node docs/qa/streaming-travel-dense/preparation-roots-8be777f4/verify.mjs`.

There were 221 compileAsync invocations: 108 standby-bank roots, 101 resident
merged roots and 12 other roots. These are synchronous invocation identities,
not newly compiled programs or completed readiness proofs. The source prepares
resident batches when exact packing/LOD/resource coverage loses its proof;
the standby request preserves tree visibility while that proof is pending.
This evidence identifies where to investigate repeated preparation. It does
not justify skipping GPU readiness or relaxing resource/identity checks.

Frame p95 was 116.4ms, maximum149.7ms, with18 intervals above100ms.
CPU-render p95 was30.3ms, maximum42ms. All258 asynchronous GPU queries resolved
without errors and are retained separately in the report/receipt. CPU, GPU and
frame intervals overlap and must not be added. This run is a diagnostic, not a
paired optimization benchmark or an acceptance of traveling stability.

The logical farm remained byte-identical. Scene disposal and context loss were
confirmed before closing the tab; the root browser inventory was then empty.
Loading AB/BA and repair tests were confirmed terminal before Run. No other
timed GPU or heavy CPU task ran during measurement; light source/docs activity
was allowed. Physical thermal/power state was not controlled.

Next: inspect native coverage packing changes and standby requests against
their immutable identity and resource proofs. Compare any candidate with the
same path in AB/BA, checking transition visibility and cancellation/resource
ownership before activating it in gameplay.
