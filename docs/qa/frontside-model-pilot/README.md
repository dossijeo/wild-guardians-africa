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
