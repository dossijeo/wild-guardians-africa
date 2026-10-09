# Shared resident preparation hypothesis (not accepted)

Base runtime `795f773e83640d3f7541d8e3d826764c3d779750`. This branch does not modify production code or enable a default. The existing `sharedPreparation` traveling-fixture option selects the existing same-turn resident preparation coalescer. The negative removal-only standby candidate is excluded; its raw result remains in `standby-pruning-9eb0cd09`.

## Source attribution

`attach-native-far-world.js` captures each species' immutable coverage records and resource signatures before requesting preparation. With sharedPreparation enabled, `shared-native-world-preparation.js` shares only requests admitted in the same JavaScript turn. `SharedNativePreparation` unions required textures and performs one ordinary `prepareNativeFarGpu` for the current merged-assets root. That procedure still uploads uncached textures, compiles using the current recipe, performs an isolated real upload draw and awaits a real fence in the same context/epoch. Each subscriber subsequently rechecks cancellation and calls its own `NativePreparedTreeCoverage.complete(snapshot)`; changed record/resource packing is rejected. A later turn never borrows an earlier or in-flight fence.

No shader compilation cache, zero-vertex warmup, quality reduction or CPU-only readiness proof is introduced. The ordinary per-request material/geometry/LOD/ID guards remain. Standby banks retain their original preparation policy. Weak ownership remains bounded to each world and its renderer; closing the world/texture owner still cancels GPU preparation and releases normal resources.

The mechanism could reduce duplicate resident root draws/fences where several species request preparation together. It may have little effect where requests occur in different turns, and it cannot be assumed to solve the frame tail. The prior removal-only experiment saved just three standby compile invocations and did not improve frametime. GPU work, CPU callbacks and intervals overlap; do not add their timings or attribute stalls solely to invocation counts.

The returned result describes the whole texture union. Every subscriber currently records that result in its local diagnostic counters, so summing adapter `cachedTextures` or `textureUploads` would double-count shared work. Use the existing renderer trace's actual initTexture/compileAsync calls and separately instrumented buffer requests instead. This limitation changes no resource lifetime or readiness.

## CPU preflight

62 directed tests pass (raw TAP retained). New integration tests compose the actual shared requester, prepareNativeFarGpu and per-species coverage verifier using a deterministic renderer/GL double: three unique textures produce one compile/upload draw/fence; replacing one packing while compilation is pending rejects its IDs while another species accepts its unchanged proof. Cancelling all subscribers before compilation completes prevents late upload/fence and clears borrowed texture handlers. Existing tests cover partial cancellation, later-turn separation, resource generations, faults, context/owner cancellation and exact native coverage. These CPU doubles do not establish native GPU timing or visual correctness.

```
node --test tests/shared-native-preparation.test.js tests/native-far-gpu.test.js tests/native-prepared-tree-coverage.test.js tests/native-far-render-signature.test.js
```

## Planned matched comparison (not executed)

One frozen source/server and the same fixture are used in both arms. A uses:

```
http://127.0.0.1:5192/tests/browser/streaming-travel.html?fixture=gran-rio-suajili-100&seconds=15&speed=12&residentPrograms&residentTextures&crateShadow&awaitActors&isolatePreparation&trace&chunkPhases
```

B appends `&sharedPreparation`. No changes to prewarm, textures, actors, viewport, quality, seed or camera path between arms. First perform separate functional/resource QA with `resourceProfile`, excluding its perturbed timings; then timed ABBA without the buffer probe. Check logical state, complete GPU queries, context/owner disposal, visibility and exact packing/resource coverage before any activation. Compilation-call savings alone are insufficient. Loading's current GPU matrix owns the device; no native run or performance claim is made here.
