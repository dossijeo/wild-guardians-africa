# Authored fluid-depth native review — 37979419199

Source `5042f9b7d62ec747a9c98c0e481bd35d96c6166e`, job113985842919. Run completed SUCCESS. Original artifact bytes, source/run/artifact metadata and SHA256 receipts are retained; `python verify.py` checks these, actual raw gates, configuration and each raster case. Watcher16911 completed exit0. No repeated dispatch or local GPU run.

All three actual raw reports have `ok:true`, `errors:[]`, genuine stageBusy false, no active diagnostic phases and no program-identity drops. The diagnostic control's PASS is established from its raw and visibility result, not normalized continue-on-error conclusion. Same EXE; control fixture712 OFF first, candidate randomized New ON second, candidate fixture712 ON last. Animal prefetch/shared ground/collective/parallel assets/readiness false throughout; pause-menu true throughout. Fixture file SHA256 `28d8bf348c61900a7f4f94a53026a86e638acbca5b058981a43de969788a6406` is identical for both fixture runs.

| Scope | Control fixture OFF | Candidate New ON | Candidate fixture ON |
| --- | ---: | ---: | ---: |
| Raw ok/errors | true/[] | true/[] | true/[] |
| Seed |712|1791574477591|712|
| First observer boundary → worldReady (ms) |63509.8|40458.7|39476.6|
| load-warm-gpu awaited parent (ms) |29799.6|12868.1|10812.1|
| warm-compile-world nested (ms) |18571.4|7294.7|3254.8|
| warm-prepare-depth nested (ms) |2978.7|1005.8|1211.7|
| load-far-assets (ms) |3972.6|2262.7|2075.0|
| Actual depth probe |not enabled|28/28 pass|28/28 pass|
| Native visibility |pass|not this scope|pass|

These intervals are awaited wall times, not exclusive CPU/GPU. Parent/child phases must not be summed. The first observer boundary is reported explicitly, not an exact trusted command-to-ready clock. worldReadyAt61.397/61.879/91.313 seconds is page-origin time, not load duration. Final productionLoading elapsed386172.3/362781.2ms and maxRAF310281.3ms in fixture reports INCLUDE the real hidden interval; they are not loading or responsiveness metrics. New final elapsed43097.6ms also includes post-ready probe/observation. No causal timing benefit is established: the control ALSO passed, order/cache/request waits/seed/runner variability remain, and pause-menu was constant rather than independently accepted. Prior90s failures remain untouched.

## Native raster depth evidence

Both ON reports contain28 cases (56 total) of actual private16×16 depth attachment read through an explicit Three RGBA packing pass, using the prepared World renderer. Every case has256pixels, zero mismatches, maximum depth delta0 and tolerance2/16777216. Fallback stats show1fallback/0specialized and candidate1specialized. Program IDs/cache keys identify full water or lava physical fallback and `world-standard-depth-v1|painted-fluid-clip` independently. These are offscreen variants, not screen-program identity or GPU timing proof.

Water and lava each include plain disabled/inside/outside/moved bounds; instanced/batched/morph/skinned/displacement inside/outside. Plain occupied pixels121disabled,36inside,85outside,30moved; inside+outside equals disabled coverage. All include clear and occupied samples, avoiding vacuous equality. Source tests separately establish exact half-open discard, transform order and closure-owned live uniforms. Unknown hooks remain fallback.

No explicit native resource-disposal or renderer-state counter is exposed by this report. Successful probe return means its restoration/disposal finally did not throw; exact one-owner depth texture disposal and renderer restoration are source + CPU-contract evidence, NOT native0resource counters or physicalRAM/VRAM measurement. The following genuine world/minimize/restore continued successfully. PNG is original New screenshot, not a depth visualization or six-biome approval. No screenshot was overwritten. The initial archive verifier incorrectly expected the water cache name for lava; it now checks the actual separate lava recipe, with native raw unchanged.

## Original native visibility

Control hidden300901.8ms, candidate hidden300485.9ms; original requested300000ms unchanged. Both `visibility.passed:true`, complete hiddenStart/hiddenEnd simulation fields exactly equal, visibleMenuPauses=['menu'], and resumed simulation advances1.3seconds. These retain original excluded save timestamp/notices/tutorial presentation scope; no document.hidden override. Both use ANGLE Microsoft Basic Render DriverD3D11 with parallel shader compile available and contextLostfalse. Environment identity does not prove why earlier timeouts occurred.

## Proposed minimal production extraction — NOT APPLIED

`production-extraction-proposed.patch` is a concrete three-runtime-file proposal against main1df3e952; `production-extraction-source.json` records the base. No production change/PR/dispatch follows from this archive.

1. AfricanToon imports the authored recorder, captures initial stock hook, and registers ONLY its own final painted water/lava hook unconditionally. This would replace today's smoke flag condition with normal authored depth eligibility; screen/shadow hooks/source/custom keys are unchanged.
2. depth-recipes retains private actual hook identity + closure-owned fluid uniform objects. Replacing hook invalidates eligibility; cloned/forged userData cannot grant authority.
3. standard-depth adds the exact transformed→batch→instance→model coverage coordinates and original disabled/inside/outside half-open discard to stock MeshDepthMaterial. Existing source-specific cache/dispose listener, conservative side/depth/alpha/displacement/UV/skinning/morph eligibility and live bindings remain.

Do NOT extract scene.js, Rust CLI, workflow, smoke flags/probe/diagnostic modules, shared-ground, animal-prefetch, parallel/union/pacing changes. No new render target/pass in production; capture remains the existing depth route. Tests for the proposed extraction must change default/OFF assertions to expect authored water/lava eligibility without globals, while retaining unknown-hook/clone/missingbindings/stockproperties/liveuploads/disposal/restoration tests. Native56case raster is evidence for this exact recipe, not general readiness speed. Root must review this raw and proposal before any extraction/promotion; production original gates must still pass on the eventual clean main-base build.
