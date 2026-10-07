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
