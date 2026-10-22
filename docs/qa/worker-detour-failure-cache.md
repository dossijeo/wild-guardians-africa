# Reuse an unchanged failed mobile detour (20 October 2026)

Wild Engine supplies authoritative static navigation but does not expose the legacy `findPathSteps()` terrain iterator. In a nine-night Sabana/Mapungubwe/712 diagnostic, worker motion reached that unavailable fallback 7,274 times and built 13,938 local disc detours. The latter count includes successful routes and repeated failures; it is not a count of wasted searches by itself.

When the local disc graph fails and no terrain iterator exists, `prepareActorMotion()` now retains that exact failure in its existing per-actor `WeakMap`. A later query skips the same graph only while actor position, goal, blocker identities, exact blocker positions and radii, physical profile, topology revision, and native chunk-residency revision remain unchanged. A moving actor/body or newly resident sector reopens the search. The cache records no `unknown` result from the native world and does not modify route, reservation, economy or combat state.

The directed test verifies that an unchanged failure stops sampling the graph, while a moved blocker, residency change or topology change triggers another search. The 43 directed actor-motion, canyon-traffic and native-raid tests pass. No physical traffic rule or three-second collision recovery is changed; overlap remains an open issue.

The frozen 14-night Wild Engine campaign was run on source revision `984ad62f4` and production WASM SHA-256 `0d2901425c9d16fa38cdafc916680d3086c1b18f6730a0bfc584f6b1315d817d`. The only production-code difference between A and B was the exact-failure cache and residency key. Each run used a fresh Node process, the same seed 712, `good` strategy, Sabana/Mapungubwe, native intentions and wall plans, and no raid reload. The output hash is SHA-256 of the final serialized game state, computed outside `Game.tick` timing.

| Order | Variant | `Game.tick` total | Final state SHA-256 |
| --- | --- | ---: | --- |
| 1 | B: failed-detour cache | 73.196 s | `2224d0ea4889a693d5b396704b444b3dc383a44e02dd2db507d096c08741ec05` |
| 2 | A: unchanged | 89.321 s | same |
| 3 | A: unchanged | 80.586 s | same |
| 4 | B: failed-detour cache | 82.688 s | same |
| 5 | B: residency-key check | 73.864 s | same |

All five runs finished 14 nights with no result, 899 coins, 145 living crops, 1,317 deliveries and 164 mobile-recovery events. The counterbalanced first four runs give medians of 84.954 s for A and 77.942 s for B, a 7.012 s (8.25%) reduction in this shared-host sample. The ranges overlap; this is evidence of a useful candidate, not a platform-wide speed guarantee. The fifth run checks the final residency-aware key and preserves the same state hash. No RSS or GPU-memory conclusion was drawn.

Reproduce A and B in separate checkouts of the same revision, applying only the source change under review for B:

```sh
node tools/experiments/bench-worker-detour-cache.mjs 14 712
node --test tests/actor-motion.test.js tests/spatial-canyon-traffic-recovery.test.js tests/spatial-native-raid.test.js
```

The campaign timing includes the real worker and animal movement cost, and excludes the final serialization hash. It does not claim to fix the physical overlap of workers at a shared village entry or in a narrow passage.
