# Size-based logical preload pilot — experimental, OFF

The adopted terrain rectangle plus 16 m previously omitted a large baobab at the authored 200–240 m transition. `logical-size-preload=1` enables preparation outside that rectangle only for trees classified by immutable source height and procedural Y scale. Range, nearest-first budget, physical-residency exclusion and logical suppression remain unchanged; no extra terrain, collisions, gameplay or shadows are created. The flag requires logical preparation and an authored size policy. Ordinary defaults are unchanged.

## Native source 87d088ef

Sabana / Mapungubwe / media, linear-alpha baobab, mapped-average ground pilot, seam, fog 90–480 m. First orbital route paused at age 5 s around tree `0:-6:-4`, 220 m horizontal distance. The tree was GPU-prepared from the first observed transition frame: 2,585/2,585 prepared, first ready at 0.0166 s, no target transition descent. The aggregate preserves 150 descents, all classified offscreen; no potentially visible or unknown descents. Compact GPU readback verified eleven matrices, visibility values and identities exactly; GL0 and errors[]. See raw compressed reports, summary and screenshot.

This is a functional cold-route result, not a performance or final visual acceptance. The held screenshot still shows conspicuous dither and flat cyan water. The source uses approximate native-average ground lighting and an unaccepted backdrop. The report predates the explicit logicalSizePreload diagnostic field; the URL enables it and source 87d088ef establishes the implementation.

The subsequent approach reached its age-5 pause with 1,587/1,587 near-ready observations in a UI read, but editing the fixture diagnostic field triggered Vite reload before a terminal raw report was saved. That approach is incomplete evidence and must be repeated on frozen source. No GPU/CPU timings were collected; the parent was rebuilding models concurrently on CPU.

## Completed native approach — source 019e9d02

A fresh scene with the explicit diagnostic flag enabled completed the 25 s approach (5 s hold, no intermediate pause): 1,001/1,001 near observations and 1,125/1,125 transition observations prepared, first ready at 0.0333 s, no target readiness descents. The aggregate preserves 91 offscreen descents and zero potentially visible or unknown descents. State unchanged, GL0, errors[] and console logs[]. Raw report, final capture and summary are archived separately from the interrupted run. The tab was closed before any source edit. This closes the demonstrated large-tree rectangle admission delay for this single route; it does not approve all biomes, transient seam coverage, visual dither, or GPU cost. Parent CPU suite/build remained background load; no timings were measured.
