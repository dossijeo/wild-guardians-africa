# Same-turn shared resident preparation

The explicit QA `sharedPreparation` flag groups resident merged-root requests
admitted in one JS turn. Multiple species use the same world.assetGroups.root.
Their texture requirements are unioned and the current production preparation
helper compiles, uploads and fences that root once. The default remains off.
No completed or in-flight fence is cached for future turns.

Every species retains its original immutable packing snapshot and resource
signature, validates its own owner after the shared fence, and invokes the
unchanged prepared.complete(snapshot). A cancelled subscriber is rejected;
the underlying helper is cancelled if all subscribers have cancelled or the
world is disposed. Actual context epoch, shader, texture owner and GPU errors
remain the responsibility of prepareNativeFarGpu, with its existing checks.
The shared draw cannot itself authorize any tree.

This coalescer deliberately does not combine standby-bank or new-impostor
preparations, which have different geometry roots. It does not persist a queue
across turns, alter LOD packing, skip texture requirements or change save data.
Per-adapter upload counters describe that adapter's shared readiness result;
do not sum them as independent physical uploads. Native trace invocation
counts and resource witnesses are needed to measure actual submissions.

Native pilot, matched AB/BA, visual transition and disposal/context regression
are required. Reducing invocation counts is not sufficient for acceptance.
