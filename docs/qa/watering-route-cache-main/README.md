# Exact watering-route cache: main-based validation

Base: `93dff2380345a03890986a2295156642a69d4e5a`. This is a manual backport, not a merge of the experimental economic/military branch. Runtime changes are restricted to the watering-route wrapper and its cache module. The original route recipe remains unchanged.

The cache uses exact coordinates (including signed zero), body radius, crop identity/species and navigation context. It retains at most 8,192 entries and 20,000 path points per navigator. Returned paths are copied so consuming a worker path cannot corrupt a later result. Navigation epochs, replacement worlds, collision collections, query functions and terrain callbacks invalidate it. Unversioned adapters bypass caching.

## Completed checks

- Focused navigation/watering suite: 41/41 passed. The first run failed one existing test because it replaces terrain callbacks without changing the navigation epoch. The cache now observes those callback identities; the existing test was not weakened or modified.
- SFX catalogue check: 126 original files, 100 assigned, 26 unassigned; not stale.
- Web build: passed in 22.99 seconds. The existing large-bundle warning remains.
- Web package: 722 files, 445,651,286 bytes, 860 relative links and 22 runtime GLBs; passed.
- Native 30-tick AB/BA replays: every serialized tick state matches the uncached control, including RNG, finance and worker state. Two recorded Canyon scenes and two explicitly synthetic worker-enclosing collision cases are tested.
- For the enclosed first scene, total native tick CPU time was A=27,106.72 ms, B=1,373.05 ms, B=1,096.00 ms, A=28,939.67 ms. For the second enclosed scene: A=8,793.95 ms, B=469.34 ms, B=405.16 ms, A=8,616.87 ms. These are blocked-route diagnostics, not general campaign speedups or FPS measurements.
- The query microbenchmark retains identical outputs and unchanged world snapshots. Its report includes AB/BA timings, source hashes and garbage-collected cache storage probes.

Measurements ran on a shared machine with the frozen experimental campaign still running. Absolute timings include contention and are not physical mobile or GPU acceptance.

## Pending acceptance

The main-based 300-second native replays for 50, 200 and 500 crops are still running. Each arm uses 3,000 native ticks and compares every serialized state. The fixtures were previously funded explicitly for QA; the replay adds no funding or synthetic deliveries. They are not survival campaigns or player-activity measurements.

Do not claim a general healthy-farm speedup, open a completed-feature PR or merge this backport until those results and the final diff are reviewed. Earlier experimental-base measurements found no clear full-day benefit in the accessible 500-crop case; that neutral result remains preserved on `codex/watering-route-cache`.
