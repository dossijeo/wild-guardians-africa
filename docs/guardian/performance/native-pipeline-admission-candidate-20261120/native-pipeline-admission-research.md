# Native compiler admission: source comparison

Consulted the installed Three.js 0.180.0 source: `node_modules/three/examples/jsm/utils/WorkerPool.js`, corresponding to https://github.com/mrdoob/three.js/blob/r180/examples/jsm/utils/WorkerPool.js.

`postMessage` reserves an available worker only when work actually starts. `_onMessage` transfers or releases that capacity upon completion. This separates submitting a job from occupying execution capacity. Apply that pattern to the Host's existing `pendingResources` promises and dependency ownership; do not instantiate another pool or queue. `nativePipelineEntry` identifies the actual native factory in flight, and only that identity releases its capacity in settlement finally. Dependencies must resolve before acquiring it. Resource dispatch, transport credits, RAF and direct control remain independent.

Three's implementation is a worker-message pool, not a GPU compiler. Its disposal clears resolver arrays; it does not supply the Host's stronger native retirement guarantees. Keep original errors, pins, generation ownership and device drain. Cancelling a candidate frame does not mean a browser-native compiler promise has settled, and cannot open capacity early. Conversely, an unstarted job after terminal retirement must never invoke its factory; final disposal owns its pending promise. Normal frame cancellation may intentionally retain resources for recovery, and is not permission to destroy shared dependencies.

Observed full STREAM1 trace: at most six generic Dawn worker tasks overlap on a four-core/eight-thread CPU. The long live gaps at ordinals 2353 and 410 overlap five and four tasks. The label alone does not prove these tasks were explicit pipeline compilation, nor that overlap caused the missed presentation. The bootstrap gap overlaps one task and must remain separately attributed.

Negative/control tests: original code starts two simultaneous factories; bounded candidate preserves resident drawing/inspection and dispatch, waits for original layout dependencies, rejects without opening queued work, and stops continuation after disposal or terminal native retirement. Existing transport and obsolete-frame tests must pass unchanged. A candidate that awaited the entire FIFO was rejected by those tests and remains unintegrated.

Physical validation still requires a new native-build baseline, the trace-only observer comparison, and then the bounded-factory comparison. Virtual GPU tests prove ownership/admission only. No A5/A6/C4 closure.
