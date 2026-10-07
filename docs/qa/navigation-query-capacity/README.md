# Bounded walk and segment query caches

Previously a new integer-grid query could clear every cached answer at capacity:
walk queries after 50,001 entries, segment queries at 100,000. Production now
uses the existing persistent FIFO cursor to evict one oldest entry on a miss.
Limits are exactly 50,000 and 100,000. Hits do not reorder entries, so this is
FIFO rather than LRU. Geometry rebuilds still clear both caches. Fractional
queries remain uncached; radius, ignored obstacle, worker permission and segment
direction remain part of the exact original keys. No terrain or route changes.

## Capacity experiment

`node tools/benchmark_navigation_query_capacity.mjs output.json` compares the
previous wrappers with production on native Sabana and Gran Cañón terrain.
Twelve alternating baseline/candidate pairs per case, 256 recent queries and
two cold queries. Dummy entries fill capacity **outside timing**; this creates
artificial pressure and does not prove that normal gameplay reaches capacity.
All measured misses use native terrain/obstacles. Every answer is compared with
the native uncached result. Stored true and false results both remain reusable.

| Biome / query | Previous median / P95 ms | FIFO median / P95 ms |
| --- | --- | --- |
| Sabana / walk | 4.258 / 15.144 | 0.415 / 0.772 |
| Sabana / segment | 25.515 / 81.818 | 0.482 / 0.687 |
| Gran Cañón / walk | 3.551 / 13.736 | 0.427 / 0.747 |
| Gran Cañón / segment | 23.496 / 25.090 | 0.594 / 0.912 |

Every baseline block recomputes 258 answers; every FIFO block recomputes only
the two cold answers. CPU campaigns 44164 and 49032 were active during this
sample; timing is contextual, not a GPU/FPS or heap-byte measurement. Raw
blocks and source hash are in `capacity.json`. The retained cache stays bounded.

## Gameplay compatibility

`node tools/check_query_cache_canyon.mjs` reconstructs only the previous two
capacity policies and continues a historical day-11 Gran Cañón save with native
navigation and ordinary paid hiring. Complete serialized states are equal after
each of 100 ticks of 0.1 s; 13 workers, 148 living crops, final balance 179.
Both arms execute 1,529 walk misses and 2,338 segment misses. Maximum cache sizes
1,516 / 2,177 **do not exercise overflow**. This is compatibility evidence, not
a current hundred-night replay or diagnosis of the long-running blocked queue.
Input/source/trajectory hashes and both-arm statistics are in `native.json`.

38 directed tests pass across query capacity, FIFO eviction, crop/geometry
invalidation, dynamic actors and raid query warmth. Native capacity regressions
also check true/false reuse, directed/radius/ignore/worker separation, fractional
queries and refilling after `setState`. Build passes (266 modules; existing large
bundle warning). Web package passes: 695 files, 398,302,278 bytes, 859 relative
links and 20 runtime GLBs. No mobile or rendered-farm performance claim follows.

## Regression sensitivity

`node tools/check_query_cache_capacity_regression.mjs` reconstructs just the
two old capacity policies and runs the native capacity tests against them.
Expected outcome: exit 1, two failed tests, fractional query test still passing.
The walk test first checks reuse before its final size assertion: the old policy
recomputes one recently inserted answer (257 misses versus 256), independently
of tightening the old 50,001-entry allowance. The segment policy clears the
cache and retains only five entries instead of 100,000. Both regressions pass
against production, with the fractional test also passing (3/3).
Raw positive/negative TAP logs are preserved as gzip, with hashes in
`regression-logs.json`; `regression.json` binds the generated reference/tests.
These intentional failures are diagnostic evidence, not failures in main.
