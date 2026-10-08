# Remaining stalls after program-only preparation

Source 2efc3245; native Gran Rio/Suajili dense archived farm, media, 180 m in
15 seconds, isolated far preparation, await all 34 actor requests, resident
color programs/bindings prepared. Trace and GL wrappers enabled; no buffer
instrumentation. One graphics context, four live CPU campaigns. This diagnostic
run cannot be compared directly with uninstrumented ABBA frametimes.

209 intervals: p95 149.6 ms, p99 199.5 ms, max 216.2 ms, 29 above 100 ms.
Render CPU max 225.6 ms. 15 new chunks, no chunk failures, logical state
unchanged, errors empty, pending GPU queries zero. Scene disposed and tab closed.
Preparation initialized 81 program bindings in 127.7 ms; it submits no hidden
geometry/texture draw and does not prove depth/shadow readiness.

The trace includes a 154.1 ms `renderBufferDirect` for `MeshDepthMaterial` on
`Prop_FruitCrate_geometry_7`, containing a 149.6 ms `getProgramInfoLog` span.
Another 194.1 ms draw uses `MeshPhysicalMaterial` named `BakedMaterial` on
`Mesh0`; an overlapping `texSubImage2D` span is 179.3 ms. These observations
identify remaining first-use depth-program/texture work, not a universal cause
for all long gaps. Many gaps have little traced CPU coverage; uncovered time
does not measure GPU time or establish scheduling causality.

Next experiments should prepare actual depth variants and relevant future prop
textures in bounded batches, preserving native material/alpha/skinning/shadow
recipes and avoiding the full-resident warmup's large buffer increase. The
current candidate remains QA-only and fails the stable-travel objective.

Run `node tools/experiments/travel-span-analysis.mjs docs/qa/streaming-travel-dense/programs-trace/closed.json.gz`
to reproduce temporal association. Nested category durations overlap; never sum
them. Raw report hash and fixture provenance are in receipt.json. The endpoint
image is not proof of transition continuity or shadow equivalence.
