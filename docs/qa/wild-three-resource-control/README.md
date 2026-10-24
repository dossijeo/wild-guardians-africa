# Wild Three.js: investigation, not adopted

Branch `codex/wild-three-resource-control`, base `02cb81d0d` of global-visual-lab.
Normal game dependency stays Three0.180.0. No WebGPU migration, main merge or PR159
change. Sparse worktree avoids duplicating the multi-gigabyte QA archive. Sources
and fixtures outside this checkout are read-only inputs, not silently copied state.

## Evidence and new hypothesis

Read GLOBAL-FRAME-SCHEDULER.md from the base and local r180 implementation. Relevant
observations: lion initial bitmap upload119.5ms, rhino52.3ms, hyena normal50.7ms.
These are synchronous WebGL invocation wall durations, NOT GPU busy time. There
were115initial uploads/113sources and zero duplicate texture objects: source
sharing is already effective; a dedup manager has no demonstrated benefit.

Prior RGBA worker conversion preserved opaque lion mip bytes but failed adversarial
alpha (7934changed channels). Raw/interop stripes were technically fast in isolation,
but complete loading ABAB did not consistently improve. Public copyTextureToTexture
hit90.455/96.845ms getParameter waits for UNPACK_ROW_LENGTH/IMAGE_HEIGHT. Repeating
that path with different stripe counts is not a new hypothesis.

New hypothesis: copy regions from the actual ImageBitmap directly, avoiding canvas
pixel conversion entirely, then (only if necessary) expose internal region uploads
without per-unit synchronous state queries or mipmap regeneration. First establish
correctness/cost with stock APIs. Compare same resolutions and formats; alpha and
sRGB/mips must match before any real-resource replacement. Do not adopt just because
a region call is short.

## r180 source audit

Exact source hashes in upstream-r180.json. initTexture calls WebGLTextures upload
synchronously. Public Source.dataReady=false supports allocation without data; it
is not an atomic live-update transaction. WebGLTextures owns Source+parameter-key
sharing, usedTimes and disposal. Texture.version and Source.version are distinct.
Changing generateMipmaps changes the texture cache key; toggling it around stripes
can reallocate storage and is unsafe as a staging technique.

copyTextureToTexture already has a DOM-image region overload, but reads five unpack
parameters with getParameter, restores them and generates mipmaps for level0 on
each call. DataTexture.updateRanges is supported but only RGBA; it also reads unpack
state and does not remove CPU image conversion or provide atomic publication.
initRenderTarget allocates target resources, not a general texture transaction.

compileAsync submits via compile, then polls current material programs using
KHR_parallel_shader_compile; no-extension readiness is immediate after a delay,
NOT proof of completed GPU work. WebGLProgram first use still performs diagnostics
and uniform/attribute reflection. Existing program-bindings and retention helpers
already use internals: a small stable API might improve ownership, but cannot itself
make a driver call preemptible. Preserving program keys/refcounts is mandatory.
WebGLProperties uses a WeakMap reset on context recreation; handles cannot survive
an epoch. WebGLState tracks bindings, but copy reads unpack state from the driver.
Texture patch P1 is below; deeper buffer/target audits and program lifecycle validation remain pending.

## Prior alternatives and gates

WebGPU DECISION.md on codex/webgpu-renderer-evaluation: retainWebGL2.56blocks with
actual IntelUHD; complex scene CPU2.657–3.592ms legacy vs11.062–11.903ms WebGPU,
RAF53.951–60.324vs61.617–69.193ms. GPU intervals are not equivalent busy-time
measurements. Reusing that conclusion; no rerun/migration here.

Fork gate: patch only measured resource operations; no renderer rewrite. Versioned
patch, exact upstream hashes, generated isolated copy, stock revert option. No
node_modules edits. No second scheduler. Three retains creation/sharing/deletion.
Explicit exclusions must fail safely (compressed formats, render targets, shared
live sources) rather than silently corrupting data. Context loss/cancellation and
all-resource lifecycle tests precede adoption. A/B/A/B full-game load/streaming
plus real lion/rhino/hyena/sky resources and shader first-use validation remain open.

## Inherited correctness issue

Latest scheduler streaming B2 failed SpatialChunkUnavailable at simulation161.68s.
Separate diagnostic confirms worker90.68,-6.11 in chunk2,0, but resident/desired
rectangle3..7,-1..3. Both endpoint neighborhoods unknown. Reports remain in the
scheduler worktree; no exception suppression or timing-result acceptance here.
This is not caused by WildThree (no patch exists). Real active-stream acceptance
must account for this unresolved world-residency issue, not label failures as wins.


## Prototype P1: small patch, not accepted

`tools/wild-three/r180-resource-control.patch`: three upstream files,58added/
39removed lines (19net). WebGLState mirrors five unpack parameters, lazily reading
unknown initial external state; resetState explicitly resets these to WebGL2
zero defaults. WebGLTextures and WebGLRenderer route their pixelStore calls through
that mirror. Raw GL users must return ownership through renderer.resetState.
Direct external changes without reset are unsupported, as with other cached state.

The sole public extension is the seventh optional argument to
copyTextureToTexture: `{generateMipmaps:false}` suppresses generation for that
copy, without changing Texture.generateMipmaps or its resource cache key. Default
behavior stays true. Final copy uses true. No new scheduler, texture allocator,
resource registry or program implementation. Three owns allocation,sharing and
release; Source.dataReady allocation remains the original public API.

Preparation: `python tools/wild-three/prepare.py` verifies exact r180hashes,
generates ignored stock/patched src copies, applies the versioned patch with
`git apply --check`. node_modules is never modified. Source MITlicense copied.
Vite experiment config selects WG_THREE_VARIANT=official|stock|patched; cache dirs
are separate. WG_ASSET_ROOT points to an existing public directory read-only.
Normal vite config/package dependency/lockfile remain unchanged. Upgrade requires
new upstream hashes, manual patch review and all correctness/performance tests;
never automatically apply across versions. Revert experiment with variant=stock.

Initial probes used source GLBs, NOT shipped aliases (source lion roughness4096,
runtime2048). Preserve those reports as feasibility only, not production timings.
First run exit1 was favicon404; retained. Fixed explicit data favicon and reran:
no errors. Added alpha128x128 to exercise two actual regions, not a single copy.

Runtime probe uses assetUrl/meshopt and NativeSky.load, keeping shipped dimensions,
colors, filters and decode behavior. Patched runtime report has nine animal maps,
two sky panoramas,two environment maps and alpha control: four full/region trials
each,all mip bytes identical,GLerror0,texture count returns to baseline. This is
readback correctness, not screenshot/performance acceptance. Source probes show
statequeries160/320→0 andmips33/65→2 (allocation plusfinal), but explicitRAFperrow
still costs~0.52–1.06s: that pacing is deliberately NOT used for real game loading.

Important attribution correction: historical4096x2048 uAtlas belongs to VFX,
not NativeSky (which uses uPanorama and prepared DataTextures). Sky panorama
initialization in this isolated probe is~0.75–1.06ms; forcing it through rows is
not justified. The actual slowVFXatlas still needs separate identity/validation.

QA initial loading integration `loading-regions.js` uses existing global scheduler,
selects only lion/rhino/hyena RGBA8 ImageBitmaps and keeps unchanged Source/Texture
ownership. No pixel arrays or privateGLrecords; world loading barrier prevents
partial publication. Skies/small/data/compressed resources use original path.
This is NOT yet a generic live-update/cancellation/context-restoration API. Full
loading ABAB, shader experiment, active streaming and lifecycle acceptance pending.

## Isolated dependency setup and first game smoke

Install pinned tools without changing the game dependency:
`npm install --prefix tools/wild-three --no-save --package-lock=false --ignore-scripts vite@6.4.3 three@0.180.0 playwright@1.64.1`
Then run prepare.py and `node tools/wild-three/node_modules/vite/bin/vite.js --config tools/wild-three/vite.config.js --host 127.0.0.1 --port 5197`.
Source hashes match the independent npm install. The existing root node_modules
junction remains untouched; experiment dependencies and aliases are local.

First successful world initialization (loading-regions-smoke-2.json) is NOT an
accepted benchmark: harness exited1 on a multiple-Three warning. All25chunks
loaded with pthreads and all9 selected textures completed without fallback,
but297units took303.48ms synchronous total and a unit reached115.68ms.
One texture took16.41seconds elapsed despite~34ms upload work. This falsifies
any assumption that region upload alone solves loading latency. Conservative
row cost after driver outliers can delay following cheap rows; investigate with
paired controls, without calling those delays GPU time or claiming improvement.
The initial environment failure report is retained separately.

## Program and buffer decision boundary

The documented848ms ground wait came from a fixed512 recipe installed after
warm compilation. Existing groundCachePreparation prepares that recipe before
compileAsync; its pilot reduced first draw897.8 to78.44ms. This is ordering,
not a missing compile API. Repeating it as a fork would misattribute the gain.
Transactional retention already reduced intermediate destroys2 to0 but did
not consistently improve quality transitions; last-step maxima worsened.
An internal lease API could improve encapsulation, but has no established
additional throughput hypothesis. Do not implement a second retention system.

WebGLAttributes already batches updateRanges and owns buffer lifetime. Initial
bufferData remains atomic, but attribution measured only1.225ms creation against
875.79ms diagnostics. No buffer patch is justified by this evidence. Render
targets use setupRenderTarget/initRenderTarget and the same texture/state owner.

Stock compileAsync polls currentProgram per material; double-sided transparent
variants and shadow recipes require appropriately configured preparation.
Reflection remains synchronous after KHR completion; a patch cannot preempt
driver calls. The existing validated-binding adapter preserves link-failure
diagnostics while suppressing success logs locally. Future program patches
must beat those controls, not an unprepared first render.
