# Shared-parent matrix update probe

Baseline: main 581e515, preserved in `parent-cache-baseline.mjs` with only import paths relocated. Candidate: `camera-building-registry.js` updates each shared ancestor once per sync. Entity roots still update on every sync, and changed roots still update their children before deriving bounds. The cache expires at the end of every call; moving, rotating, scaling, reparenting and manually maintained parent matrices remain observable.

Run `node tools/benchmark_camera_registry_parents.mjs`. Each independent A1/B1/B2/A2 fixture uses 1,000 warm-up iterations and 1,000 measured sync calls. It compares 30/1,000 roots, 0/1/4 ancestors, idle/one moving root. Sweep signatures and complete final indexed descriptors must match across all four arms. This is synthetic CPU registry cost, not rendered frame time, GPU cost, native asset loading, or RAM acceptance.

The first expanded candidate allocated a parent set even for unparented roots. `parent-cache-eager.jsonl` preserves that experiment. The final candidate creates the set only when an actual parent is encountered and uses a module helper rather than allocating a closure each sync. `parent-cache-lazy.jsonl` preserves the final comparison.

| Roots | Ancestors | Mode | A1 p50/p95 ms | B1 p50/p95 ms | B2 p50/p95 ms | A2 p50/p95 ms |
| --- | --- | --- | --- | --- | --- | --- |
| 30 | 0 | idle | 0.007/0.010 | 0.006/0.012 | 0.007/0.009 | 0.006/0.009 |
| 30 | 0 | move-one | 0.017/0.034 | 0.012/0.021 | 0.011/0.020 | 0.011/0.016 |
| 30 | 1 | idle | 0.010/0.019 | 0.009/0.011 | 0.009/0.011 | 0.009/0.013 |
| 30 | 1 | move-one | 0.015/0.020 | 0.013/0.017 | 0.013/0.016 | 0.015/0.028 |
| 30 | 4 | idle | 0.017/0.023 | 0.009/0.011 | 0.009/0.012 | 0.018/0.021 |
| 30 | 4 | move-one | 0.023/0.041 | 0.014/0.031 | 0.014/0.021 | 0.024/0.045 |
| 1000 | 0 | idle | 0.239/0.684 | 0.269/0.594 | 0.239/0.471 | 0.220/0.390 |
| 1000 | 0 | move-one | 0.265/0.823 | 0.266/0.720 | 0.265/0.569 | 0.264/0.484 |
| 1000 | 1 | idle | 0.329/0.448 | 0.295/0.404 | 0.301/0.482 | 0.348/0.601 |
| 1000 | 1 | move-one | 0.367/0.749 | 0.330/0.581 | 0.334/0.587 | 0.377/0.955 |
| 1000 | 4 | idle | 0.665/2.085 | 0.311/0.673 | 0.295/0.561 | 0.633/1.917 |
| 1000 | 4 | move-one | 0.701/1.525 | 0.347/0.598 | 0.342/0.756 | 0.723/1.643 |

The shared-depth-four comparison consistently reduces median/p95 sync cost in both modes. Depth one has smaller gains. Unparented results overlap and drift between arms; they do not prove a speedup or identical p95. The final unparented path retains the baseline matrix work and avoids allocating a parent cache. Two long campaign processes and other CPU work remained active, so timings include scheduling and GC variation. Accepting this structural reduction does not justify a universal FPS claim.

Directed tests check shared ancestors update once, parent rotation/scaling/translation, reparenting, manually maintained matrices, native damage states, replacement/removal, village unit bounds and transformed model envelopes. Normal gameplay camera protection remains off: this optimization belongs to the diagnostic prototype and does not approve visual margins, terrain conflict recovery, mobile interaction or full-culture acceptance.

Source SHA256 for reproducing this comparison:

- `src/rendering/camera-building-registry.js`: `a3f2cda1d240ae13e23f3b4c38d65d503990482fe3df6fd9f49e188e98f534c2`
- `tests/camera-building-registry.test.js`: `6983223c2e28386f66cd73d575049f4ae06f4788b0ada69987a107e81593aa5b`
- `tools/benchmark_camera_registry_parents.mjs`: `a28c29d871ff5a15b6836dfc3bf029a22c66de23977a56a97f633d1f4664ba06`
- `docs/qa/camera-volume-foundation/parent-cache-baseline.mjs`: `d4d3712d5a26dc06a33b0063c696175be14324e3d8f0689230f9a24ce4f43b82`
