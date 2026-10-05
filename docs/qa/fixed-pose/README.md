# Reusing identical fixed animation samples

Workers and beasts use paused AnimationActions with timestamps driven by the simulation. The shared helper skips a repeated mixer evaluation only for the same mixer/action/time and unchanged enabled/paused/weight state. Action changes and every new attack ID force evaluation, including a restart at an identical timestamp. One reusable WeakMap record per rig avoids allocating a new cache record every moving frame. Animal foot grounding continues to run; root placement and terrain are not cached by this change.

The final native comparison loads all four worker GLBs and five original bestiary GLBs with geometry, skinning and tracks intact; Node omits texture decoding only. Across five action states and twelve repeated samples per state, all nine rigs retain exactly identical world and skeleton matrices versus the unconditional reference (maximum difference zero). Parent translation and yaw change inside repeated samples. Mixers evaluate five times instead of sixty per rig, including repeated/new attack and action changes. Forty-seven directed native action/helper tests pass.

`cpu-native-final.json` stores the current source fingerprints and ABBA CPU submission samples (40 warmup and 200 measured calls per group), for both identical and changing timestamps. `cpu-native.json` is the earlier allocation-based experiment, not final-source evidence. These short Node CPU measurements vary by rig and run; they are not GPU, browser/mobile frame-time or FPS proof. Grounding still dominates some beasts. No blanket percentage performance improvement is claimed.

Reproduce:

```
node tools/benchmark_fixed_pose.mjs docs/qa/fixed-pose/cpu-native-final.json
node --test tests/fixed-pose.test.js tests/worker-actions.test.js tests/animal-actions.test.js
```
