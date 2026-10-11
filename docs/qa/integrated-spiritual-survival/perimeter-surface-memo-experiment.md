# Exact terrain memo diagnostic (not integrated)

The read-only v90 perimeter profile motivates testing exact terrain-height reuse on a borrowed hypothetical-navigation view. Neither diagnostic helper is imported by gameplay or campaign code. No changes are made to live routes, collisions, topology, money, RNG or source-frozen campaigns.

The bounded cache stores at most 32,768 exact-coordinate scalar heights. It distinguishes negative zero, never quantizes coordinates and bypasses non-finite values. Changes to navigator version, field identity, surface function, river level or canyon mode clear the cache. Original own/inherited method ownership is restored in `finally`, including failure paths. Cache storage is released after the probe. Actual memory consumption remains unmeasured; the capacity is not evidence of a negligible memory cost.

Both variants pass three focused tests each for isolation, exactness, bounded eviction, invalidation, native exceptions and descriptor restoration. These tests do not prove performance or native enclosure validity.

Version one uses a fresh `Map.keys()` iterator on every eviction. Its full native probe is taking longer than the uncached reference and remains running at the time of this note. This version is retained as a negative candidate, not promoted. Version two reuses the existing FIFO eviction utility, whose documented purpose is to avoid rescanning deleted Map prefixes. Its independent native probe has not yet run. Do not infer a speedup from this change.

The independent probes preserve complete cold and warmed physical proof objects, serialized snapshot immutability and full source guards. They compare against the recorded unmodified v90 proof. Only the internal `regions` Set-identity diagnostic is excluded from semantic equality; all outputs remain stored. A mismatch throws and prevents acceptance. Timings include a CPU-profiled cold call and a subsequent warm call, so cold/warm differences are not an AB/BA optimization benchmark.

Acceptance requires the native proof to finish with matching physical conclusions, useful timing evidence and tolerable storage cost. Any successful candidate still needs repeated controlled benchmarks before integration. Live v92/v93 campaign code remains unchanged.

## Version two native result: rejected

The FIFO-cursor variant finished normally. It preserved both complete physical conclusions against the unmodified baseline and left the serialized snapshot unchanged. Its profiled cold query took 77,078.20 ms and the warm query 39,355.93 ms. Reference values were 24,717.96 and 10,536.23 ms. These observations were collected with other native processes active, not in isolated AB/BA runs, and do not quantify a general slowdown. They provide no evidence sufficient to promote the cache.

The bounded memo recorded 22,974,103 hits, 20,893,093 misses and 20,860,325 evictions, with 32,768 peak entries and no epoch invalidations. More than twenty million exact scalar misses and continuous turnover make this reuse strategy unpromising on the retained proof workload. It is rejected for integration; no further capacity increase or production change is authorized by these observations. Raw timing, full proof output, counters and CPU profile are preserved as negative evidence. Version one remains a separate live diagnostic until its own process completes.

Version one subsequently terminated normally, preserving the same physical conclusions and exact counter totals. Its profiled cold query took 277,185.11 ms and warm query 207,763.45 ms. Both variants are rejected. No diagnostic process was killed or interpreted as an economic defeat. Their source tools, raw profiles and full outputs remain preserved.
