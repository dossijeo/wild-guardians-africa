# Production loading variant audit

Scope: codex/global-visual-lab, starting HEAD 02cb81d0d. Remove only
unnecessary preparation, retaining selected visuals, pending artistic candidates,
normal gameplay and scheduler compatibility. No merge to main.

## Initial source inventory (not a deletion list)

| Preparation | Current reason | Decision pending evidence |
| --- | --- | --- |
| Actor staging | Animal skinning and private bone textures, including restored actors | Determine reachable species/recipes; cannot remove only because absent from opening view |
| VfxGpuPreload | One representative composition for rigid particles, sprites, ribbons and depth | Gameplay destruction remains required; inspect program keys for redundant variants |
| FluidGpuPreload | Ordinary and, where used, instanced water/lava | Dry opening does not establish unused material |
| Ground cache recipe | Fixed512 material patch before world compilation | Preserve approved Mangrove cache and normal response |
| Whole world compile | Resident and hidden LOD materials | Identify dormant lab-only objects versus later gameplay LODs |
| Smooth obstruction | Streaming policy, enabled by default for Mangroves | Selected smooth transitions must remain prepared |
| Depth capture | Effects use world depth without shadows | Retain real depth recipes; no nested scheduling inside borrowed state |
| Crop depth/shadows | Dormant growth stages and fogless shadow recipe | Later growth must not trigger deferred compilation |
| Far vegetation | Background sprites, ground and mountain preparation | Full selected background must remain visible and measured |

Presence of laboratory source files/imports does not prove that their shaders
are created or compiled. Query-selected branches require runtime evidence.
The dated closure recipe is a measurement starting point, not an authoritative
manifest of every final approved setting. Cross-check newer biome decisions.

## Measurement

QA flag WG_LOADING_PROGRAM_INVENTORY=1 observes shaderSource/attachShader/
linkProgram/deleteProgram on each WebGL canvas. It records shader fingerprints,
defines, names, link stacks and timing without querying link/compile readiness.
No graphics resources or additional shader variants are created by this observer.
Call duration is synchronous CPU/driver wall time, not GPU execution time.
Inventory runs are diagnostic; final performance acceptance requires paired
uninstrumented runs plus first-play frames, active streaming and quality changes.

Initial diagnostic: Mangroves, media, 720p, frozen populated fixture, pthreads,
frame scheduler, full selected background, five seconds of post-ready frames.
Repeat inventory/validation for Sabana, Gran Río, Desierto, Volcanes, Gran Cañón
and all final quality profiles before claiming general applicability.

Pre-existing local edits in GLOBAL-DIRECTION, artwork reports, the loading
harness spatial-failure instrumentation and ground-hybrid measurement are
preserved. No production material or warmup has been removed yet.

## First Mangrove diagnostic (not an optimization result)

Initial ready time39466.050ms,90 link calls across two contexts,89 distinct
shader-source fingerprint pairs. Types: ShaderMaterial28, MeshStandard23,
MeshDepth15, RawShader10, MeshBasic10, MeshPhysical2, LineBasic1, native1.
One link occurs after world readiness: GuardianMesh.initGL on guardian-avatar,
not an unprepared world material. No world link is observed in the short
post-ready frozen window; this does not cover active play or future streaming.
The count is link invocations, not resident program count or GPU compile time.
No variant has yet been proved laboratory-only and safe to remove.

## Source audit and candidate hypotheses

BiomeGround.load selects layered Savanna, river, moss/substrate, desert, canyon
and volcanic paths by biome/query predicates; there is no eager loop compiling
all experimental terrain variants. AfricanToon inserts savannaLayerFunctions
only when uGroundLayered is nonzero. Removing its import alone is not evidence
of fewer programs or faster readiness.
Shared groundMaterialFunctions does contain the uniform-driven uGroundDebug
branch. Potential shader-source specialization must preserve QA access and all
subsequent patch anchors; count reduction is not expected from deleting that
branch alone. No change made without a controlled measurable hypothesis.
Mangrove inventory has one identical fingerprint pair (world program IDs39/74),
first in screen preload and later in an instanced compile. Check material keys,
resource disposal and actual retention before calling this an unused variant.
The fingerprints alone do not establish resource equivalence or safe removal.

Remaining five biome inventories run serially with the same diagnostic flags.
Sabana and Gran Río completed successfully; later results remain pending.
Read-only source searches occurred during inventory collection: these diagnostic
runs establish program identity/counts, not final uninstrumented speed acceptance.

## Six-biome diagnostic baseline complete

| Biome | Ready seconds | All links | World-context links | Links after ready |
| --- | ---: | ---: | ---: | ---: |
| Sabana |27.27|83|82|2|
| Gran Río |28.48|83|82|2|
| Manglares |39.47|90|89|1|
| Desierto |23.85|70|69|2|
| Volcanes |30.46|81|80|2|
| Gran Cañón |27.61|67|66|1|

Single diagnostic executions, not comparative optimization evidence. See raw
reports and baseline-summary.json for exact phases. No experimental paths were
removed while collecting these baselines.

Important acceptance finding: Sabana, Gran Río, Desierto and Volcanes already
link one world-context program after ready, in addition to the guardian's
separate context. Attribute this baseline behavior before evaluating any pruning;
do not count it as a new regression or silently exclude it from first-play timing.
Mangroves and Canyon show only the guardian link in this frozen observation.

The loading diorama explicitly sets uFineNoise=0, while normal world uses1.
Therefore a global unconditional fine-noise substitution would change selected
loading visuals. Any specialization must preserve both real recipes and QA access.

## Opt-in candidate: biome-specific historical ground source

productionGroundSource=1 removes the groundMaterialLegacy419 definition only
for savanna/grand_river/mangrove/volcanoes/canyons. Its current desert call is
required: desert source is preserved byte-for-byte. The initial claim that this
function had no runtime reference was corrected by a fail-closed source test.
The original source and all laboratory options remain available by default.

First real pilot failed: Fixed512 shader anchor changed. The cache identifies
the end of its replacement region through the desert branch. Candidate revised
to retain that branch boundary as an empty return in non-desert shaders, keeping
fixed512's insertion contract while excluding the unused historical function.
Saved UI failure evidence; stopped the already-failed browser test explicitly,
then started a fresh corrected pilot. This failure is not a throughput sample.
Three source-preservation tests pass; renderer validation and A/B/A/B remain
required. No count reduction or load-time saving is claimed.

Corrected pilot completes25chunks in34.883s with90 link calls (unchanged) and
one post-ready guardian-context link (unchanged). Capture inspected: moss,
mud patches, fern coverage, shoreline, buildings and shadows retain the selected
opening appearance. Not a pixel-equivalence or all-camera/night acceptance.
Source input shrinks from11145 to6368 characters for eligible biome materials;
this alone does not establish lower driver compile time or total loading.
A fresh A/B/A/B series now runs without the GL inventory wrappers, same frozen
Mangrove fixture, media720p, pthreads/scheduler, full background and post-ready
observation. No other source edits during the performance series.

## Mangrove A/B/A/B source-pruning result: throughput signal, acceptance pending

| Run | Ready ms | World compile phase ms | Loading P99 ms | Loading max ms | Post-ready max ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| A1 original |36522|5358|133|449|349|
| B1 pruned |35429|4618|133|416|549|
| A2 original |37206|5431|117|233|300|
| B2 pruned |35682|4978|150|416|565|

Both pairs improve total readiness (1.094s/1.524s), with a reduction in world
compilation wall time (0.740s/0.453s). These phase waits are not exclusive CPU
or GPU durations. Count remains90 in diagnostic pilots; this removes source
branches, not program instances. Post-ready maxima worsen in both B runs and
must be attributed before promotion; do not accept a loading-only win.
RGB mean absolute differences A1/B1 approximately .00130/.00136/.00182 and
A2/B2 .00197/.00207/.00266 over720p, confined to bbox around buildings/crops.
Not evidence for night, motion, all profiles or all biomes. The candidate remains
off by default; next gate is post-ready attribution and broader equivalence.

## Post-ready attribution candidate

The pruned diagnostic links no world program after readiness; the sole late
link is guardian-avatar context1. Chrome attributes704.945ms to the onload
continuation of images/860cc542...webp, with732.990ms long-animation-frame
and670.170ms blocking duration. image-runtime.json maps that image exactly to
GUARDIAN_SPRITE. Traced calls in the interval: guardian texImage2D28.055ms,
getProgramParameter7.470ms. Those two calls do not explain the full continuation;
do not label the entire705ms GPU time or shader compilation.
An identically instrumented original control is running to compare attribution.
This narrows the cause but does not yet close the post-ready regression gate.

Original-control trace reproduces the same guardian onload continuation:
868.355ms script duration,915.450ms long-animation-frame,841.795ms blocking.
Only guardian-context program links after ready, as in the pruned trace.
This supports a pre-existing guardian initialization cost, not deferred world
compilation caused by pruning. It does not prove equal tail latency statistically;
keep raw measurements and do not subtract the guardian from end-to-end timings.

The candidate is now undergoing serial media-profile inventory/capture checks
for all six biomes, including unchanged Desert. Its source remains opt-in.

## Candidate media-profile validation across six biomes

All six diagnostic loads complete25chunks. Link/post-ready counts match each
original exactly: Sabana83/2, Gran Río83/2, Mangroves90/1, Desert70/2,
Volcanoes81/2, Canyon67/1. No additional link is deferred in the observed window.
Opening captures inspected for all six across the pilot/media series: no obvious
loss of selected vegetation, ground coverage, shadowing, water/lava or buildings.
These are limited opening inspections; paired image equivalence outside Mangroves,
night, moving cameras, active world and profile changes remain unverified.
Single diagnostic readiness varies (Mangroves41.203s here), reinforcing that
isolated times must not be used as optimization acceptance. Raw data retained.
The low-quality six-biome candidate series is now running serially.

## Candidate low-profile diagnostic completion

All six loads complete with25chunks. Link/late counts: Sabana77/2, River77/2,
Mangroves83/1, Desert63/2, Volcanoes75/2, Canyon61/1. Captured console
entries are X4000 environment-variable compiler warnings; no other recorded
errors. These counts must be compared with the same low-profile original,
not the earlier media baseline. A serial original control is running with
profile-specific filenames and captures, preserving existing evidence.
No timing acceptance or visual equivalence is claimed from these single loads.
The candidate remains opt-in. See pruned-baja-validation.json and raw reports.

### First paired low-profile controls

Sabana and Gran Rio both retain 77 links in original and candidate.
RGB mean absolute differences on the 0..255 scale are respectively
[0.000964, 0.001067, 0.001368] and [0.002184, 0.002356, 0.003223].
Difference bounding boxes: (1107,467)-(1134,493) and (212,207)-(1135,494).
The Sabana pair was visually inspected: ground and grass coverage remain
unchanged to inspection. These opening captures do not validate night or motion.
The remaining original controls continue serially. A reusable comparison script
requires all six matching profile reports before emitting the final count table.

## Full low-profile control complete

All six original/candidate pairs match chunk counts, link counts, late link
counts and late contexts. Console entries also match in count and contain only
the recorded X4000 warnings. See comparison-baja-inventory.json.
Mangrove paired captures inspected: moss/mud coverage and fern masses preserved.
Opening pixel measurements for all six are in comparison-baja-pixels.json;
these do not replace night/motion/active-play validation.
Diagnostic readiness varies in both directions, including unchanged Desert
(22.575s original, 24.492s candidate). This is a useful negative control against
claiming speed from separate inventory series. A second uninstrumented
Mangrove A/B/A/B series is running under prefix manglares-pruned-repeat.
No production default is changed.

## Repeated timing series in progress

The first repeated pair completes in 38,344.790ms original versus 37,243.895ms
candidate (1,100.895ms saved). World compile phase wall time is 5,198.220ms
versus 4,795.355ms (402.865ms saved). The second pair remains running; these
are provisional results, not final acceptance. No shader defaults changed.
The reusable summary explicitly includes the final loading-frame boundary in
post-ready RAF cadence, so the handoff interval is not silently omitted.
Neither phase wall time nor RAF cadence is labelled GPU execution time.

## Repeated A/B/A/B complete; active-world gate started

Second pair also favors readiness: 36,394.110ms versus 35,593.580ms, saving
800.530ms; world compile phase saves 433.065ms. Across this repeat both pairs
save total loading time, consistent with the first series, but frame cadence
does not consistently improve. Loading P95 rises from66.485 to83.045ms and
50.075 to66.455ms. Post-ready P95 rises from116.775 to166.295ms and
100.050 to116.510ms; maxima improve in one pair and worsen in the other.
Do not present the candidate as a general smoothness improvement or subtract
previously attributed guardian initialization costs from the measurements.
See manglares-pruned-repeat-summary.json for raw-derived metrics, including
the loading-to-play boundary. Source pruning remains opt-in.
A serial active-simulation camera-travel A/B/A/B gate is now running under
manglares-pruned-active: identical180-frame/96-unit path and raid-camera lock,
with existing harness streaming instrumentation in both arms. This is an
additional validation scope, not interchangeable with frozen loading timings.

## Active original control: first run

The first original active-streaming control completed on Intel UHD / ANGLE D3D11:
10 additional chunks, all180 sampled frames with actors ready, no paused frames,
far preparation settled, and simulation advanced15.798s. No captured errors
beyond existing X4000 warnings. Frame cadence mean108.455ms, P95199.695ms,
max282.810ms; these are presentation intervals, not GPU durations.
This establishes a valid original control, not a candidate result. Camera
travel is frame-based and simulation advances in wall time; final dynamic
world states can differ. Do not treat final active screenshots as exact
image-equivalence pairs or conflate this with the frozen workload.
The complete active series is still running. Its summary will retain options,
hardware, created chunks and simulation progress alongside timing.

### Active first pair: mixed outcome

Both A1 and B1 create10chunks, settle the far background, keep actors ready
for180frames with zero pauses and record no non-X4000 errors. B1 loading
readiness is34,851.985ms versus37,352.705ms. However, presentation interval
mean increases108.455 to135.060ms and P95199.695 to216.305ms. Render CPU
mean decreases14.274 to12.666ms. This is not evidence of overall smoothness
improvement. Simulation advances15.798s versus16.843s, so active work is not
bit-identical. Await the second pair; do not promote based on loading alone.

## Active A/B/A/B complete: do not promote source pruning

All four runs create10chunks and complete the180-frame traversal. Both B runs
load sooner, but active presentation mean worsens108.455->135.060ms and
105.591->134.782ms. P95 worsens199.695->216.305ms and183.000->249.145ms.
The second-pair maximum worsens299.355->631.685ms. Render CPU means are
slightly lower in B, so the observed regression must not be labelled CPU shader
preparation or GPU execution without further attribution. Dynamic simulation
advances by different amounts; this pilot does not establish exact causality.
Nevertheless, the acceptance gate fails: there is no demonstrated loading win
without worse active-frame behavior. DO NOT ENABLE productionGroundSource
by default. Preserve the opt-in experiment and negative results. No approved
visual settings or preload recipes are removed as a result of this candidate.

The audit still has not established that ordinary loading eagerly compiles all
laboratory variants. FluidGpuPreload borrows the actual fluid material and
prepares ordinary/instanced forms needed by future wet chunks; VfxGpuPreload
uses one shared gameplay composition including its depth recipe. Removing
these merely because they are initially hidden would defer required work.
Next work should target proven redundant program preparation, not delete
these required recipes or continue promoting the failed specialization.

## Confirmed cache-key distinction for matching shader fingerprints

New original diagnostic manglares-program-keys.json observes83resident Three
programs. World programs39/74 share vertex/fragment hashes4301934e/66cf9391,
with no deletion between their creation. Their full cache keys match except
for native-partial-blend-v1 versus smooth-standby-v1. Reference counts14/25.
These correspond to createSmoothObstructionMaterial and smoothStandbyMaterial;
both replace the same coverage discard and apply the same visibility alpha.
Both effects are required. Hypothesis: safely sharing a canonical shader key
may remove a duplicate compile without removing either effect. Not implemented
or accepted yet: verify callback semantics, material state and exact shader
source equivalence before changing keys. Hash matches alone are insufficient.
Observer reads renderer.info.programs metadata only, without GPU queries.
