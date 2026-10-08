# V6: bounded private views for worker replanning

QA only. Production navigation and movement are unchanged. This builds on the V5 risk metadata guard, retaining its limitations: coarse risk classification is not a continuous proof of safe terrain/fluid boundaries.

V5 rebuilt the private navigation view on every request after a rejected landing. V6 keeps at most eight actor views, keyed by geometry version, radius, ignored obstacle and exact avoided-coordinate signature. Each view has an immutable point snapshot and bounded private caches. Large closed/search regions are discarded whole rather than truncated into invalid connectivity proofs. Native gate positions/links are shared; each usable edge still goes through the view's checks.

Results:

- Six unit cases pass: repeated failures, actor/proposed-building isolation, invalidation, eight-view LRU, bounded collections/whole-region eviction, and sharing a populated two-node gate graph.
- On the native historical farm with a constructed stationary worker targeting its confirmed invalid avoided point, 100 identical null queries invoke `findPath` 100 times in V5 and once in V6. This is an invocation count, not a timing or graph-expansion benchmark; the invalid endpoint can return early.
- The native connector that previously admitted an invalid landing is rejected once and rerouted. The constructed worker reaches its destination in 70 steps; every sampled position is valid.
- Save/restore immediately after rejection at step seven yields 63 identical complete serialized state pairs and reaches the destination. Only the constructed worker moves; the other actors and clock are frozen.
- A separate 100-tick historical farm continuation observes two new invalid worker positions with the reference and zero with V6. This does not establish full campaign acceptance.

A subsequent ABBA CPU run compares V3 Navigation/original Game with V6 Navigation/guarded Game: 100 ticks per arm, 25 warmup and 75 measured. All 400 complete state hashes are identical. Combined median reference 4.2552 ms, candidate 4.4612 ms (+4.84%). Individual arm medians R 4.5121 / C 4.5445 / C 4.3370 / R 3.8903 ms show drift. Four CPU campaigns were confirmed live before dispatch (35912/49032/41320/41304); root GPU was closed and the repair subagent avoided heavy work for the window.

There were zero guard rejections in these timing arms, so private avoidance views were not exercised. This measures ordinary-farm guard overhead versus V3, not savings from the cached failures, isolation of the view-cache change, a production baseline, GPU/phone cost or full frametime. V5's earlier +8% is a different run and must not be used to claim a direct V5/V6 speedup. Broad terrain/fluid, gate, save and populated-farm acceptance and an actual replanning cost measurement remain necessary before integration.

Additional native shoreline screening exercises seed712 terrain and original procedural props with empty structures/villages and no settlement platform. At twelve fluid transition anchors per biome, choose up to six accepted short connectors and move a constructed worker with ordinary `walkTo` at .01/.025/.1 s steps. Sabana, Gran Río, Volcanes and Gran Cañón each have 216 runs across twelve exercised anchors; Manglares has 144 runs across eight of twelve anchors (four supply no eligible connector). All 1008 runs reach the destination without a sampled invalid position. Canyon anchors are submerged and retain the native water exception. The first local pilot clustered its quota around one anchor; the final runner fixes that by assigning a per-anchor quota.

These are accepted, low-slope shoreline connectors, with no guard rejection, not proof of impermeable fluid boundaries or untested water/lava features. Several biomes sample the same native river feature. No animal, task, village terrain platform, visual feet/ripple/audio, continuous swept-path or populated-farm claim follows from this screen.

The targeted replanning ABBA uses the actual position immediately after the recorded rejection, a valid reachable destination and its exact avoided point. Both variants return the same waypoint array in all 400 stationary queries, each checked against native terrain/props/buildings and the avoided coordinate outside timing. Each arm has 25 warmup/75 measured queries. Medians: V5 7.4711, V6 0.1820, V6 0.1605, V5 8.1742 ms; combined V5 7.8163 / V6 0.1781 ms (97.72% reduction for this query). Both variants still invoke `findPath` 100 times; retained internal view caches change the work inside those calls. This is a path-query benchmark, not a 97% improvement of the game, GPU, actual moving actors or the ordinary-farm result above. Background CPU campaigns continue; no Blender or root GPU scene was active.

Compressed files preserve exact tested sources and reports; `receipt.json` records raw byte counts and SHA-256. Sources retain their original `.cache` import paths and require the V5/native project dependencies. Run `node docs/qa/worker-replan-view-cache/verify.mjs` to verify this archive.

## Native gates and moving traffic

Controlled movement fixtures use the historical Sabana/Musgum full terrain, props, buildings and navigation. Other actors and the clock are frozen; these are not full Game.tick campaign or visual acceptance tests. Original and V6 trajectories match exactly.

Fifteen legally sited gates cover five wall materials and yaws 0, pi/4, pi/2. All workers cross with native movement clearance and speed bounds. Articulated gates wait six ticks and finish in 90 steps; adobe/piedra arches finish in 84 without waiting. A full snapshot after five steps is restored with a cold navigator; subsequent worker/gate projections match for 85/79 steps. This does not assert whole-state continuation equality. An initialized avoidance point inside a native pillar exercises one private view; it is not a guard rejection produced by this run.

Five crossing-worker/retreating-animal fixtures cover warthog, hyena, buffalo, lion and rhino with native radii and production retreat speed 3.8 m/s. Both actors finish (92, 88, 91, 86, 109 steps), sampled terrain is valid, swept body separation and speed bounds pass. One initialized, confirmed terrain-invalid point exercises the worker private view; all runs have zero new guard rejections. No traffic save/restore, encounter damage, task scheduling, rendering or timing acceptance is claimed.

## Bounded adversarial fluid search

Seed712 native terrain/props, no structures/villages or settlement platform: 32 shoreline anchors per biome, six gaps, three Z offsets, six directions and lengths 0.1/0.3/1/3/6/12 m. Sabana, Gran Río, Manglares and Volcanes each consider 20,736 proposals. Among endpoint-valid proposals, 61/61/355/61 have an invalid intermediate point at the locations a straight 0.01 s walk would visit. None passes the subsequent native planner/endpoint walkability filters, so zero actual walkTo runs exercise this interior-invalid case. There is no reproduced fluid violation, but this is not proof that the adaptive guard handles every fluid boundary: all 538 candidates were rejected before movement. Scope is one seed, limited anchors/directions and sampled positions; no continuous clearance or campaign acceptance. The earlier short-length pilot found no interior-invalid proposal and was expanded rather than treated as acceptance.
