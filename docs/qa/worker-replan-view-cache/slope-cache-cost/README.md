# Exact-coordinate slope cache: isolated experiment

A QA-only wrapper on the native TerrainField.slope caches exact finite x/z values in a FIFO Map limited to8192 entries. No coordinate quantization, slope thresholds or terrain changes. Cache stays within one field; this is not an integrated invalidation design. Production baseline is untouched, while candidate includes its own request/hit counters.

Historical native Sabana/Musgum dense farm,112 ordinarily paid older women. Four ABBA arms run100 ticks of0.1s each;25 warm-up and75 timed. Serialization and hashing are outside tick timing. All100 complete serialized-state hashes and worker planner/movement counters match in every arm. This is one historical scenario, not all biomes, growth boundaries, saved-state restoration or a100-night campaign.

| Arm | Mode | Median CPU ms |
|---|---|---:|
| 1 | Production | 5.6291 |
| 2 | Slope cache | 5.6530 |
| 3 | Slope cache | 4.9938 |
| 4 | Production | 4.4892 |

Combined medians 4.9536 → 5.4451ms; delta 0.4915ms (9.92%). Reference-arm drift 1.1399ms. Four historical CPU campaigns and functional GPU QA were active; possible brief Blender overlap is not ruled out. No isolation, GPU saving or general CPU benefit is claimed.

Both candidate arms receive569529 requests including warm-up,72066 hits,497463 misses,489271 FIFO evictions; final size8192. Counts cover the whole run, not just75 timed ticks. Applying this cache to the shared field also catches scatter generation. It is not promoted: benefit and scope of invalidation remain unproven. A query-local cache avoiding scatter pollution may be investigated separately, rather than increasing capacity without memory evidence.

Session49540 exited0. Input, experimental script, selected runtime sources and original report are gzip archived with SHA bindings. Runtime dependencies beyond those pieces are pinned by commit in receipt; this is a partial closure. Integrity verifier recalculates equality and medians, not timings or a replay.
