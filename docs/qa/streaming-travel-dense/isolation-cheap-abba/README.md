# Isolated far GPU preparation with inexpensive matched readiness

Native IAB contexts 838–841, order A1/B1/B2/A2. Source files are frozen from
main `68abc5b8`; the intervening `6064745a` adds historical campaign documents
only. A retains full-scene upload draws; B uses `withGpuRootIsolation` to draw
only the non-shadow-casting preparation root while retaining the actual
scene's lighting/fog/output and existing shadow texture. Synchronous visibility
and shadow flags are restored before any await.

Both arms await 34 actors, compile resident color programs, upload 27 resident
textures and prepare the observed rigid crate depth variant. They **do not**
use the full-resident geometry draw that previously added 209 MB of requested
buffers. Both first frames report exactly 25 chunks / 234 geometries / 101
texture objects / 82 programs. Resource object equality is not physical memory
proof; a paired resource audit remains necessary.

| Run | Interval p95 / max ms | Intervals >100 ms | CPU render max ms | GPU p95 ms |
| --- | --- | --- | --- | --- |
| A1 | 199.5 / 266.0 | 54 | 44.9 | 85.19 |
| B1 | 133.0 / 199.5 | 28 | 41.0 | 77.99 |
| B2 | 133.1 / 199.5 | 27 | 50.4 | 79.71 |
| A2 | 182.8 / 249.5 | 48 | 45.9 | 80.99 |

Both isolated runs have lower p95 and slow-interval counts than either control.
This supports the isolation candidate on this desktop dense-farm route without
the expensive resident geometry primer. It does not establish stable 60 FPS,
all-biome/mobile acceptance or confidence from a large sample. Many intervals
remain over 100 ms and sustained GPU cost is still high.

Each paused run travels the same 180 m in 15 seconds, creates 15 new chunks,
retains exact logical state and finishes with identical camera/target. GPU
queries resolve without disjoint events; contexts are disposed and tabs close.
No trace wrappers or buffer binding queries run during measurement. GPU
queries cover `world.render`, excluding asynchronous preparation outside it.

Three long-running CPU campaigns and a newly launched historical Etíope case
were verified live; no extra test/build ran during measured paths. Browser and
driver caches/thermal state are uncontrolled, so AB/BA does not isolate every
hardware variable. Rendering preparation and simulation do not change saves.

`receipt.json` retains source-file and raw/image hashes. The verifier checks
reported configuration/readiness, no full geometry primer, native query
coverage, exact camera/state and the recorded p95/count comparison. Next:
paired memory audit and visual/shadow/transitional regression across biomes
before enabling the isolated path in production. Endpoint images are retained,
but are not alone continuous transition acceptance.
