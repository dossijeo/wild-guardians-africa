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

## Complete working-day replay

The main-based 300-second native replays for 50, 200 and 500 crops completed: all 12 arms pass, with every serialized state identical at each of 3,000 ticks. The fixtures were previously funded explicitly for QA; the replay adds no funding or synthetic deliveries. They are not survival campaigns or player-activity measurements. `dense-full-day-abba.json.gz` retains the original report losslessly; `evidence-manifest.json` records its original hash and the preserved validation logs, including the initial failed test run.

| Crops | A (ms) | B (ms) | B (ms) | A (ms) | Native path calls A/B |
|---|---:|---:|---:|---:|---:|
| 50 | 1892.64 | 1675.66 | 1324.43 | 1386.96 | 157 / 150 |
| 200 | 5651.58 | 5650.60 | 5442.11 | 6217.47 | 323 / 275 |
| 500 | 14459.42 | 12654.06 | 12661.15 | 14219.33 | 318 / 177 |

The 500-crop run reduced aggregate tick CPU by about 11.7% using the mean of each pair. This is one contended desktop experiment, not a guaranteed gameplay/FPS gain. Smaller runs show warm-up/timing variability. Balance and plan verification also pass. No experimental campaign parameters were changed.

Final review and PR/CI acceptance remain pending. Earlier experimental-base measurements found no clear full-day benefit in the accessible 500-crop case; that neutral result remains preserved on `codex/watering-route-cache`. Neither result proves acceleration of the experimental 100-night campaign.
