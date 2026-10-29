# Native mixed four-hit follow-up

Same native spatial-WASM/full far-profile sabana fixture as native-four-hit, with peerSpecies=rhino and recoveryOverview=1. One hyena plus three rhinos; QA cooldown resets; cinematic lighting candidate enabled. Browser canvas recording, no audio validation. Source at 9b75d3e40.

Completed 16.081225 simulation seconds, zero hidden frames/runtime errors, three peak physical plus one baked actor, finalDownCount zero, maxVisibleGuardians one. Full report and recording retained. The 3-second contact sheet was visually inspected: all actors remain within the overview after the initial camera setup, fall and return upright. This is not continuous close-up anatomy/contact acceptance.

Performance is NOT accepted: render p95 35.67ms/max451.11ms; RAF p95 99.83ms/max2244.845ms; physics p95 19.455ms/max51.245ms. Recording and diagnostic/UI observation were active; this is not an isolated paired comparison, and no causal attribution or baseline regression is established. A browser control became stale during capture; the existing tab continued to completion without restarting. These costs need an unrecorded component-focused follow-up before making performance claims. Existing unrelated engine baseline investigation is not changed here.

## Unrecorded follow-up and diagnostic panel fix

The completed full recovery trace was serialized into the visible status every 250ms (roughly 20,000 lines for this trial). Browser input timed out repeatedly while observing that report. The fixture now displays compact metrics/counts and offers a full JSON download for every physical trial, not only triangle-contact trials; blob URLs are replaced/disposed. No gameplay or recovery algorithm changed. After hot reload, the same UI accepted the unrecorded four-hit trial and the full report download succeeded.

`unrecorded-summary.json` and `unrecorded-full.json`: 409 frames,16.117135 simulated seconds, zero hidden frames/errors, max one Guardian, 3 physical/1 baked, zero final down actors. RAF p95 66.53ms/max166.45ms; render p95 36.22ms/max160.605ms; solver p95 3.76ms; recovery-follow p95 13.44ms, recovery-render p95 12.77ms. The prior two-second peak did not recur, but recording, diagnostic size and warmup all changed: no isolated causal or FPS improvement claim. Recovery/contact work remains a material component cost requiring investigation; overall performance is not approved. The downloaded full trace retains 130 samples while the displayed summary omits their arrays.
