# River underlay: cold versus warm daytime streaming

Reproduce with `node tools/experiments/capture-river-underlay-mask-persistent-stream-warm-20261022.mjs`, then `python tools/experiments/audit-river-underlay-mask-stream-warm-20261022.py`, Vite port 5190.

Two successive daytime round trips per arm, seed 712, media, 1280x720, time 150, fixed camera offsets, simulation and wind. Control disables filtering but retains mask preparation. Settled positions 0/48/96/48/0, not a continuous-motion benchmark.

First trip reproduces the preceding drift exactly: control 11604 changed pixels, persistent filter 10438, maximum channel difference 39/255. Second trip has zero changed pixels and identical whole-chunk mask hashes in BOTH arms. Return calls and triangles are exact in all runs. No captured errors or stale mask ownership.

This removes the previous confounding of night with warm traversal: the stable return also occurs in daylight. It establishes stable settled repeat traversal for this seed/path, not the exact cause of cold drift, seamless fast streaming, or universal cache correctness. No new performance claim and no artistic change. Prior visual review and CPU benchmarks remain applicable separately.

Proceed to actual gameplay occupancy invalidation, quality/overflow recovery and a second path/seed before native integration. Keep the visually preferred persistent underlay in QA; do not discard it on the basis of the cold drift also present in the control.
