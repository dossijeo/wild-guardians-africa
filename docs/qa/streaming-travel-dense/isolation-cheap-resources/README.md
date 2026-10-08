# Cheap isolated preparation: paired buffer-resource audit

Native IAB A847/B848 run sequentially after tab846 was confirmed absent and
browser inventory empty. The control draws the native scene for far-root GPU
preparation; the candidate isolates the noncasting preparation root. Both use
the same saved Gran Río/Suajili dense farm, 34 ready worker actors, program-only
resident compilation, 27 initialized material textures and the rigid crate
shadow-program primer. Neither uses the rejected full resident geometry primer.

Both start with exactly 25 chunks, 234 geometries, 101 textures, 82 programs and
80,424,806 observed buffer bytes. On the same 15-second/180-metre route:

| Observed buffer metric | Control A | Isolated B |
| --- | ---: | ---: |
| Initial live bytes | 80,424,806 | 80,424,806 |
| Peak allocated bytes | 89,372,116 | 89,372,116 |
| Live bytes at travel completion | 68,823,874 | 68,823,874 |
| Live buffers at travel completion | 1,013 | 1,013 |
| Live bytes/buffers after world disposal | 0 / 0 | 0 / 0 |

Completion snapshots also match: 174 geometries, 104 textures, 76 programs.
Logical farm state and camera endpoints are unchanged and identical between
arms. Both close without reported errors; tabs were closed and inventory empty
before releasing the GPU window to the loading agent.

This supports **no observed buffer-footprint increase on this route**, with the
lighter readiness recipe. It does not measure physical RAM/VRAM, texture bytes,
program/driver caches or earlier allocations. The buffer probe performs binding
queries: timing fields in these raw reports must not be used for a frametime
comparison. The separate uninstrumented AB/BA evidence remains the timing test.
This pair does not by itself validate other biomes, mobile, all transitions or
shadow correctness. Production isolation remains disabled pending those checks.

Screenshots preserve the endpoint with the QA overlay. Root inspected both:
the scene composition/vegetation/ground remain consistent, with no obvious gross
defect in the visible area. This is not a temporal or complete shadow comparison.
Cumulative request totals after disposal differ because the scene keeps rendering
between travel completion and manual closure; compare the labeled completion
snapshots and peak footprint, not unrelated closure delays.

Four CPU campaign processes (41304/41320/48904/49032) were confirmed live before
the pair. Cache/thermal state was uncontrolled. Runtime files match the recorded
source; intervening `cec70ee6` added only unimported compiler candidates and tests.
The receipt hashes exact DOM report exports, screenshots and involved sources.

Run `node docs/qa/streaming-travel-dense/isolation-cheap-resources/verify.mjs`.
