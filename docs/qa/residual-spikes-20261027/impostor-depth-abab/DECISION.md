# Do not adopt authored impostor depth candidate

ABAB invariant comparator passed: same source hashes, repeated injected harness hashes, same runtime/hardware/URL, 240 advancing frames and 15 chunks each, no final stream failures.

|Metric|A1|B1|A2|B2|
|---|---:|---:|---:|---:|
|CPU max ms|45.895|237.440|60.910|66.080|
|Callback P99 ms|133.180|182.950|149.745|166.260|
|Settled seconds|12.035|16.728|16.685|19.586|

No repeatable end-to-end benefit. First candidate logged 113.19/178.01/218.16 ms waits for the same far-ground seam-v2 cache key; no equivalent slow call in this pair's baseline. Do not infer the candidate caused those driver waits or that its shader itself is slow. The experiment fails adoption criteria regardless.

Depth equivalence established only in the earlier two captures. Keep isolated helper and route gated off by default. No production change to revert. Next useful investigation is lifetime/recreation of identical far-ground seam program keys; measure program identity/disposal and preparation ownership rather than repeat another global warm-up.
