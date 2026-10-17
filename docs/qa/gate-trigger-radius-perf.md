# Gate trigger-radius reuse

Worker movement repeatedly checked gates by calling `gateTriggerRadius()`. The
gate swing polygon was cached, but each radius request still mapped its 24
vertices and recomputed their distances. The radius now lives beside the
polygon under the existing position/orientation/scale/material key. Gate leaf
updates and worker waits request it once per gate. No opening, collision or
movement rule changes.

## Reproduction

Run the frozen state for 120 simulated seconds:

```sh
node tools/experiments/profile-frozen-native-tick.mjs tests/fixtures/sabana712-day12-worker-connector.json.gz 120
```

On the same Windows x64 host and `origin/main` WASM binary, separate-process
B/A/A/B runs used B = radius reuse and A = original radius calculation.
`Game.tick` totals were 3,238.4 / 3,552.2 / 3,579.2 / 3,396.8 ms. The two-run
medians are 3,317.6 ms (B) and 3,565.7 ms (A), a 7.0% reduction in this
frozen 120-second window. All four runs produced the same active-state SHA-256
`5dacc407d1a957a3566106e0256fa49419e83729cad404112a71e1cf35071303`.
The frozen runner excludes bot decisions and VFX; this result does not claim a
whole-campaign speedup.

The same code in the balance experiment's newer WASM branch completed a real
14-night Sabana/712 campaign with verified raids. The first 12 daily state
hashes matched the earlier run and accumulated `Game.tick` time fell from
123.4 to 108.5 seconds. That branch has separate documentation and candidate
balance rules; this change imports only the gate calculation and its test.

The gate regression checks that the cached radius follows placement, yaw,
scale and material. Gate tests (21), playable tests (204) and the production
build passed locally.
