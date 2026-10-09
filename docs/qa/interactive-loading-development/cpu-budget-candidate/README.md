# Synchronous loading budget candidate

Opt-in DEV query `?qa-loading-cpu-budget`, optionally combined with `qa-loading` for existing diagnostic spans. Default gameplay/loading and rejected frameSlack remain unchanged.

Current same-V4 ABBA confirmed feature readiness 12.61/13.35s versus main7.86/7.79s, while avoiding main1.13/1.20s RAF stalls. This candidate does not declare acceptance or explain the whole extra delay.

Bounded compilation previously counted asynchronous program readiness in its6ms wall budget and then requested another RAF even when presentation had already delivered. Depth retained an unconditional RAF per32objects. Candidate records actual synchronous invocation wall time, excludes awaited readiness, and resets only after the existing presentation epoch or its own completed RAF. A missing epoch cannot discard accumulated work across microtasks. This is not GPU slack prediction.

The explicit candidate budget is16ms, conservatively below the user's practical50–60ms frame compromise. Compile/upload drawing groups8objects, depth groups32unchanged. It retains every original mesh/program recipe, borrowed-state restoration, native shadow final pass, owner cancellation and final GPU fence. A single native synchronous driver call can still exceed the budget; it remains visible and cannot be interrupted. Draw final-pass and image uploads are not skipped.

Tests cover real compiler snapshots, target lighting and original objects, submit accumulation across awaits, epoch changes before/after pending programs, missing epoch, throwing diagnostics, suspended RAF abort and depth material/renderer restoration. No private source changes to prior immutable A/B. A new private candidate C will use the same controlled snapshot/observer and explicit query flag; pilot before paired measurement. Readiness and all RAF are evaluated together, without subtracting cinematic or overlapping waits from readiness.
