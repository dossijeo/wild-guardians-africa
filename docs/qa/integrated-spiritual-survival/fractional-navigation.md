# Exact fractional navigation cache — experimental integration only

Protected native pilots became CPU-bound after constructing their perimeters.
The immutable Sabana/Mapungubwe seed-712 partial snapshot reproduces the issue:
40 native 0.05-second ticks perform roughly 392,000 walkability calls. Integer
queries already had a cache; repeated fractional coordinates did not. Sampling
points repeatedly invoked procedural terrain, vegetation and wall-bound checks.

The candidate caches exact coordinates, radius, ignored obstacle and actor class
separately, with an 8,192-entry FIFO bound per navigation identity. It does not
round positions, change routes or reduce collision sampling. Topology epoch,
terrain identity and test implementation changes invalidate the cache. Worker
avoidance views have independent caches. Cached queries replay the original
maximum terrain-slope observation into the worker sweep accumulator.

## Paired native replay

`tools/profile-native-worker-routes.mjs INPUT.gz OUTPUT original|cached` runs
40 ticks on a deserialized copy of the original input without player decisions.
The `original` mode restores the exact pre-candidate `walkable` method from
f60e926d on the Navigation prototype, including inherited worker views. Every
run records input/runtime hashes, final serialized state, queries and timing.
Output must be fresh; the original snapshot is checked for modifications.

| Sabana run order | Original CPU total | Cached CPU total | Original tick p95 | Cached tick p95 |
|---|---:|---:|---:|---:|
| Original → cached | 13,990.51 ms | 2,565.51 ms | 409.36 ms | 83.13 ms |
| Cached → original | 15,636.71 ms | 3,692.47 ms | 455.57 ms | 143.33 ms |

All four final serialized snapshots share SHA-256
`204552fae8ec34e51a1f0a977eff5192c3890e9dddb9cd7d0854cd0490b8e40d`:
full native state, including worker poses/tasks, economy and RNG, is identical.
The paired reduction is 76–82% in this diagnostic, not a GPU or browser result.
Method timers are nested; their categories must not be added together.

Gran Cañón/Saheliana's separate partial snapshot was inexpensive at the sampled
instant: original 49.38 ms versus cached 54.87 ms total; tick p95 2.00 versus
1.33 ms. Both final snapshots share SHA-256
`a247919fa9a36580988b99277ac6c3be240d67cafb1405147c0fe0e3f01eb71e`.
This single short pair establishes state equivalence there, not a performance
improvement. Do not infer that every canyon bottleneck has been resolved.

The earlier instrumented CPU-profile diagnostic is preserved independently in
`worker-route-diagnostic-v1`; it predates final-state capture and is not included
in the paired timing table. Raw CPU profile remains local.

## Validation and limits

72 tests pass covering cache bounds, exactness, invalidation, native obstacles,
worker avoidance, route clearance, returns, reservations and agricultural power.
Build passes in 9.69 seconds. The prior capacity test deliberately required
fractional queries to be uncached; its updated assertions retain geometric
correctness while verifying exact-key reuse and topology invalidation.
Original failed test logs remain in local diagnostic files.

This is a prerequisite for practical integrated calibration, not balance
acceptance. Longer native pilots, additional seeds, defense effectiveness,
manual useful-activity measurement, visual QA and postgame expansion remain
required. No main merge and no price, damage, wage or agricultural-power change
is part of this navigation candidate.
