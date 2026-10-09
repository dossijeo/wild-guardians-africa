# Native zero-vertex preparation A/B — dd0f51d0

One exploratory pair in the real application, 1280×720, same source and dense
archive: day101/time360,23,894 historical plants and36 workers. A uses the
existing isolated viewport-zero recipe; B adds explicit DEV
`qa-loading-zero-vertices`. Both use `qa-loading-gpu` and
`qa-loading-gpu-gameplay`. Each has an independent temporary save copy.
Root's full CPU suite was terminal before this window; no simultaneous GPU or
heavy CPU work was authorized. Browser cache/JIT and driver variability remain;
this is not ABBA or a causal total-loading-time comparison.

| Observed GPU envelope (ms) | A | B |
|---|---:|---:|
| Far upload draw samples |30|34|
| Far median |0.631|0.000156|
| Far p95 |8.999|0.500|
| Far max |48.089|0.513|
| Cinematic p95 |58.422|69.666|
| Cinematic max |71.002|82.335|
| First native-world visible draw |57.420|46.192|
| First ordinary gameplay draw |57.179|57.047|
| Ordinary gameplay p95 (116 resolved) |67.805|71.339|

All B preparation metadata report zero triangles. A's largest preparation has
140calls/2,876,324triangles. The first identified native-world render has the
same47calls/2,676,866triangles in both arms; the preceding cinematic samples
still display the diorama/sky. Metadata describe the final renderer subpass,
not all work inside the GPU query. The first visible GPU observations do not
show a large deferred vertex-work spike in this pair. They do not prove driver
warmth across models, devices, biomes or future positive draws.

All RAF intervals are retained. Loading max133.1→166.4ms and >100ms4→3;
ordinary gameplay max332.6→249.4ms and >100ms6→3. Negative initial samples
−90.4/−82.1ms are the existing manual-owner-begin versus already-scheduled RAF
timestamp boundary, retained without modifying percentile inputs. Cinematic
tail and total frame delivery are not accepted as smooth. Four final GPU
queries remain unresolved in each closed loading/gameplay owner; no disjoint,
discarded, foreign or nested-query events were observed.

Both reach verified readiness with pending[] and36/36actor tasks completed,
zero failures. Actor CPU261.7/206.8ms and29/20yields differ, so total elapsed
changes cannot be attributed solely to zero-vertex preparation. Console
warning/error lists are empty. Each actual Save-and-return reaches the native
menu, stops the loading ambience, then closes its tab. Both temporary saves
are removed; seed156 and app157/158 tabs closed, viewport reset and final
inventory empty. Raw loading, gameplay and audio/cleanup JSON are adjacent.

**Not promoted.** Remaining gates: inverse-order/repeated comparisons, native
resource/binding equivalence, paired visual readbacks, first-positive variants
across representative groups/instancing, cancellation/context-loss/error and
repeated lifecycle. Full interactive-loading production acceptance also
remains open, including the mockup UI polish and final compatibility matrix.
