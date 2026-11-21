# Native mixed four-hit follow-up

Same native spatial-WASM/full far-profile sabana fixture as native-four-hit, with peerSpecies=rhino and recoveryOverview=1. One hyena plus three rhinos; QA cooldown resets; cinematic lighting candidate enabled. Browser canvas recording, no audio validation. Source at 9b75d3e40.

Completed 16.081225 simulation seconds, zero hidden frames/runtime errors, three peak physical plus one baked actor, finalDownCount zero, maxVisibleGuardians one. Full report and recording retained. The 3-second contact sheet was visually inspected: all actors remain within the overview after the initial camera setup, fall and return upright. This is not continuous close-up anatomy/contact acceptance.

Performance is NOT accepted: render p95 35.67ms/max451.11ms; RAF p95 99.83ms/max2244.845ms; physics p95 19.455ms/max51.245ms. Recording and diagnostic/UI observation were active; this is not an isolated paired comparison, and no causal attribution or baseline regression is established. A browser control became stale during capture; the existing tab continued to completion without restarting. These costs need an unrecorded component-focused follow-up before making performance claims. Existing unrelated engine baseline investigation is not changed here.

## Unrecorded follow-up and diagnostic panel fix

The completed full recovery trace was serialized into the visible status every 250ms (roughly 20,000 lines for this trial). Browser input timed out repeatedly while observing that report. The fixture now displays compact metrics/counts and offers a full JSON download for every physical trial, not only triangle-contact trials; blob URLs are replaced/disposed. No gameplay or recovery algorithm changed. After hot reload, the same UI accepted the unrecorded four-hit trial and the full report download succeeded.

`unrecorded-summary.json` and `unrecorded-full.json`: 409 frames,16.117135 simulated seconds, zero hidden frames/errors, max one Guardian, 3 physical/1 baked, zero final down actors. RAF p95 66.53ms/max166.45ms; render p95 36.22ms/max160.605ms; solver p95 3.76ms; recovery-follow p95 13.44ms, recovery-render p95 12.77ms. The prior two-second peak did not recur, but recording, diagnostic size and warmup all changed: no isolated causal or FPS improvement claim. Recovery/contact work remains a material component cost requiring investigation; overall performance is not approved. The downloaded full trace retains 130 samples while the displayed summary omits their arrays.

## Recovery component profile

A fresh native mixed trial with profileRecovery=1 completes with zero down actors/errors. `component-profile.json` contains inclusive method measurements: pose 667 calls/2352.03ms total/p95 6.79ms; solids 985/2237.73ms/p95 3.84ms; exact skin bounds 985/1163.815ms/p95 1.97ms; peer refresh 985/126.385ms/p95 .265ms; cloth 466/150.565ms/p95 .53ms. These timings overlap and must not be summed. The full skin envelope within solid-contact resolution is a meaningful remaining target; peer refresh and cloth are much smaller in this trial. No sampling reduction or collision approximation was introduced, and no optimization gain is claimed. The next change should preserve the full-envelope result while reducing repeated skin work or safely rejecting distant solids.

## Scalar exact-bounds accumulation

SkinContactBounds now accumulates scalar minima/maxima and writes the Box3 endpoints once, instead of setting a Vector3 and expanding the box for every contact vertex. Every vertex, skin influence, active morph, input invalidation and initial caller bound is retained. Seven exact-bound tests pass against Three.js for five species plus changing inputs; build succeeds (537 modules,10.68s, existing warnings).

An alternating Node comparison against fcd4ce78c on the installed rhino model (60 warmup rounds,200 timed rounds,5 expansions per sample) measured median .491ms before/.43596ms after; p95 .67594/.57522ms. Temporary comparison source/script removed after the run. This is a static component microbenchmark.

Native repeat `scalar-bounds-profile.json` completes without errors/down actors. Skin p95 1.835ms versus1.970ms previously; calls1046 versus985, so total times are not equal-work comparisons. Pose/solid p95 do not clearly improve (6.95/3.86ms versus6.79/3.84ms). No whole-recovery or global FPS improvement is claimed; larger contact-path optimization remains needed.
