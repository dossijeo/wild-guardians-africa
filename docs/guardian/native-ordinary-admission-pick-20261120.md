# Ordinary admission and coherent input snapshots — 2026-11-20

Supporting evidence for the [integrated plan](integrated-gpu-migration-plan-20261104.md), not a new plan or an A5/A6/C4 closure. Product target: **60 fps, 1000/60 ms**. Sol owns authoritative integration; Astra owns this coordinated Host/input correction. Game, the native bridge, WASM and the roster are unchanged by this correction.

[Handoff and commands](native-ordinary-admission-pick-handoff-20261120.md) · [Portable evidence manifest](performance/native-ordinary-admission-pick-20261120/manifest.json) · [Existing incremental-inspection research](native-preparation-packet-slices-20261120.md).

## Corrections

The ordinary Host path previously inspected an entire packet synchronously, although prepared packets already used the resource FIFO's incremental inspector. Ordinary admission now reuses that inspector and existing budget checkpoints. The inspected native generations remain pinned across yields; publication transfers those pins to the pending packet, and cancellation releases them. This does not grant a clock, skip validation, introduce another executor, or replace the queue-drain fence. Atomic phases and GC can still exceed a slice budget.

The real GPU check exposed a second problem: `freezeNativePickTime()` awaited a remote inspection, while the Surface could adopt another graphical owner. Its caller then picked the current scene using the earlier snapshot. Two simultaneous requests could also overwrite the shared captured clock. The submitted-reference rejection correctly exposed this mismatch; its expectations are unchanged.

`withNativeRoutePickFrame()` now revalidates the local revision/proposal/phase/selectable generation/world after inspection, recapturing only after an observed owner change. A committed acquisition uses its existing `preparedFrame.presented` promise. Capture and synchronous raycast execute in the same continuation, with the Surface's clock binding restored in `finally`. Cancellation, disposal, wrong world, missing submitted identity and asynchronous callbacks remain failures. No retired source is resurrected, and no current/zero/fallback clock is substituted.

The helper's unit tests use synthetic owner callbacks. An additional test uses the existing real WASM/publication/client/Host fixture and a virtual GPU: disposing its client rejects a committed, unpresented frame and the waiting pick. Hardware Surface/Worker wiring is covered separately by the original full Farm browser scenario.

## Implementation references

- Three.js **0.180.0**, `node_modules/three/src/core/Raycaster.js`, `intersectObjects` and recursive `intersect`: traversal and hit sorting are synchronous. We retain that picker.
- Existing `src/rendering/webgpu-worker-roster.js`, `attachNativeSourcePresentation`: a synchronous scoped source view restores its candidate in `finally`, rejects thenables and cannot revive a finalized participant. Its implementation is unchanged.
- Existing `src/rendering/remote-webgpu-client.js`, `prepareNativeWorldFrame`, `frame-obsolete`, and `dispose`: the original pending-frame promise resolves on submitted-image acknowledgement and rejects on obsolescence/disposal. Surface `closeRenderer()` uses the original drained close.
- [Babylon.js GPUPicker](https://github.com/BabylonJS/Babylon.js/blob/a56427494c5a8741d488e2e6a5bdb24e8f3488ac/packages/dev/core/src/Collisions/gpuPicker.ts), revision `a56427494c5a8741d488e2e6a5bdb24e8f3488ac`, lines 342–361 and 447–489: protects shared readback state against concurrent picks and translates IDs after rendered readback. This is a comparison of isolation/acquisition, **not** a claim that Babylon implements our owner-generation revalidation. No Babylon dependency, GPU picker, lock or render target was introduced. Consulted file SHA-256: `f470937305d01012604ae5d578302e14aaf216b4bc6897fd5a44b043432f69e1`.

## Evidence so far

Base HEAD: `7f350bb375c34f0ef2b9063e3d03e5fb43830fdc`. The unrelated shift-end correction in that commit belongs to Sol.

| Run | Functional result | Complete Host history | Draws / opportunities | Maximum draw-start interval |
| --- | --- | --- | --- | --- |
| `native-ordinary-before1` | pass | retired-drained | 2469 / 2491 | 39.960205 ms |
| `native-ordinary-after1` | **fail: missing Idle pick clock** | retired-drained | 2459 / 2479 | 41.934814 ms |
| `native-ordinary-after2` | pass, including next-task picks and drained disposal | retired-drained | 2467 / 2491 | 40.179932 ms |

These runs used the same 30 Hz desktop configuration and opt-in phase observers, original assets, real NVIDIA/Turing WebGPU, and the original Farm fixture. No source changes occurred during each 9,059-input freeze. The failed run is retained. Terminal trace coverage does not make a functional failure pass. AFTER2 has 648 complete ordinary admissions and no `stale-binding` or `mutation-hold` opportunities; it is **not a 60 fps result**.

The original Host fails both new ordinary-budget tests; the corrected Host passes them. The old Surface capture function also fails a deterministic adoption-during-inspection reproduction. Corrected selected validation: **1,310/1,310 tests across 98 files**, zero failures/cancellations/skips, build success, frozen inputs unchanged. This is a manual set of mapped integration/mandatory safety, picker and observer tests. The impact tool proposed a conservative 1,642-file fallback because the Worker entry has no unit-test import; that full suite was **not** run. Browser validation covers that entry separately. Earlier broad-suite failures remain recorded in the [previous handoff](native-mutation-opportunity-handoff-20261120.md).

The new offline ordinary-report CLI was subsequently checked against AFTER2 and the lost-data 60 Hz capture. Three additional tests reject missing internal stages, duplicate/reordered stages, unknown stages and invalid timestamps. These are separate from the 1,310-test execution. The report exposes `traceLossFree:false` for the failed collection; producing a diagnostic JSON is not acceptance.

For historical reproduction, the BEFORE1 observer source was recovered by reversing its four inspection seam updates and **matches its original frozen SHA-256 exactly** (`18b15357ec0a0cec6ae4eadd0921aa23328d747329fce85df484465b340c005d`). The original Host used in the CPU negative is the archived Git representation of `7f350bb37`; its line endings differ from the old working copy's mixed endings. Their raw SHA values are not interchangeable. Frozen maps, original Git source and observer provenance are recorded separately.

## Still open

- Causal holds exceeded 16.667 ms: BEFORE1 hold 1 = 23.344971 ms; AFTER1 hold 1 = 21.034912 ms; AFTER2 hold 1 = 23.719971 ms and hold 3 = 18.179932 ms (drains 5.919922 and 8.074951 ms). Native commit, projection, copying, transport, drain and Host installation must be distinguished. This correction does not close those cases.
- BEFORE1's worst interval contains V8 incremental marking and cppgc sweeping before RAF, without an ordinary admission or mutation hold in that window. The allocation source is not yet established. Whole-history audit arrays and repeated inspection copies are a hypothesis, not a production diagnosis.
- Resource reuse, functional completion, GPU draw CPU duration, callback spacing and physical scanout are independent evidence. The old `over50` diagnostic is not the acceptance criterion.
- The separate temporary 4K60 run `native-ordinary-60hz-after1` passed the functional path and drained disposal, but **the runner exited 1 because CDP reported `dataLossOccurred:true`**. Its 801 MB trace is not complete cadence evidence. Windows was restored to its original 4K30 mode, verified by the API; no registry setting was persisted. The lost-data run must remain red for whole-history acceptance. Collection capacity and observer overhead require a separate correction and repeat.
