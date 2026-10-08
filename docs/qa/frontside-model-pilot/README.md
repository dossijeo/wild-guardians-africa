# FrontSide model pilot — acceptance criteria declared before candidates

Status: investigation only. No source asset or default rendering path is changed.
Base: main 71c0fb13. The pilot covers all five maize and banana states and the
youngMale complete action library. These exercise narrow/large leaf surfaces,
region bridges, a skinned body and all task accessories. They do not constitute
acceptance of other crop species or worker profiles.

## Actual representations and preserved contracts

`scene.js` resolves the crop GLB through `assets.js` / `asset-url.js` to the
lossless Meshopt web variant, then renders `crop-batch.js`. Forty indexed source
meshes feed 32 unindexed procedural bridges. `crop-bridges.json` stores vertex
counts, face labels and regional drivers. Face index/order and vertex identity
are semantic data. Crop growth/bridge shaders and their custom depth shaders
must be used in comparisons; Blender renders cannot establish runtime parity.

Workers load `worker-actions.json`, not the four-clip donor GLBs in models.json.
Every profile contains one skin and twelve task clips. Bone IDs, weights,
inverse bind matrices, channel times/values, node hierarchy, UVs, images and
material settings must be retained. Watering emitters bind to the library hash;
registration/export and regeneration of that contract require verification.
Source hashes are recorded in source-audit.json. Originals stay untouched.
`compress_web_assets.mjs` preserves accessor bytes without reordering. A repair
must generate its own candidate URL/manifest; the stock mass compressor must
not run on the production tree as an experiment.

## Quantitative visual gate (all conditions, every sample)

Capture at 1024×1024 with identical camera/renderer state and lossless RGBA.
Use 16 azimuths at elevations 5°, 25°, 55°, 85° and -15° (interior/accessory
inspection). Include orthographic silhouettes and game-perspective views.
Render five crop endpoints plus each transition at 0, .25, .5, .75, 1, with
wind phases 0, 1, 2. For workers include all twelve clips at 0, .25, .5, .75
of duration and the end frame; run tool visibility and fixed-pose logic.
Render day, dawn and night using actual material registry/native shadow hooks,
ground and light settings; cover the six biomes and four culture surroundings
before category acceptance. Pilot isolated views do not replace world views.

* Binary foreground alpha IoU ≥ .9995; missing foreground ≤ .025% of original
  foreground, newly exposed foreground ≤ .05%. Exclude neither interiors nor
  dark regions. Max silhouette Hausdorff distance ≤ 1 pixel.
* No new connected missing region larger than 4 pixels, and none with diameter
  over 2 pixels. Regions are tested at native resolution before global averages.
* Linear RGB MAE ≤ .002 on union foreground, 99th-percentile absolute channel
  error ≤ .015. No 16×16 occupied tile MAE > .01. Flag every connected error
  region above .03; any such region larger than 16 pixels requires local review
  and fails automated approval. Global PSNR is supplementary only.
* Normal, roughness, metalness, base-color and UV diagnostic passes must retain
  their sampled maps: existing front-face UV/attributes bit-exact; original
  normals unchanged except specifically documented local corrections. No
  flipped normal outlier may be hidden by silhouette equivalence.
* Shadow mask IoU ≥ .999; per-light shadow difference area ≤ .1% of original
  shadow. Inspect contact shadows, customDepth and shadowSide independently.
  Depth visible-surface difference ≤ 0.1 mm or 0.01% of height, whichever larger.

The 1px/very small region allowance covers rasterization at new closure edges,
not disappearing leaf undersides or garments. Any persistent visible hole or
wrong lighting fails even if averages pass. Comparisons run three repeated
unchanged-original captures first; repeat noise must be below one fifth of each
threshold. Never loosen thresholds to accommodate a candidate.

## Geometry and resource budgets

No blanket reversed-face duplication. Resolve genuinely two-sided thin surfaces
locally only after inspection; a volume/closure must preserve silhouette and
deformation. Boundary/manifold statistics diagnose issues, but deliberate open
surfaces are not automatically defects and closedness alone is not approval.
No new self-intersections, winding conflicts or degenerate faces. Document every
remaining boundary and its visibility/pose implications. Skinned seams cannot
be welded across different weights. Crop bridging requires explicit updated
face/driver provenance if topology changes.

Per pilot category: triangles and decoded geometry bytes ≤ 110% of original,
runtime asset bytes ≤ 110%; peak measured GPU memory ≤ 105%. A local mesh may
exceed 110% only when its category budget still passes and a visible benefit is
documented. Existing UVs/skin/animations/morph channels are bit-exact. Shadow
draws and separate-pass costs are included, not hidden in a main-pass count.

## GPU gate declared before measured windows

Coordinate with root and far agent; freeze CPU campaigns 49032/39340 and report
whether far suite 58872 is still active. No own Blender/build/test work or other
browser scene during timings. EXT_disjoint_timer_query_webgl2 is required;
discard disjoint samples and report renderer/GPU/browser/device resolution.
Warm 120 frames, collect 300 frames per side, run six alternating AB/BA pairs
for dense crops and animated workers separately. Match visible counts, poses,
camera, lighting, shadows, drawing-buffer pixels and all quality settings.
Compare full renderer GPU time (including shadows) and pass-level times; CPU
FPS is not a substitute. Report every sample and bootstrapped paired 95% CI.

Require ≥ 5% median full-renderer GPU reduction AND ≥ .20 ms reduction in the
target-heavy scene, lower 95% CI > 0, p95 no regression > 2%/.10 ms (both).
Five percent plus .20ms protects against timer noise and negligible engineering
benefit; full renderer improvement ensures vertex work/closure/shadow overhead
does not erase culling savings. Typical mixed-world scenes must have no >2%
median regression. These are minimum thresholds, not evidence that culling will
win. Without valid GPU timing or visual gate, no asset promotion or approval.

## Reproduction so far

`python tools/frontside_model_pilot.py` audits 140 primitives in the five source
GLBs and checks all forty bridge cardinalities. NumPy 2.1.1 / Python 3.12.
Welding tolerance 1e-5 is diagnostic and never modifies source data.
`python tools/frontside_blender_setup.py` retrieves a SHA256-verified portable
Blender 4.5.9 into this worktree's ignored `.cache`; system/PATH unchanged.
No Blender installation was found in PATH, Program Files, Local/Programs,
Downloads, Desktop source folders, tools, WinGet packages or .codex.

Initial totals: crops 107109 triangles / 3613 boundary edges / 5016 quantized
non-manifold edges / 282 inconsistent edges / 0 opposed geometric-normal
triangles. Worker body/accessory totals and all source hashes are in the JSON.
Counts do not distinguish botanical intersections from repairable defects yet.
No multiview real-shader comparison, candidate approval or GPU result exists.

## Pilot evidence after contract audit (not approved)

Blender inspections use scratch meshes carrying source vertex/face identifiers.
A seam-weld/recalculate proposal changed 99 maize and 347 banana face windings,
despite zero originally opposed geometric normals. The worker proposal also
removed four faces when welding. These are diagnostic proposals, not exports.
The 512px offline multiview rejection screen rejects all three winding-only
pilots. Compact caps cannot solve the broad thin botanical surfaces.

A separate runtime visibility selector runs the actual crop growth/bridge vertex
shader and worker fixed poses/tool visibility. It selects only source faces that
produce visible back-facing fragments. Three Material.clone drops onBeforeCompile;
the incorrect first pass was discarded, and the saved pass explicitly retains
the original vertex hook. The 256px selection is training evidence, not sufficient
resolution or withheld visual evidence for approval.

The controlled writer appends private reverse vertices/faces to selected source
faces, retaining original indices and all original attributes in their exact
order. UV, joints, weights and morph data are copied from the corresponding
source vertices. Crop appended faces retain their source regional driver labels.
Original nodes, skins, materials, images and all twelve worker clips remain.
The WebP image payloads are reused from the runtime originals; Meshopt lanes
encode/decode exactly. Packing prunes only unreferenced accessors/views, including
old replaced geometry records. It does not remove any accessory node or clip.
Worker contract verification preserves all 25 meshes, 62 nodes, skin and twelve
animation clips (440056 animation bytes), including watering/carry attachments.
The originals and their watering source hashes remain unchanged.

YoungMale selective pilot adds 1411/41927 triangles (3.365%) and 7.578% decoded
active geometry. Packed asset is 5313604 versus 5612688 bytes (-5.329%); some of
that reduction is unused-record pruning, and is not a GPU gain claim. Candidate
SHA256 after reverse TBN correction is
`60a859addeca513c2c80ba4c3698aa50a6f9087554532e95cbc6414d61e87a36`.

Crop selection includes source faces exposed during both indexed growth states
and unindexed procedural bridges. The ten maize/banana source pilots add 29.195%
triangles, although the whole forty-state GLB active geometry grows 7.290% and
its packed asset grows 3.243%. The 10% triangle gate is a proposed engineering
screen, not a user prohibition or proof of disproportionate GPU cost. Each
additional bridge triangle expands to three unindexed vertices with 22 float
lanes (264 bytes before instance data); the inherited driver influences adjacent
bridges, so source GLB growth understates transition buffer and vertex work.
This makes the current union selection worth revising before exhaustive QA.
Bridge allocations and measured GPU time are still required to justify that
budget and to evaluate state-specific geometric alternatives. The category is
not declared impossible and no threshold is relaxed to accept the pilot.

An isolated 1024px actual AfricanToon/NativeSky/native-shadow worker screen uses
held-out Idle fraction .125, azimuth22.5/elevation25 in day sabana. FrontSide and
DoubleSide selective candidates both retain exact alpha silhouette in this case.
Without shadows, linear RGB MAE is .00000472/.00000326 and tile MAE
.001124/.000482 respectively: limited color screens only. With shadows enabled,
both sides fail P99 (.03137) and tile MAE (.03702). DoubleSide shadow control also
changes 57 packed-shadow bytes, whereas repeated unchanged-source color differs
in zero bytes. This isolates a shadow-path issue; it does not yet establish
whether candidate coplanar geometry or the comparison harness causes it. The
next control uses two independent original loads sharing one persistent native
shadow hook, light and target. No GPU benchmark has been run. ColorFront with
shadowDouble does not satisfy the full FrontSide shadow gate.

All candidates are under ignored `.cache/frontside-model-pilot/candidates`, with
NOT-APPROVED names. No asset manifest/runtime activation or mass adaptation has
occurred. `tools/frontside_pilot_server.mjs` serves only fixed candidate/report
routes on loopback. Browser comparisons use CUA; offline scripts use Blender,
Python and lossless Meshopt packing. Reports retain failed cases and controls.

Shared-hook controls now establish that two independently loaded originals
produce identical color and packed-shadow maps. The DoubleSide selective
candidate retains the same shadow rejection with that persistent hook. A
further diagnostic can constrain the candidate's shadow draw range to original
indices, retaining added reverse geometry in the color pass, to isolate the
added coplanar faces. This is a diagnosis, not an approved shadow adaptation.
Packed bytes are now unpacked using r180's exact factors before reporting world
depth deltas: byte carries can make max byte difference misleading. Connected
RGB error regions and contour/interior missing components are also reported.

`python tools/frontside_crop_resource_audit.py` counts actual eager allocations
from crop-batch's 22 float32 bridge lanes and 128 instance slots. For the two
pilot species, indexed states, eight bridges and instance payloads grow from
12006492 to15575586 bytes (+29.726%). The full eight-species buffers grow from
52688374 to56257468 bytes (+6.774%); using that denominator alone would conceal
the local pilot transition cost. This is buffer payload estimation, not measured
GPU residency or frame time. The proposed 10% screen limits additional botanical
vertex/storage work while seeking a measured full-renderer improvement of at
least 5%/.20ms. Pair-specific reverse selection rather than the current union
across states/bridges is an alternative to investigate before abandoning repair.

Correction to worker interpretation: the source worker body BakedMaterial omits
GLB doubleSided and already loads FrontSide. Assets.model and WorldScene.actor do
not change that side; AfricanToon also preserves it. Its default depth side is
BackSide in r180. The earlier whole-worker candidate and shadowDouble controls
changed that existing contract, so their shadow rejection cannot be used to
reject an otherwise correct accessory-only adaptation. The original-index
shadow diagnostic reproduced the difference despite excluding appended faces;
its 23 changed texels had up to .471m packed-depth difference, consistent with
changing which side of the existing body shell casts shadows.

The corrected writer skips every worker primitive whose source material already
uses FrontSide. It retains body geometry and default shadow side exactly. Only
originally DoubleSide accessories are adapted. YoungMale now adds 280/41927
triangles (.668%) and .725% active geometry; packed candidate is5226192 bytes,
SHA25659abdfcb1a06c9b4613839806dd6103c5a72cf0a74dc448cea5043f34928485e.
All 25 meshes/62 nodes/12 clips still pass exact contract verification. Any GPU
comparison must use the actual original whole worker, whose body already culls.
It may be that accessories offer insufficient full-renderer gain; no gain has
been asserted. The fixture now executes actual Assets.model, WorldScene.actor,
updateActor and material registry paths on both paired models and reports the
effective original material sides after AfricanToon.

Exact-interface audit (`python tools/frontside_interface_audit.py`) now separates
float-identical authored positional interfaces from the1e-5 seam diagnostic.
Mature maize and banana have the same interface counts under both modes and
zero coincident-triangle groups: their145/413 non-manifold positional edges are
not artifacts of tolerance rounding. This still does not justify welding across
UV or regional-driver seams. The watering-can first geometry differs: exact
376 positions/58 boundary edges versus quantized371/48, so those merged gaps
need local inspection. Worker body has four exact coincident-triangle groups,
which are retained because its existing FrontSide contract already culls.
The interface audit is diagnostic; counts alone approve no topology change.

Corrected actual-world material screen confirms Mesh0 side0 (FrontSide), null
shadowSide and effective PCF depth side1 (BackSide) after Assets/World actor and
AfricanToon. A fixture identity bug was also excluded: replacing World actor's
data object after Idle initialization loses the tool-visibility WeakMap record
and keeps the watering can hidden. The earlier zero-error Water capture is
explicitly excluded from accessory QA. The fixture now retains the original
actor data/mixer identity and records visibility/scales on both sides.

With Water fraction .125, held-out azimuth22.5/elevation25 and the regadera
visible/scale1 in both models, the corrected accessory candidate has identical
packed shadow maps (0changed texels). It fails the fixed color/region screen:
alphaIoU .999842,22missing pixels, global linear RGB MAE .000022923 but max
occupied tile MAE .013929 and largest RGB outlier region22pixels. Three unchanged
original repeats are byte-exact. This is the first valid accessory rejection;
tiny global errors do not override regional defects. The256px training selector
now needs refinement at1024 and separate withheld views/poses, preserving budgets.
No thresholds were relaxed, no GPU timing or full shadowFront approval exists.

The1024px selector now preserves existing worker material sides (body FrontSide)
and uses the actual paused fixed-pose sampler and stable tool-visibility record.
It covers60poses/1440views and selects11 accessory meshes. The reconstructed
candidate appends482faces, +1.150% of whole-worker triangles and +1.161% active
geometry. Packed5231420 bytes, SHA256
c0dc53887366e1a7acf3152704993052911c8ea79a7b67b94a09c604d47702af.
Decoded contracts remain exact and Validator still reports473 inherited errors,
124warnings; no additional normal-unit errors.

The repeated held-out Water screen still rejects21interior missing pixels
(diameter11.66px), tileMAE .013147 and RGB region21pixels, with identical shadow
maps. Refining resolution alone therefore does not solve angular occlusion gaps.
This rejected view may guide diagnosis; it must not be reused as independent
held-out evidence after adapting to its result. Map missing pixels to original
faces/interfaces and repair a coherent thin component, retaining independent
new views/poses and the unchanged quantitative thresholds.

Missing-pixel ID provenance isolates eight back-facing spout faces. Exact
positional components of the first watering-can geometry are body280faces and
spout440faces. `frontside_component_audit.py` reconstructs this diagnosis from
source hash plus recorded ID evidence. The localized rigid spout proposal adds
an inward wall0.05mm from authored outer normals, reverses its440faces, and
joins20physical rim edges with40new flat-normal triangles. Source outer
positions, indices, UVs, materials, parent hierarchy and watering path remain
exact. Whole worker adds819faces (+1.953%) and1.840% active geometry; this is
not indiscriminate whole-worker reversal. Candidate packed SHA256
54dc88d860b7f33cfd150d8500c86c7d5cb47f3789a3f2d8123b9e01711a2345.

Blender4.5.9 headless (`frontside_blender_shell_probe.py`) inspects only those
outer/inner/rim triangles with candidate-face provenance. Exact float32 physical
interfaces have460vertices/920faces, zero boundary/non-manifold/inconsistent
winding/degenerate faces and no non-adjacent BVH overlap pairs. This uses exact
positional identity, no tolerance, and never exports or welds candidate UV or
skin vertices. Blender remove_doubles at an extremely small1e-9 tolerance did
not reconstruct all equivalent interfaces, so its partial result is not used
as closure evidence. The exact graph independently agrees with Blender.
Topology alone approves nothing; all map/visual/depth and GPU gates remain.
Decoded contract verification and Validator are unchanged (473inherited errors,
124warnings). `frontside_worker_normals.py` locates all473zero-normal vertices
in9accessories; those require separate local reconstruction, not arbitrary
normalization or blanket recalculation.

Candidate generation now supports `--training-profile 256|1024` and opt-in
`--local-spout-shell`. Every raw and runtime candidate is retained in immutable
SHA256-named files under ignored candidates/archive; crop bridge sidecars are
archived with the raw candidate hash. The256/1024 source-preserving candidates
were rebuilt and their original hashes reproduced. Fixed serving aliases point
to the latest disabled experiment, never an activated production asset.

Before inspecting the local-wall result, independent screen version2 reserves
Water times .375/.875, elevations40/70 and azimuths11.25/101.25/191.25/281.25.
These differ from the selector and the .125/22.5/25 diagnosis that guided the
wall. Repeating that diagnosis checks the repair only; it is not independent
acceptance evidence. The fixture now records GPU identity, browser and timer
extension availability, candidate receipt/hash and packed shadows per sample.
It tests the declared bidirectional alpha Hausdorff limit via exact Euclidean
radius1 neighborhoods (diagonal neighbors exceed1pixel), retaining the stricter
interior/outlier gates. `allClips` requests all12 names from the authoritative
action manifest; the short four-clip screen remains only an early rejection
screen. These prepared controls are not evidence that a visual or GPU gate passed.

The crop ID selector now additionally preserves selections per bridge pair as
`bridgeSource/a-b`, while retaining the previous union for reproducibility.
This prepares an alternative to duplicating every selected state reverse into
both neighboring transition buffers. It changes only the isolated selector,
not the production bridge builder, faceLabels or candidate geometry. A new
pair-specific selection and byte budget are required before building that
alternative; the current union candidate remains rejected by the pilot budget.

Local-wall packed candidate54dc88d8 was tested through the real World actor path
on Intel UHD Graphics/D3D11. The diagnosis Water .125/azimuth22.5/elevation25
now has IoU1, zero missing/added pixels, linear RGB MAE9.2785e-9 and identical
packed shadows. This confirms only the diagnosed spout repair. The first
independent version2 sample (Water .375/azimuth11.25/elevation40, Sabana daytime)
rejects: IoU .998741,162missing interior pixels in one region (diameter23.32px),
117pixels exceed the bidirectional1px distance gate, tileMAE .064577 and RGB
outlier region162pixels. Packed shadows still match, and all three unchanged
source repeats are exact. No thresholds changed. That rejected sample can now
guide face provenance, but is no longer independent for any subsequent repair.
Named JSON and source/candidate/difference triptychs retain both results.
EXT_disjoint_timer_query_webgl2 is available; no GPU timing has been run and
quality gates still prevent promotion or an adaptation PR.

Version2 missing-pixel provenance identifies authored can-body faces82–86,
all back-facing (53+53+22+21+13pixels). The opt-in `--local-can-shell` proposal
therefore adds a coherent body wall as well as the spout wall:692nondegenerate
inner faces,96rim faces,0.05mm inward thickness. The28authored zero-area outer
faces remain in the source prefix but are never duplicated. Whole-worker cost
is+2.247%triangles and+2.242%active geometry; packed SHA256
ee05a1e0c7609ac07ad64a4c0333b96ee10b5bb20f34ef59892e53406fcbfdcd.
The prior spout-only candidate/diagnostic is retained separately.

Blender exact positional analysis reports1480active shell faces,0non-manifold,
0inconsistent winding and0degenerate faces. Twelve exact boundary edges lie
at the authored rotational seam, whose z0/negative z endpoints differ around
2e-17m; coordinates are recorded, and no quantized closure is substituted for
this exact result. All non-adjacent overlap pairs map to intersections already
present at the authored body/spout attachment; none lacks an authored source
pair. That classification does not establish geometric or visual acceptance.
Nodes/skin and all12clips/440056sampler bytes remain exact; Validator counts
remain473inherited errors/124warnings. This new proposal has no visual screen
yet, no shadowFront approval and no GPU benchmark.

Before screening the body-wall proposal, independent version3 reserves times
.3125/.8125, elevations35/65 and azimuths33.75/123.75/213.75/303.75. Repeating
version2 diagnoses its repair only. Version3 retains all existing quality gates.

Can-wall version2 diagnosis now has IoU1/0missing/0added, RGB MAE .000002206,
tileMAE .001130 and2changed shadow texels (max32.18micrometers). Version3
reaches3samples; the third (.3125/213.75/35) has IoU1 and0alpha differences,
but tileMAE .016203 exceeds .01. Its packed shadows differ in3texels with max
241.29micrometers, which needs depth correspondence before interpretation.
Only the first view had unchanged-source repeat controls in that campaign,
so the later color rejection is retained as provisional evidence, not a
conclusion of geometry causality. No gate is approved from these captures.

The separate shadowFront screen aborted at the first unchanged-original
repeat because its raster differed, saving no candidate comparison. This
invalidates that screen. The fixture now repeats3original controls at EVERY
sample and saves an explicit invalid-control report before aborting, retaining
any earlier samples. Further isolation needs same-view source twins and
noShadows controls; neither a noisy original nor tiny global MAE permits
relaxing the regional gates. No GPU timing or promotion has occurred.

Same-view isolation now confirms the version3 color rejection independently:
`caseOffset=2&noShadows` has3unchanged-original repeats exact in that view,
IoU1, MAE .000008249, tileMAE .016203, max RGB error .396224 and7isolated
RGB outlier pixels. Metrics exactly match the earlier shadow-enabled capture.
`caseOffset=2&noShadows&sourceTwin` has identical source/candidate pixels
(MAE/tile/error0), with3exact original repeats. Thus this rejection cannot be
explained exclusively by shadows or unchanged-source noise in this view.
It remains a candidate color/map/geometry defect to diagnose, not a reason
to relax the tile gate. Source/candidate face provenance for those color
outliers is the next diagnostic before any further geometry change.

The color-ID diagnostic preserves the real vertex/skin hooks and material sides
and traces both sides at those7outlier pixels. Five authored back-facing body
pixels (faces233/235/237) are now covered by new rim faces1420/1422/1423/1424;
their flat rim shading differs from the authored surface. One nozzle pixel
changes sourceBack106 to candidateFront67, and one handle pixel changes
sourceBack1208 to candidateFront1207. This separates the new wall's rim-shading
issue from still-unselected accessory back surfaces. Map/color-aware local
solutions must preserve the physical wall and the fixed quality thresholds;
the current candidate remains rejected. `mapRgb` retains both mesh/face maps
and the preceding PBR comparison rather than accepting ID visibility alone.

The next disabled proposal is opt-in `--continuous-inner-rim`: rim geometry,
thickness and UVs remain unchanged; only its new shading normals/tangents
continue the authored inner-wall frame instead of introducing a flat shading
seam. This is an artist-normal proposal, not a geometric closure substitute;
all outer/source attributes remain exact, and all views must verify its look.
`--rgb-selected-backs` additionally includes the2exposed nozzle/handle source
faces from recorded provenance, not blanket reverses of those components.
The component audit locates the handle face in448faces (0degenerate/0opposed
normals,48exact boundary edges) and the nozzle in120faces (40inherited
degenerates/0opposed normals). Those counts do not approve either component.

Packed candidate SHA256 e554227b392a3d5496135d763ee9350198d80ebf5a016418e08d59a48e9c145b:
+2.252%whole-worker triangles,+2.252%active geometry,5243228packed bytes.
Nodes/skin/all12clips remain exact; Validator remains473/124. Blender can-wall
geometry analysis is unchanged, including the exact seam/attachment diagnosis.
This proposal has no visual approval, shadowFront approval or GPU timing.

`cropPairsOnly` selects only the two representative species and writes a
separate `runtime-visibility-crop-pairs-selection.json`; it preserves the old
combined worker/crop selector artifact for reproducibility. The pair-budget
script prefers that separate provenance when present, and otherwise exits
PENDING_PAIR_SELECTION instead of fabricating a saving. The isolated server
was restarted for that explicit artifact route. No production state, bridge,
compression or worker manifest changed.

Both authored crop atlas materials use normalTexture. In Three r180's local
`normal_fragment_begin.glsl.js`, DOUBLE_SIDED flips the tangent-frame XY even
when USE_TANGENT is absent. All40 actual indexed crop states have only
POSITION/NORMAL/TEXCOORD_0; production bridges also omit tangent attributes.
Both derive that frame from positions/UVs. A reversed FrontSide normal alone
therefore does not preserve the authored back-face normal map in either path.
A pair-specific proposal must also preserve frame XY orientation per reverse
face (aPart.w is an unused existing lane), and verify diagnostic map/color
captures through the real shader before approval. No such compensation is
activated or claimed tested yet. The controlled writer negates authored
tangent XYZ/handedness where present, but these crops have no such attribute.
Indexed states need their own compatible per-face frame compensation and
resource accounting; the existing bridge lane cannot solve the indexed path.

Continuous-rim candidate e554227b now passes the previously rejected diagnosis
(Water .3125/213.75/35, noShadows): IoU1/0alpha differences, MAE9.502e-7,
tileMAE .001674, max RGB error .053117,5isolated RGB outlier pixels and3exact
unchanged-original repeats. No thresholds changed. The2nozzle/handle pixels
are resolved; remaining tiny rim differences fit the declared screen. Because
this view guided the proposal, this is repair verification only, not acceptance
or independent evidence. New poses/views, all clips/maps/shadows and GPU gates
remain required.

Separate crop pair selection covers36growth/transition states at256px. The
selected8pilot bridge pairs use10,199,640original bytes; union reverses require
13,243,296bytes and pair-filtered reverses estimate12,939,696bytes (+26.864%
from source). Pair filtering saves303,600bytes (~2.3%of union bridge bytes),
which is modest. It has no map/visibility approval or timing, and does not
resolve the proposed pilot budget by itself. This is evidence about the
pair-filter alternative, not proof that all geometric approaches are inviable.

Before any further color capture of e554227b, independent version4 reserves
times .1875/.6875, elevations30/60 and azimuths18.75/108.75/198.75/288.75,
distinct from prior selection/diagnosis and unchanged gates. The source is
repeated3times in each sample. Water may be screened first, but all12clips,
attachments, day/night/cultures/biomes/maps/shadows and GPU gates remain.

Version4 produced8 valid independent Water samples (first reserved time,
all8 angle/elevation combinations), each with3byte-exact source repeats and
passing color/alpha screens. Maximum tile MAE was .001823. The ninth sample
(.6875/18.75/30) was INVALID: its first source repeat differed in2bytes by at
most2byte units. No candidate comparison was interpreted for that sample.
The archived invalid-control report remains unchanged, without a capture.
A separate first-view shadowFront screen passed alpha/color; one packed
shadow texel differed by32.18micrometres decoded depth. This does not approve
ground shadow masks/depth or the category, and no timings were collected.

Prospective metric policy2, declared before any new capture: source alpha
bytes must match exactly in all3repeated renders. For each pixel/channel,
let b=2*max_j(abs(linear(sourceRepeat_j)-linear(sourceReference))). Use
Float64 accumulation and evaluate candidate RGB on
E=abs(linear(candidate)-linear(sourceReference))+b. This adds uncertainty to
the candidate error; it never subtracts noise or enlarges a candidate gate.
Triangle inequality bounds the error against every measured source repeat;
the additional factor2 supplies margin over that observed envelope. Three
renders cannot establish a bound on unseen variability, so this is an
observed-control screen, not statistical confidence or category approval.
If variability grows in later controls, that affected sample is invalidated.

The envelope itself must fit one fifth of the declared RGB budgets: MAE
<=.0004, p99<=.003, maximum16x16tile MAE<=.002, and no connected region
larger than3pixels with any channel b>.006. The3pixel gate rounds16/5 down.
The p99 histogram rounds each value upward to a1/255bin, conservatively.
Candidate gates stay MAE<=.002, p99<=.015, tile<=.01 and connected >.03
region<=16pixels, with all original alpha/interior-hole gates unchanged.
Reports preserve nominal RGB metrics separately from E-based metrics and
save source controls/envelope metrics per sample. RGB face provenance still
maps nominal >.03differences; envelope-only outliers are not geometry IDs.
Earlier rejections and version4's invalid ninth sample are not reclassified.
Pure metric tests verify observed-reference bounds, local/channel accounting,
budget consumption, connected-noise rejection and exact alpha distances.

Before measurement, version5 reserves times .21875/.71875, elevations
32.5/62.5 and azimuths26.25/116.25/206.25/296.25. It uses policy2 and new
views, not a retry of version4's invalid sample. Water may be screened first;
the complete shader/map/shadow/12clip/resource/GPU acceptance remains pending.

An additional read-only alternative indexes bridges by the conservative tuple
(role, original vertex ID, exact faceLabel, reverse flag). Identical tuples
have identical22float32 shader inputs; no position welding or organ merging
is performed. Stable indices preserve all source triangle order/provenance.
The8pilot pairs estimate10,199,640B current unindexed payload,6,526,538B
indexed source payload and8,606,476B indexed with pair-selected reverses:
15.620%below current payload. The extra reverses still cost31.869%relative
to indexed source; these are different comparisons. An eventual GPU campaign
must include indexed DoubleSide source as a separate control so indexing's
gain is not misattributed to culling. Triangles, state meshes, instances,
normal-map compensation and full pilot budget remain separate unresolved
gates. This estimate establishes neither rendering equivalence nor GPU gain.

The QA-only `frontside-indexed-bridge.mjs` constructs that stable candidate
without production imports. Every shared key is checked against all22float32
input bits; original faces reconstruct exactly, including signed zero. Reverses
copy UV/organ drivers, flip normal/winding and reserve aPart.w=1 for required
future normal-frame compensation. Instance attributes retain their original
live references. Three tests cover prefix/bit reconstruction, faceLabels,
reverse selection and invalid provenance. It is not yet wired to a rendered
crop fixture and does not claim normal-map compensation or acceptance.

Version5 Water/shadowFront produced8 valid screens at .21875, all3source
controls exact per sample, maximum tile MAE .001346 and packed shadow depth
delta48.21micrometres. The ninth view (.71875/26.25/32.5) is INVALID: the
third source control changed27RGB bytes, maximum90byte units, alpha exact.
Its envelope tile MAE .004923 exceeds .002 and its9pixel connected region
exceeds3. The source-only failure cannot be interpreted as candidate quality.
No retry for favorable controls, comparison of that candidate view or
retroactive threshold change is made. The report preserves prior8samples
and explicit source envelope evidence; no final frame is claimed for it.

A separate source-only diagnosis at the invalid version5 pose draws the
original30times, without drawing/comparing the candidate. All30draws were
byte-exact, so no RGB face provenance was found. This did not reproduce the
campaign fluctuation; it neither identifies a cause nor rehabilitates that
invalid campaign sample. The report was saved before an erroneous cleanup
call to nonexistent toon.dispose raised; the catch disposed the renderer,
the tab was closed and the call removed offline, without repeating the draw.
`controlDiagnosis` requires sourceTwin and explicitly exits before candidate
comparison; `mapControl` can map source-only nominal outliers when present.

Prepared maize fixture (before measurements) uses4separate arms: original
DoubleSide, conservatively indexed DoubleSide, indexed/selective FrontSide
without frame compensation, and the same candidate with frame XY compensation.
The last two use identical geometry/selection. CropBatch's actual procedural
growth/bridge hooks, packed source textures, AfricanToon/environment/native
shadow are retained. Candidate states use explicit per-vertex aQaReverse
(4bytes/vertex, counted); bridges use existing aPart.w. The QA frame patch
flips derived tbn XY only on appended reverses, retains preceding shader hooks
and cache identity, and guards normal/clearcoat/anisotropy frame declarations.
Five helper tests pass; no rendered equivalence is claimed yet.

First screen reserves1024px, maize mature state first (or explicit bridgeOnly
three interior samples of stage3-to4 using the real morph window), wind clocks
1.75/4.125, Sabana/Manglares and night0/.5/1, elevations32.5/62.5, azimuths
26.25/116.25/206.25/296.25. It uses policy2/source3controls for every sample,
all prior quality gates, and separate fixed crop artifact routes. Default16
samples are a pilot screen only. Indexed source must also pass equivalence;
the uncompensated arm is diagnostic, never an acceptance reference. Color
shadows retain DoubleSide; Front shadow/depth/ground-mask gates remain pending.
Resource counts include all geometry attributes/index buffers, report original
and indexed controls separately, and cannot waive the declared triangle gate.

First maize mature screen retained2views (wind1.75, Sabana/day, elevation32.5,
azimuth26.25/116.25). Both indexed DoubleSide controls are byte-exact with
original; all3source repeats in both views are exact. Both FrontSide variants
have IoU1/zero alpha differences. Uncompensated tile MAE .083289/.050239
rejects, while XY compensation lowers first tile to .005557 (screen PASS),
but second tile stays .050239 (screen FAIL, largest RGB region2pixels).
Global MAE1.84e-5 cannot override that local failure. The proposal remains
rejected. A later face-ID diagnostic may localize the residual; it cannot
turn a guided view into independent acceptance. Four-arm PNG/report archived.

Conditions correction: root subsequently confirmed CPU campaigns27148/49032
were live and advancing, not frozen; the earlier reservation message carried
stale CPU state. No GPU timings were run, and no performance conclusion is
drawn from this campaign. Tab29/context were closed before root's HQ window.

Prepared diagnostic `sourceNormalPath` leaves repaired reverse-normal bits
in geometry, restores the authored object normal before interpolation, then
emulates the source fragment normalize/faceDirection path using the existing
reverse flag. Material.side and GL culling remain FrontSide; the fragment
DOUBLE_SIDED define only retains source normal/TBN behavior. This tests whether
the changed interpolation/normalization path explains residuals; it is not
an attribution or a passing result. Source/candidate face provenance can be
captured afterward. Guided mature views remain diagnosis, not independent
acceptance, and the direct-XY rejection is retained regardless of the outcome.

Subsequent crop reports additionally count instanceMatrix buffers and break
resources down by species, avoiding an all8species aggregate masking a pilot
increase. The first mature report's geometry-only counts are retained with
their original field name; they excluded those matrices. QA-created indexed
geometries are explicitly disposed in addition to CropBatch's original owned
geometries. These are fixture/accounting corrections, not rendering approval.

The source-normal-path mature diagnosis exactly reproduces the prior direct-XY
metrics; changing that path did not resolve the residual. RGB face mapping
locates several source Back faces not in the existing256px selection, including
202/113/1387/131/483/266/3221. Source Front faces also occur in outliers; this
does not identify a unique cause. Maize's actual fixture budget is33,272source
triangles versus42,530candidate (+27.825%),6,169,226B original versus4,248,080B
indexed source and5,722,980B candidate (including MAX_PLANTS=2instances).
Lower payload does not override the proposed10%triangle gate; no approval.

First real morph bridge sample (growth .7306481481481482, stage3-to4, wind1.75,
Sabana/day, elevation32.5/azimuth26.25) has3exact source controls and exact
indexed DoubleSide color/alpha. Both candidate variants miss9pixels, largest
missing region5pixels; uncompensated tile .043837/region247, compensated tile
.032855/region30 also reject. Original Front bridge face4587 appears among
color outliers alongside Back1337/2027/1355. All evidence/captures retained.
Neither the morph color gate nor interior-hole gate passed.

An opt-in QA ordering diagnosis `interleaveReverses` keeps source attribute
prefix bits intact and forward triangles in their exact relative order, but
places each selected reverse immediately after its own forward face instead
of appending all reverses last. This tests possible depth-priority changes at
coincident/near-coincident interfaces. It does NOT preserve the raw index
prefix; each emitted face carries explicit qaTriangleSourceFaces provenance,
and a6th helper test reconstructs forward UV/organ/position/normal bits in
original order. Source GLB/bridge faceLabels stay untouched: CropBatch builds
original bridges before this QA-only layout change. A production candidate
would require its own fully verified faceLabels/index mapping reconstruction.
No causal claim or quality approval is made before this diagnostic is drawn.

Interleaving was drawn in2guided mature views and1guided morph view. Mature
MAE decreased to1.933e-5/1.284e-5, but worst tile .050239 stayed unchanged.
Morph MAE decreased to .00010174, while tile .032855,9missing pixels and
largest missing region5 remained. Original/indexed controls and source3repeats
were exact. These are still rejections; no threshold or acceptance changed.

Instrument correction: Three BufferGeometry.copy shares userData. Assigning
qaTriangleSourceFaces on an interleaved candidate therefore polluted the
original clones' geometry metadata in memory. Source position/normal/UV/index
buffers, source faceLabels JSON, source files and all rendered comparisons
were unaffected. The redundant sourceFace field of original-arm ID records
in historical interleave reports is INVALID; their raw face field remains
the original emitted ID. Reports are retained, and the provenance audit now
explicitly uses raw face for original arm0. Candidate builders detach userData
before setting any sidecar; a7th helper test protects both original and indexed
control metadata. Corrected joins classify59mature and182morph RGB-outlier
pixels as source Back/unselected/different candidate source ID. Diagnostic IDs
remain separate draws; this guides selection investigation, not acceptance.
The earlier sourceFace-based classification is withdrawn, with no geometry
adaptation performed from it.

Corrected raw IDs now feed a QA-only `colorGuided` sidecar:31 additional
maize-mature reversals and60 bridge3-to4 reversals, with source SHA256 and
input report hashes verified offline; the browser also checks original bytes
against that SHA256. No source GLB or faceLabels changes. Repeating the known
training views with direct frame XY compensation now passes color/alpha:
mature worst tiles .005363/.0002322, morph .0019422 with0missing pixels.
Three source repeats per sample and indexed DoubleSide controls are exact.
Reports retain known-view/training status and active CPU campaigns27148/49032;
no timings. Triangles42,621 versus33,272 (+28.099%) still fail the proposed
budget. Buffers5,738,922B versus original6,169,226B and indexed source4,248,080B
do not establish GPU improvement or waive that failure. ShadowSide stillDouble.

Before any further drawing, reserve CULT_WITHHELD_V1 for this frozen sidecar:
azimuth43.125/133.125/223.125/313.125, elevation47.5/72.5, windclock2.875/5.625,
mature plus stage3-to4 morph fractions .375/.875, Sabana/Manglares and day,
half-night/night. None trained the reversal selection. Unchanged policy2
requires3source controls in every sample; stop at the first failed candidate
or invalid control and retain it. First limited screens can only diagnose
generalization, not satisfy full states/cultures/shadow/resource/GPU gates.
The colorGuided source/index layout and sidecar are frozen before this profile.

First CULT_WITHHELD_V1 mature sample (wind2.875, Sabana/day, elevation47.5,
azimuth43.125) REJECTED: all3source controls exact, indexed DoubleSide exact,
alphaIoU1/0missing/0added, compensated MAE1.509e-5 but local tile .057203
exceeds .01. Largest RGB region2pixels does not waive that tile failure.
Correct raw-ID join identifies44RGB-outlier pixels, all source Back faces
unselected in both original visibility and frozen color-guided training.
Campaign stopped immediately; no morph view, reattempt, source-noise rejection
or tolerance change. The frozen training receipt is unchanged. More camera
selection can increase reversals but does not address the failed triangle
budget. Next exploration must consider winding/component and thin-surface
geometry rather than treating these training successes as adaptation approval.

New offline Blender4.5.9 scratch inspection covers maize stages3/4/5 and mature
banana using exact position connectivity, never exporting or modifying source
UV/index/faceLabels. Components are1/1/2/1; none are closed consistently by
this diagnostic. Authored normal/cross opposition is0 in all four meshes.
Blender recalc proposes30/28/99/347 winding flips, of which only21/26/34/81
intersect699/989/1629/1211 selected reversals. Recalc on these open/non-manifold
components is not a reliable external orientation or a solution to the budget;
those proposals remain unapplied. Closedness is not a universal FrontSide rule.

A separate affine-fan inventory checks conservative tessellation reduction:
simple interior source-index ring, one faceLabel driver, constant normal bits,
planar/affine-UV fit residuals≤1e-12/1e-10, and a region where actual growth/wind
and bridgeBase are affine (below ground, or constant-height with saturated
radial fold). All four pilot meshes yield0eligible fans. The nonlinear height
pow/smoothstep and radial fold prevent assuming a rest-pose dissolve preserves
animated surfaces; no global decimation or solidify performed. This narrow
negative screen is not proof that broader authored remodeling cannot succeed.

Prospective worker V6 is reserved before drawing: clip fractions .40625/.90625,
elevations37.5/67.5, azimuth54.375/144.375/234.375/324.375, same frozen e554227b
packed candidate, policy2 and unchanged alpha/RGB limits. A limited Water
screen can diagnose generalization with shadowFront separately, stopping at
first failure or invalid control; neither is retried to seek exact controls.
Remaining12clip/culture/biome/maps/shadow-ground/GPU gates stay required.
Subsequent worker report CPU conditions come from an explicit campaign query
instead of stale hardcoded frozen49032/39340. Historical reports are retained.

Limited first-draw workerV6 Water .40625, Sabana/day, elevation37.5 and
azimuth54.375/144.375: both samples pass local color/alpha, worst tile
.0010471/0,0missing pixels and3exact source controls per sample. Effective
accessories use colorFront+shadowFront while original body retains its
existing colorFront/defaultPcfBack. Each packed shadow has1changed texel,
maximum32.18micrometres world depth; this is not a ground-shadow mask gate.
Original/candidate Water tool visibility/scales match (can visible, other
tools hidden by the original action); no accessories were pruned. Captured
CPU27148/49032 active, no GPUtiming. Two samples are limited evidence, not
complete profileV6/12clips/cultures/biomes/shadows/category acceptance.

Separate normal-repair investigation targets Can_Nozzle_geometry_4 only,
leaving frozen e554227b unchanged. Its81 undefined source normals are replaced
by normalized original incident face-area vectors;9zero-area isolated copies
use exact-position incident support only when directions agree within15deg.
All81resolved; no arbitrary axis, welding, vertex/index reorder or triangle
change. Defined normal bits and every non-normal attribute remain exact.
Writer verifies original/candidate target geometry correspondence, base hash,
nodes/skins/12animations and preserved binary prefix. Raw265dfea7/web3714f849
are disabled separate archives; lossless Meshopt decode lanes and original web
textures verified. Web5,243,500B vs frozen5,243,228 (+272B), triangles unchanged.
Other392 source zero normals remain unresolved. Normal validity is not visual
acceptance: repaired undefined directions deliberately change source shading.
The opt-in localNormal comparison will use existing guided WaterV6 views,
same real material/shader/shadowFront and policy2 gates, with3controls each;
stop at failure/control invalidity. No source asset or production manifest change.

Guided local-normal WaterV6 two-view screen passes alpha/RGB with3exact source
controls per sample and identical metrics to the frozen shell screen. This is
not proof that repaired tiny pole faces were drawn. Before extending the
normal repair, an opt-in source/candidate ID coverage draw will count the
original faces incident to those81undefined normals; it remains separate from
PBR quality. A zero covered count limits what the compatible screen establishes.

Coverage draw was not executed: two CUA browser2 webview-attachment timeouts,
with empty tab inventory between attempts. No Run click/render/context or
report resulted. The team CPU suite77319 was active alongside27148/49032;
there is no timing result. Keep coverage pending and do not expand normal
repair based on the earlier compatible screen. Root has the exact opt-in
fixture URL for a later available provider; the local server remains5284.

The resumed audit covers all nine rigid accessories without exporting the
category. Of473 original zero normals,462 have coherent incident area support
within15degrees. The11 ambiguous cases belong to Badge5(1), FruitCrate10(8)
and HarvestSack20(2); each is used only by one triangle containing exactly
repeated POSITION lanes. No tolerance weld or near-zero-area deletion applies.
The reusable cleanup removes only those incident faces, compacts unused
vertices, preserves retained face order and records both old-face and
old-vertex correspondence. It is restricted to rigid meshes without morphs
and requires equal positions to produce equal clip positions: ordinary
Standard and the inspected AfricanToon hook do not displace these props.
This argument must not be transferred to crop driver attributes. Effective
material flags and diagnostic coverage still need runtime verification.
Six synthetic checks pass, including ambiguous hard corners, isolated exact
support, nonfinite rejection and refusal to delete collinear/near-duplicate
distinct positions.

One separate disabled Badge5 pilot is exported:16 coherent normals repaired,
one repeated-position triangle and one unused vertex removed. Serialized GLB
is independently read back: every retained non-normal attribute/index is
verified against its mapping, all other meshes are exact, inverse-bind lanes
and12clips/440056 animation sampler bytes remain exact. Raw2611a85a and
webc71db6a6 are immutable archives; lossless codec lanes and existing web
texture payloads verified. Packed5,243,360bytes,132bytes above frozen shell.
It does not incorporate the separate Nozzle4 repair. No coverage, visual,
ground-shadow or GPU acceptance follows from these contract checks.

Geometry-derived replacement models are now explicitly authorized, subject
to all previous quality/resource/performance gates. A read-only crop cost
inventory considers keeping genuine thin leaves selectively DoubleSide and
using FrontSide for labels0/1, without adding triangles. Labels alone do not
establish valid Front coverage. Preserving original contiguous face priority
would require1246/1361/2080/2146 drawgroups for maize3/4/5 and banana5, so that
layout is rejected as a practical rendering candidate. Two stable-partitioned
groups keep state GPU index bytes unchanged, allocate replacement CPU index
arrays, and add2.2727% index-buffer bytes to these unindexed bridges
(Uint16 indices versus88bytes per original bridge vertex). It changes
cross-group priority and requires rebuilding/verifying provenance, driver
labels and coincident-interface rendering. It is an untested design option,
not a partial acceptance of geometric leaf repair. Derived leaf remodeling
remains a separate option requiring UV/shading/growth preservation tests.
Neither can inherit the raw-Front GPU ceiling: deleting required backfaces
reduces coverage, whereas geometric reverse faces restore its vertex cost.

Badge coverage instrumentation uses the exported retained-face map before
joining candidate IDs to original affected normals; compact candidate face
numbers are never treated as original numbers. The opt-in badgeNormal arm
is mutually exclusive with localNormal and refuses the originalShadow prefix
shortcut because removal changes that prefix correspondence. Source identity
is checked against the audit. Syntax checks pass. The attempted browser
attachment returned unavailable browser2 and listBrowsers[]; no tab/Run/render
or coverage report was produced, and GPU reservation was immediately released.

The two-group crop helper is QA-only and not wired into production. It borrows
all original attribute objects, including live instance growth/bridge buffers,
and stable-partitions only source indices. It records original face order,
labels and provenance; no vertex, UV, normal or driver lane changes. Two tests
verify indexed/unindexed corner correspondence, source immutability and live
instance references. This verifies construction contracts, not raster priority
or Front coverage. Before visual comparison, the fixture must isolate original
DoubleSide, indexed DoubleSide, partitioned DoubleSide and partitioned
core-Front/leaf-Double; arrays of material clones must preserve shader hooks
and be disposed separately, restoring borrowed originals before batch cleanup.
No benchmark, visual approval or new acceptance PR exists.

The opt-in sidePartition crop fixture now constructs those four arms. It
preserves original growth/bridge onBeforeCompile and cache hooks on both
material clones, registers material arrays normally, and restores borrowed
materials before batch disposal. Shadows stay DoubleSide. It stops if either
indexed-source, partitioned-Double or partial-culling quality fails. Legacy
single-material RGB provenance is explicitly unavailable for this option
instead of silently misidentifying groups. Syntax and nine construction/index
tests pass. Runtime rendering remains unexecuted because this agent's browser
provider exposes no surfaces; no test above establishes native rendering.

Further exact-lane inventory found no redundant state vertices in the four
representative crops: all POSITION/NORMAL/UV lanes are already distinct even
without driver labels, giving0byte reduction. Enforcing driver labels for a
logical bridge inventory splits existing shared vertices and increases the
equivalent state-sized inventory2.34/3.42/4.29/2.45%; no actual bridge encoding
or source changes were made. Every drawn corner's lanes were independently
verified. This rules out another lossless state indexing shortcut for these
pilots, not approximate authored remodeling. Growth, UV/shading and thin-leaf
coverage still constrain any such remodeling; no budget gate is relaxed.

One Blender4.5.9 derivative experiment reduces maize-mature leaves to50% each,
processing labels2..8 independently with original UV and custom normals.
Core/ground1926faces retain all8corner lanes bit-exact. Leaf faces3009→1503;
forward3429, projected all-leaf geometric reverse4932 versus4935original
(−.061%). Frozen corner archive4d6d5dd7 is diagnostic JSON only. Changed leaf
geometry/UV/normal interpolation has not passed quality. Controlled indexing
plus Float32 reverse flag yields10196vertices/396648decoded state bytes versus
317066 (+25.10%): state resource gate FAIL retained. No original source or
bridge JSON changed; derived topology needs new bridge correspondences.

Opt-in blenderLeafReduction compares originalDouble, indexedDouble,
reducedDouble and same reduced leaves with geometric reversesFront and XY
normal-frame compensation. It refuses bridges and original-ID diagnostics,
tests only mature maize, checks archive hash, and stops at quality/control
failure. Per-mesh resource rows distinguish state vertices/index/decoded bytes
from category CPU arrays; neither is measured GPU allocation or actual vertex
invocations. No GLB web candidate exists yet. Shadows stayDouble, with no
shadowFront credit. A corner-writer check passes reverse winding, opposite
normals, UV/position equality and live growth references; syntax passes.

Normal-storage optimization would be a different unbuilt candidate:
[KHR_mesh_quantization](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_mesh_quantization/README.md)
permits normalized signed16bit NORMAL with required extension declaration
and4byte alignment (8byte stride for VEC3 short). This changes normal values,
requiring decoder/bridge normalized-lane support and separate map/color gates;
it does not reinterpret the existing Float32 byte failure.

Root's first native sidePartition screen is retained as guided REJECTION:
maize mature, Sabana/day, wind1.75, azimuth26.25/elevation32.5. Three source
controls, indexedDouble and partitionedDouble are bit-exact. CoreFront with
leavesDouble preserves alphaIoU1,0missing/added, but RGBMAE.000674 and tile
.054833>.01, with297pixel RGB outlier region, fail. Reordering is compatible
in this view; partial-sidedness shading/visible core remains problematic.
No GPU benchmark or approval. Raw report,4arm PNG,browser screenshot and
source hashes are archived as maize-side-partition-guided-*; hashes explicitly
record HEADddb06093 plus frozen uncommitted derived-fixture additions, not a
false claim that HEAD alone reproduces the capture. CPU44164/49032 active
were recorded by root; contexts/tab726 were disposed/closed afterwards.
Subsequent UI labels now use the actual selected arm names for each profile.

Root's Blender half-leaf screen is also a guided REJECTION, archived as
maize-blender-half-leaves-guided-* with HEAD90cc24d8 and pre-draw source hashes.
IndexedDouble is bit-exact. ReducedDouble fails before any sidedness change:
alphaIoU0.9525255, missing1.6579%, added3.2436%, linearRGBMAE0.03347,
maxTileMAE0.38134. Geometric-reverse Front also fails (IoU0.9521826,
RGBMAE0.03408). Thus this decimate0.5 derivative loses required appearance;
the independent +25.10% state-byte failure remains. No benchmark or expansion
to other crops is justified. Root disposed the context and closed the tab.

A separate offline constrained simplification keeps original vertex lanes,
locks each leaf's borders, and weights normals1 and UV100 with absolute
appearance metric1e-4. This metric is an approximate quadric proxy, not a
maximum silhouette, map or UV bound. The requested50% target produces NO
collapse in any of seven leaves. Forward triangles remain4935, and reversing
all leaves would yield7944 (+60.97%): resource gate FAIL. No asset/export,
bridge mapping, visual acceptance or GPU benefit follows. Exact source lanes
are verified unchanged; approximate ancestry in a changed triangle would be
priority guidance only, never an original face or bridge correspondence.

The prospective QA-only preserveDoubleShader option isolates another variable
in sidePartition: core material remains FrontSide for GL culling while an
explicit DOUBLE_SIDED define retains the source GLSL normal/TBN path. Three
r180 normally changes both that define and culling when side changes. The
previous partial-side color failure is not reinterpreted; this separate screen
tests whether it persists with that shader path retained. Shadows remain
DoubleSide, geometry unchanged, and all original quality gates apply. This
diagnostic is neither geometric repair nor a claim of runtime GPU improvement.

Root's Badge5 Water screen at HEAD90cc24d8 is archived as
worker-badge-water-no-coverage*: fraction0.40625, azimuth54.375/elevation37.5,
Sabana/day with CPU44164/49032 active. AlphaIoU1, RGBMAE0.000003055 and
tileMAE0.001047 pass this general screen, but normalRepairCoverage records
ZERO affected visible pixels and empty face lists for BOTH source and
candidate. It establishes no visual validation of repaired Badge5 normals.
Different poses/views must first demonstrate affected-face coverage; full
12-clip/map/shadow and GPU gates remain pending. Root closed/disposed the tab.

CPU centroid-ray guidance now inspects all16 existing Water V6 views using
original rig/clip/index/position lanes and current tool visibility. Textures
are omitted only from an in-memory GLTF clone; no renderer or export is used.
The highest estimated Badge5 area is fraction0.90625/elevation67.5/
azimuth234.375 (caseOffset14), with15 affected-face centroids unoccluded and
about6.18 projected square pixels total. Many triangles are subpixel. This is
training guidance only: raster samples, WebGL runtime and normal/map quality
still require native affected-face ID coverage. The previously captured
zero-coverage view remains unchanged and is never counted as repair approval.

An offline growth-orientation diagnostic uses production createCropBatch's
actual stageSample and uploaded Float32 iGrowth, with the recorded growth
shader evaluated in CPU Float64. At maize seed fractions0/.005/.015, two
core-face centroids have negative local deformation Jacobian determinant
(minimum−0.1074/−0.1013/−0.04885). Two finite-difference step sizes agree on
sign. From fraction.03 through the sampled original stages the minima are
positive. This demonstrates a limitation of assuming rest-pose orientation
survives strong initial compression; it does NOT establish discrete triangle
winding or raster coverage. Bridge deformation is explicitly excluded. No
growth, asset, material or geometry changes follow from this diagnosis.

A separate locked-border, seam-permissive training family checks approximate
appearance errors0.001/0.005/0.01/0.02 with unchanged weights normal1/UV100.
These are proposal-generation metrics, never relaxed raster/map acceptance
thresholds. All surviving P/N/UV lanes remain original bits, but interpolation
and approximate face-priority ancestry can change. Forward triangles are
4935/4923/4880/4767; projected all-leaf reverses7944/7920/7834/7608
(+60.97/+60.49/+58.74/+54.16%). Float32 reverse-flag indexed state bytes are
572616/571176/567132/556632 versus317066 source (+80.60/+80.14/+78.87/+75.56%).
Every proposal remains outside both resource gates and is kept offline,
without visual execution, GLB export, bridge reuse or GPU benefit credit.
This diagnoses this constrained family only; it is not a proof that another
authored recreation or selective reversal strategy cannot succeed.

Root's Badge14 screen is archived as worker-badge-water-v6-guided-coverage*:
HEAD96008e05, fraction0.90625/elevation67.5/azimuth234.375, Sabana/day,
CPU44164/49032 and main suite40728 active. AlphaIoU1, RGBMAE0.0000071115,
tileMAE0.00153063 pass the general screen. Affected source faces13/17/21/23/25/29
each occupy ONE raster pixel in both source and candidate ID draws; candidate
compact indices are correctly mapped back. Six pixels establish real coverage,
but not adequate normal/map or category acceptance. The earlier zero-coverage
view is preserved independently. Root disposed/closed the GPU tab afterwards.

Prospective normalCloseup QA frames the original Badge5 bounding box with the
same FOV42, resolution1024, rig pose, lighting, materials, shaders and all
surrounding geometry retained. Camera bounds/position are recorded; quality
gates are unchanged. It requires affected-face instrumentation and is marked
training inspection. CPU centroid guidance predicts16 affected nondegenerate
faces and about4430 projected square pixels at Water0.90625/elevation67.5/
azimuth144.375 (caseOffset13). This prediction is not raster coverage; a native
screen must verify face coverage and real shading without promoting this
closeup or the previous six-pixel screen into complete approval.

The native Badge5 closeup at HEAD348f6a8c is REJECTED and archived as
worker-badge-water-closeup-guided-*: both source and candidate ID draws cover
4434pixels on all16 affected nondegenerate faces. AlphaIoU1 and0missing/added
do not rescue RGB quality: globalMAE0.00107435 passes, but maxTileMAE0.33183158
and RGB regions4434pixels and157pixels fail unchanged gates. No normal/map
preservation credit is taken from the earlier tiny views. This comparison
includes the existing selective Front candidate, so a separate baseline-side
isolation would be needed to attribute the full change solely to normals.
CPU44164/49032 and suite40728 were active, with no timing claim. Root closed
the context/tab. QA Run buttons now remain disabled with a loading message
until module imports and handlers are initialized, preventing a lost early click.

The preserveDoubleShader native screen at HEAD25de831f is independently
REJECTED and archived as maize-double-shader-core-front-guided-*. Source3,
indexedDouble and groupsDouble are bit-exact. CoreFront with source GLSL
DOUBLE_SIDED retained yields the same recorded alphaIoU1, MAE0.00067416576,
tile0.0548332363 and RGB regions297/288/195pixels as the prior guided screen.
It has not resolved the failure; no complete causal attribution or performance
credit follows. CPU44164/49032 active and suite40728 was still recorded active
at capture; root subsequently confirmed suite complete and closed the GPU tab.

The next prospective mapSourceRgb screen repeats this one native-state view
and draws diagnostic IDs ONLY for original arm0, whose material is single.
It joins nominal RGB outliers to original face labels and gl_FrontFacing.
It never invokes the unsupported array-material candidate ID path. ID output
is later diagnostic evidence, not PBR/map acceptance or permission to retrain
from withheld failures. The helper rejects array materials before mutation
and skips zero-instance/invisible meshes without changing original PBR draws.


The native original-only mapSourceRgb capture at HEAD54bd242b is archived as
maize-core-front-source-rgb-guided-*. All source/indexed/group Double controls
remain exact and coreFront remains rejected. The later original ID attribution
owns2586 nominal RGB outlier pixels across84 original back-facing faces:
82 regional-label0 faces/2581pixels and2 label1 faces/5pixels. The read-only
frontside_crop_core_rgb_geometry.py joins original corners/UV/normals/driver
metadata using source hash and face IDs. Label0 corners lie at y0.00049986
through0.16692996; major faces have downward authored mean normals and positive
geometric-normal dot authored-normal. These facts motivate exact-position
component/orientation inspection, but do not prove inward closed volume or
approve flipping any face. No crop geometry, shader or bridge mapping changed.

A new separate disabled Badge5 derived cap is prepared by
frontside_worker_cap_normal_field.py. It replaces16 nondegenerate zero-normal
pole fans with coplanar radial/angular tessellation, removes16 exact repeated-
position zero-area fans and unused zero-normal vertices, and preserves affine
positions/UV plus the directions of the authored radial smooth normal field.
Ten radii0.002..1 and6 angular divisions are predetermined training construction.
All generated normals are finite unit vectors; original outer corner bits and
winding remain. The sampled normal chord error0.01669223 excludes the central
area fraction4e-6 and is a CPU diagnostic, not an all-pixel or lighting bound.
No shader restores undefined normals. Other meshes/attributes/materials/images,
nodes/inversebinds and12clips/440056 sampler bytes independently reread exact.

Badge cap187->1354vertices and320->2112triangles add1792triangles/46176 decoded
bytes relative to the frozen selective candidate. Whole worker source41927->
44663triangles (+6.52563%) and1854202->1942138 geometry bytes (+4.74253%) pass
the prospective10% geometry budgets and narrowly fit the5% geometry-memory
proxy; actual GPU allocation and net cost are pending. New cap Uint16 indices
are lossless; indexing benefits must remain separate from culling benefits.
Web5272892bytes versus original5612688 (-6.05407%), +29664 versus frozen.
RawSHAa8b44d844015b644686a95d108b47db4cb373e7660f25c6fe5622736c30811ef,
webSHAe6158a9888cb090c8fee4fa2dc23b73b9fc13c02617cdb0bd7f8920184237863.
The badgeField option selects only this pilot, rejects combined normal pilots
or originalShadow prefix shortcuts, and maps its new faces to original source
ancestry. The first planned native sample is the same original-target closeup
WaterV6 case13 (fraction0.90625/e67.5/az144.375), real shading and shadowFront,
unchanged quantitative/control gates and affected-face raster IDs. It is a
training diagnostic and cannot approve the worker category or GPU benefit.


The native Badge unit-field closeup at HEAD8349c5ff is REJECTED, archived as
worker-badge-field-closeup-guided-*. AlphaIoU1/0missing/added and globalRGBMAE
0.000893275076 pass, but tile0.31080017693 and RGB regions4323/157pixels fail.
Affected raster coverage4434pixels on16 original faces in both arms does not
validate normals/maps. Source visible affected faces are front-facing.
The CPU normal-transform diagnostic samples12clips at5fractions: normalized
M transpose M is nearly identity (column ratio1..1.000000007; maximum Gram
pose change9.3648e-9). It does not support anisotropy as the sole explanation,
and it is not native-shader causal proof. The next badgeBaseline closeup uses
the frozen selective candidate with no Badge normals changed, same original
camera/case13 and unchanged gates, to isolate pre-existing adaptation errors.

Read-only maize-exact-component-orientation.json audits all5 original maize
states using exact numeric Float32 positions and shared edges, no epsilon or
quantized weld. Relevant whole components remain open/nonmanifold: stage1..5
boundary counts37/25/80/88/115, nonmanifold24/22/69/78/145. Regional-label0
subsets mix upward/downward faces, and are not independent closed volumes.
Signed volume is withheld for these open components. This prevents a blanket
'inverted soil' claim or global normal/winding flip based on the RGB ownership.
No source attributes, regional labels, bridges or runtime shader were altered.
