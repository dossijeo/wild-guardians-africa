# Preparation attribution, first phase — source and CPU tests only

Base: `795f773e83640d3f7541d8e3d826764c3d779750`. This branch does not incorporate the rejected shared-resident or seam-isolation candidates. This is instrumentation, not an optimization or native acceptance result. No browser/GPU run, build or heavy replay was performed for this receipt.

The negative seam ABBA remains authoritative: A1 had a single 174.3 ms seam draw outside the measured synchronous `world.render` interval, while A2 control had no corresponding slow seam draw. That observation does not credit isolation or establish shader compilation as the cause. See the separately archived seam-isolation ABBA evidence in main.

## Opt-in and scope

The existing `trace` query parameter on `tests/browser/streaming-travel.html` installs an observer after initial world readiness. No new switch, query, renderer pass, scheduling loop, distance, shader, shadow or quality change is introduced. Initial loading preparations therefore are outside this observer's scope. The observer itself can also be installed directly by CPU tests; when absent, it does not inspect roots or renderer resources.

Each observed `prepareNativeFarGpu` request receives a local sequence ID, exact root UUID/name/type and cache epoch. It emits resource versions, compile begin/settled, synchronous upload draw begin/end, fence creation and ready/cancelled/failed stages. Compile/await spans are wall-clock phases; they are **not synchronous CPU durations**. `ready` is the preparation function's existing fence completion, not proof of subsequent caller adoption.

The upload draw marker uses synchronous `try/finally`, restores nested scopes and cannot survive an asynchronous continuation. The fixture observes seam objects after a successful `renderBufferDirect` return: ancestry distinguishes an object inside the marked preparation root from collateral scene draws. Only an observed owned object can link its first later ordinary submission to that request. Cancelled/failed request status is retained instead of being silently promoted. The current observed epoch is reported separately from the request epoch. Disposal closes subscriptions and prevents late callbacks from delivering into a replacement observer; roots are no longer retained after the request completes.

For each request/object/phase, the witness captures only its first seam submission: geometry and attribute/index identity, versions/count/byte lengths, material recipe/version, observed `currentProgram` ID/cache key after the call, target/viewport/scissor/output recipe and shadow settings. A successful API return is not verified primitive or pixel coverage. Attribute bytes are an identity witness, **not official GPU allocation/VRAM accounting**; a program key does not establish compile/link cost. An ordinary submission may be a shadow/depth pass; target and material identify that possibility rather than claiming a color-only handoff. Diagnostic listener/read errors are exported separately and do not replace execution faults.

## Callback clocks

`frames[].at` remains the supplied RAF timestamp relative to `started`. Under `trace`, each measured frame additionally records actual callback start/end, synchronous `world.render` start/end and the original CPU measurement end (after timer-query end bookkeeping). The callback end follows scheduling the existing next callback and excludes final JSON export. The final trace report is exported in one microtask after that end timestamp is populated, without another render/frame/query. These clocks permit correlation with asynchronous preparation timestamps without assigning preparation waits or nested draw spans to frame CPU. Do not sum nested render/draw events.

GPU pass attribution is deliberately not implemented. The existing GPU timer is unchanged; no nested query is introduced. Native output-state, resource lifecycle and root adoption must still be checked before using this trace to explain the previous spike.

## Reproduce the directed checks

```powershell
node --test tests/native-preparation-trace.test.js tests/native-far-gpu.test.js tests/isolated-gpu-root.test.js tests/streaming-travel-clocks.test.js
python docs/qa/streaming-travel-dense/preparation-attribution-phase1/verify.py
```

62/62 passed, zero failed/skipped/cancelled. The callback tests execute the actual callback extracted from the HTML in a VM with a deliberately stale RAF clock; they verify query bookkeeping remains distinct and final export adds no frame. Integration tests use the real preparation function with a deterministic renderer/context stub to cover compile cancellation, epoch change at the fence, synchronous marker restoration and output/root-parent restoration. The extracted module script also passed `node --check`.

`sources.json` pins baseline and working source bytes plus the TAP artifact. Before a native run: freeze the instrumentation/control source and identical fixture, reconfirm literal import/JSON/fetch/worker dependencies and archived snapshot over HTTP (the earlier missing-manifest control failure must not recur), then request an explicit CPU/GPU slot. No native result is implied by these tests.
