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

Three r180's native shadow traversal calls `renderBufferDirect` with a null
scene (no fog/environment) after resolving custom depth, alpha/clipping and
shadow-side rules. Compiling a guessed depth material against the color scene
does not establish a matching shadow variant. The trace fixture now records
actual renderer program IDs/names/cache keys at readiness, immediately before
travel and after each travel render. This distinguishes newly observed programs
from those prepared before movement, without reading GL bindings or forcing
reflection in the trace collector. It is diagnostic instrumentation only;
native QA and cache-key comparison remain required before using it as evidence.

Run `node tools/experiments/travel-span-analysis.mjs docs/qa/streaming-travel-dense/programs-trace/closed.json.gz`
to reproduce temporal association. Nested category durations overlap; never sum
them. Raw report hash and fixture provenance are in receipt.json. The endpoint
image is not proof of transition continuity or shadow equivalence.

## Next isolated experiment

The traveling fixture now accepts `residentTextures`. It scans actual resident
materials (including hidden worker tools), shared map properties and direct/
array texture uniforms, deduplicates texture identities and skips render-target
textures. `renderer.initTexture` runs once per yielded frame without drawing or
uploading geometry. The report records each call duration and a separate buffer
resource stage; texture ownership remains with the native world. Three tests
cover shared/hidden maps, render-target exclusion, ordering and cancellation.

Completion now waits for the native GPU fence after the last upload. The next
travel measurement must not accidentally absorb work still queued by texture
preparation. Fence/context failure propagates instead of reporting readiness;
four directed tests cover that boundary as well. This still does not eliminate
the possible blocking cost of an individual upload during preparation.

This does not divide one large upload into smaller operations, compile shadow
programs, measure physical VRAM or prepare textures from future objects that do
not yet exist. Compare native traveling and texture/resource counts before
considering any production integration. The experiment has no production caller.

## Texture-prepared diagnostic run

Native tab 829/source 3f3ace67 adds residentTextures to the same dense 180 m route
and traced program-only configuration. 231 intervals: p95 132.9 ms, p99 166.2 ms,
maximum 166.5 ms, 31 above 100 ms. State unchanged, errors empty, scene disposed
and tab closed. This is one diagnostic run, not a paired ABBA improvement claim.

No `texSubImage2D` call above the trace's 2 ms threshold was recorded during
travel. A remaining 104.1 ms draw of `Prop_FruitCrate_geometry_7` uses native
MeshDepthMaterial and contains 99.5 ms getProgramInfoLog. Program events record
81 variants at readiness and exactly one additional native depth cache key
during travel. Preparing resident color programs/textures still leaves that
shadow variant unprepared and does not meet the stable-travel objective.

The resource run is separately archived under resident-resources; it must not
be used for frametime comparison. Raw traced data and endpoint image are stored
as textures-closed.json.gz/textures-final.jpg with a receipt hash. No candidate
has been activated in production.

## Rigid crate depth-program hypothesis

The QA fixture accepts `crateShadow` to compile the observed rigid crate's
plain directional-depth variant without a draw. It borrows the actual geometry
and existing native shadow target, uses RGBADepthPacking, native side/map rules,
an empty fog/environment scene and matching visible-light types. The renderer
target, viewport and scissor are restored synchronously before awaiting compile.
The material remains owned until scene cleanup so its cached program is retained.

This is restricted to `Prop_FruitCrate_geometry_7`: skinning, instancing, morphs,
custom depth, alpha test/coverage, clipping and displacement are rejected rather
than pretending to warm their native recipes. No production material changes or
geometry uploads are requested. Four tests cover restoration, borrowed ownership,
unsupported recipes, shader failure and cancellation. Native cache-key matching,
buffer accounting, visual regression and ABBA remain open; compiling a plausible
recipe alone does not establish actual shadow readiness or performance benefit.

Native run e70c7d08/tab 831 confirms the exact cache key that first appeared in
the texture-only run is already present at readiness. 82 ready programs, zero
new programs during the 180 m route; no traced call exceeds 20.4 ms. The crate
preparation takes 32.9 ms in this diagnostic run. The endpoint image was inspected
without an obvious rendering defect, but this is not multivista/shadow regression.

216 intervals: p95 133 ms, p99/max 166.3 ms, 33 above 100 ms. Global stability
has not improved convincingly: slow delivery persists after the first-use shader
work is removed. No production activation. Logical state/camera/farm match the
texture-only run, queries pending zero, errors empty, disposed/tab closed.
`verify-crate.mjs` reproduces hashes, the exact cache-key comparison and recorded
metrics; full buffer audit and uninstrumented ABBA remain required.
### Scope of the remaining long intervals (crate trace 831)

`node docs/qa/streaming-travel-dense/programs-trace/analyze-crate-budget.mjs`
revalidates the archived raw hash and computes separate CPU/GPU/interval
summaries without adding nested trace durations. CPU world render p50/p95/max
was 29.5/37.4/43.8 ms; GPU query p50/p95/max was 58.22/83.36/110.11 ms.
Fifteen chunk installations had median 3.8 ms and maximum 8.1 ms.

Of the 33 RAF intervals over 100 ms, 13 preceded the first new chunk installation
and 32 had no temporal overlap with a measured chunk-install span. This does
not exclude deferred upload/render cost, asynchronous far preparation, worker
contention or scheduling. It does rule out attributing every long interval to
the measured synchronous installation call. GPU queries cover `world.render`,
not all asynchronous work; CPU, GPU and RAF scopes overlap and their summaries
must not be subtracted to infer idle time. Four CPU campaigns were live during
this instrumented run. A fresh uninstrumented AB/BA remains necessary.
