# Global ambient occlusion and day/night visibility — active scope

User request: add suitable AO throughout Wild Guardians, tune visibility in daytime/nighttime scenes and publish repository screenshots for final user review. Work remains on codex/guardian-3d-animation; no main merge. The desktop goal still references Guardian phase 2 because replacing an unfinished goal is disallowed; that older scope is not declared complete.

## Acceptance matrix

All six biomes: savanna, desert, grand river, mangrove, volcanoes, canyons. Compare identical camera/time/settings with AO enabled and disabled, including near/strategic camera distances. Capture day and night. Preserve biome identity, translucency of vegetation, expressive faces, ground contact and bright magic. Measure incremental GPU/CPU/memory/asset size; do not claim baseline engine performance improvements.

| Group | Existing evidence | Remaining work |
| --- | --- | --- |
| Five work centers | Fresh AO maps, Suajili night adjustment, matched day/night pairs for all five cultures on savanna | Other angles/biomes, destruction/repair and combined contact shading |
| Village buildings and native props | 46 village units, 120 prop slots / 360 LOD views baked; six-biome day/night captures | Near views, individual units, combined attenuation and full cost measurements |
| Walls and gates | 20 pieces baked; damage and gate clipping preserve AO; adobe intact/damaged/ruined captures | Five-material day/night, gate motion, repair and incremental update cost |
| Crops | 40 authored stages and 32 growth bridges; eight-species midpoint day/night captures | Endpoints, wind, production cinematic lighting and Grow transitions |
| Workers and animals | Nine banks, source/runtime mapping tests; all nine models have static day/night comparisons, plus one young-male recovery cycle | Animated joints, mouths and eyelids across all models and camera angles |
| Guardian | Local AO integrated into spirit hemisphere; Grow day/night comparison | Tutorial, all spells, cloth/face animation and reveal/dissolve boundaries |
| Distant vegetation | Mangrove near-tree residency corrected and replacement captures published | Far impostor shading and visual consistency across LOD transitions |
| Terrain and rocks | Texture AO, native rock AO and resident contact atlas | Combined attenuation, especially mangrove black patches; no duplicate AO |
| Water and translucent/emissive VFX | Separate material paths | Contact/lighting consistency; preserve transparency and magic emission |

No group is globally accepted yet. New captures will be stored in this directory. Earlier center evidence remains in docs/renewed-work-centers. Final artistic acceptance belongs to the user after publication.

## First night visibility iteration: Suajili

Same native fixture, biome sabana, culture suajili, time 400, camera zoom 22, frozen simulation. `suajili-night-ao-before.png` is the prior cinematic shader; `suajili-night-ao-off.png` disables only the building AO uniform. Disabling AO lifts some cavities but the roof remains dark. `suajili-night-adjusted.png` keeps AO and raises only the cinematic building night hemisphere endpoints from (.025,.045,.055)/(.075,.13,.18) to (.04,.065,.08)/(.12,.20,.26), while reducing AO strength from .72 daytime to .52 nighttime. Day endpoints, sun, exposure, terrain and village lighting are unchanged by this edit. These are initial settings, pending other cultures/biomes.

The fixture now exposes a building AO toggle whose label refreshes after async model loading. Eight existing cinematic-lighting/AO-bank tests pass, and the adjusted shader renders in the real WorldScene. No all-scene approval is claimed.

## Rendering audit notes

Biomes contain 120 native prop slots (20 per biome), often with multiple LOD descriptors and shared texture sets, rather than individual GLBs. Their loader currently binds position/normal/UV/tangent; additional baked visibility must preserve native layouts and batching. Village/wall packs use separate geometry paths. The custom toon/illustrated shaders recompute lighting, so merely setting Three.js aoMap is not proof that AO reaches final pixels. Terrain already combines texture AO and contact visibility. Integrate at the indirect-light terms and verify each rendered path instead of multiplying final output.


## Local AO implementation checkpoint — 29 October 2026

Candidate switch: `globalAO=1`. The approved default rendering is unchanged while the remaining categories and artistic review are pending. New banks cover **120 native biome slots / 360 LOD views** and **46 village units / five cultures**. These are not all game elements: animated actors, crops, walls and distant vegetation still need their own integration or documented treatment.

`tools/lighting/bake_native_prop_ao.py` and `bake_village_ao.py` share `vertex_visibility.py`. Blender 4.5.3 casts 32 deterministic cosine-weighted hemisphere rays per unique position/normal, with local radius 12% of the asset diagonal. Each village unit is baked separately: neighboring houses in the authoring atlas cannot imprint persistent occlusion when village layouts change. The files retain the original vertex/index layouts and source hashes. Runtime uses one normalized byte per vertex, shared across instances; the native batching path carries the attribute. Native props total 1,080,841 bytes, villages 724,772 bytes, total **1,805,613 bytes**, excluding JSON metadata and screenshots. GPU residency may duplicate attributes across existing render groups; these file sizes are not a measured GPU-memory total.

The shader attenuates the approximate shaded hemisphere, preserves the direct-light excess and leaves the authored emission block intact. It replaces the former height-only local contact approximation rather than multiplying both. Strength is .50 on solid props and .28 on foliage by day, reduced to .28/.18 at night. Existing terrain/contact shading remains separate. `AO de vegetación y decorado` and `AO del poblado` controls in the real WorldScene fixture allow independent comparisons. The toggles preserve the shader and buffer allocations, so they are visual comparisons, not a complete performance baseline.

The alpha-cutout baker supports clamped UVs and transparent-hit traversal. Current native textures were all opaque at their .35 threshold, so a dedicated Blender fixture was also executed: an opaque overhead surface occludes the sample, a fully transparent one does not, and negative UVs clamp instead of wrapping. That fixture passed. Refactoring the shared baker reproduced all 16,701 bytes for the three savanna tree_01 LOD views exactly.

Validation at this checkpoint: 32 Node tests passed (bank provenance/layout, shader emission separation, asset batching/lifecycle, village bounds and existing cinematic/building AO); Blender geometric/alpha fixture passed; production build passed again after the village-loader extension. Native day/night views for all six biomes have been captured and inspected in this folder. No global visual or performance acceptance is claimed.

### Screenshot interpretation

The `*-native-on/off.png` pairs compare biome props only, before the village extension (savanna/suajili and mangrove/suajili). `*-native-village-on/off.png` pairs compare both new banks (desert/saheliana, grand_river/musgum, volcanoes/etiope, canyons/mapungubwe). Existing work-center AO, terrain contact and cinematic lighting stay enabled in both views. These are real WorldScene screenshots, seed 712, medium quality, strategic zoom 22, day time 150 / night 400, frozen presentation. The night fixture also introduces its test hyena. Initial savanna/mangrove day pairs include an object-fade settling difference and should not be treated as pixel-exact photometric measurements. Foreground tree transparency in volcanes is the existing camera-obstruction treatment.

The newly baked local AO does not change mangrove water placement or terrain shading. The screenshots alone do not certify every island/water layout or every asset: near views, individual village units, animated mouths/eyelids/cloth, all crop states, wall transitions, far LOD treatment and paired performance measurements remain outstanding. `animated-and-crop-audit.json` identifies the actual runtime source files for the next pass; none declares an occlusionTexture channel, though albedo textures may contain painted shading.

Canyon captures use two 90-degree camera turns to avoid a rock wall obscuring the center. The fixed-offset nighttime QA hyena appears on the cliff in this fixture; those images do not validate animal placement, navigation or ground support. No gameplay fix is inferred from this lighting trial.

Browse [the side-by-side contact page](comparison.html). This is an intermediate checkpoint, not the requested final all-elements delivery.

## Mangrove foreground impostors: corrected residency handoff

The earlier `mangrove-*-native-*.png` images are superseded for tree AO validation: nearby trees were still billboards. The source geometry was loaded and fenced, but the separately required standby bank lacked those IDs. While one upload was in flight, a logical preload request replaced a queued physical-tree request. Since the native fence had already succeeded, that physical demand was not retried.

`NativeTreeStandby.request` now coalesces pending demands by ID, with the latest identity/LOD winning. Existing distance pruning, population limits, GPU fences and resource checks remain active. This fixes a scheduling race independently of AO values; it does not bypass GPU readiness or force full-detail trees at every distance. No claim is made about whether AO loading timing made the race more likely.

The new `mangrove-{day,night}-resident-{on,off}.png` pairs show the native WorldScene with actual nearby 3D trees. Both native-prop and village AO are toggled; center AO and ground contacts remain on. The hyena has the in-progress local model AO held constant in the night pair. Same seed 712, medium quality, zoom 22, frozen day 150/night 400. Root and branch geometry was visually inspected. Four 90-degree camera turns were exercised; this is not an exhaustive navigation or performance validation.

`mangrove-residency-report.json` records the inspected tree identities, prepared coverage and transition readiness. For diagnostics add `farTreeReview=1` to the lightingReview fixture URL; expensive tree inspection is opt-in and not part of gameplay. Regression test reproduces overlapping physical/logical requests behind a held fence and verifies that all identities survive, with the newest LOD preserved. Existing fence, disposal, culling and population tests remain passing.

## Animated local cavity AO candidate

Nine sidecar banks now cover the five beasts and four worker profiles (313,691 bytes total, one normalized byte per vertex). They remain gated by `globalAO=1`. Geometry, indices, UVs, skins and morph deltas are untouched, including in the shipped compressed GLBs. The loader resolves both catalogue and input URLs through the runtime asset aliases before matching; otherwise the browser's absolute URLs silently skipped the banks.

Bake with Blender: `blender --background --python tools/lighting/bake_model_ao.py -- --profile hyena` (also lion, warthog, buffalo, rhino, worker-youngMale, worker-youngFemale, worker-olderMale, worker-olderFemale). After changing source assets regenerate the corresponding bank and update models.json source metadata. Source and output SHA256 values are checked by tests.

This is deliberately local, static cavity visibility: a 3.5%-diagonal radius for skinned primitives, 32 hemisphere rays, no inter-primitive occlusion. Moving morph vertices and triangles touching them are excluded; hits on unrelated dominant joints are skipped. This avoids freezing a closed mouth or arm pose into a shadow, but is not dynamic AO. The dominant-joint approximation and exclusion boundaries still require close visual inspection during animation. Indirect attenuation is bounded to 32% day / 20% night; direct light and emission remain separate.

All nine original and compressed models pass primitive mapping, unchanged geometry/skin/morph identity, source hashes and full visibility of moving facial vertices. A real Assets loader test covers aliased URL registration. Blender fixtures cover cutout alpha, deterministic output, cross-joint rejection and coincident receivers with different joint IDs. Fourteen selected JavaScript tests and both Blender fixture sentinels passed. This is a technical checkpoint, not visual approval of all nine characters. Crops/bridges and the Guardian's custom spirit shader remain unregistered pending their dedicated integration. The old duplicate draft captures have been replaced by actual `hyena-{day,night}-model-{on,off}.png` pairs: frozen frontal WorldScene view in mangrove, with only model AO toggled. Day comparison changes 76,692 pixels (maximum channel delta 21/255), confirming a live shader effect; this is not a performance measurement. No browser errors were reported. Hiena day/night was visually inspected, but the other eight characters and animated facial/joint boundaries remain pending. Production build passes (538 modules; existing mixed-import and large-chunk warnings).

## Guardian spirit material integration

The Guardian sidecar adds 17,733 visibility bytes. `guardianMaterial` consumes the normalized attribute only when the source has an AO bank. It attenuates the indirect hemisphere by at most 28% day / 16% night, leaving direct excess, spiritual glow, reveal edges and dissolve emission intact. Without the candidate bank its original shader path remains available. The new shader material shares the AO toggle and borrows the original textures without taking disposal ownership.

`guardian-grow-{day,night}-{on,off}.png` records Grow frozen at 0.72 seconds in the native mangrove scene. Both pairs were visually inspected; the day pair differs in 12,873 pixels (max channel delta 25/255). Night differs in 9,948 pixels (max 12/255), including the fixture hyena because the model toggle affects all characters. The night button spawns that hyena at its fixed QA offset: this pair does not validate placement around an existing animal. On resuming the spell, active/visible Guardian counts returned to zero, maximum visible count was one, and browser errors were empty.

Three focused tests pass: source/compressed model mappings (now including Guardian), loader aliases, and the optional spirit material preserving the reveal/emission shader tail, shared toggle and texture ownership. This validates Grow's rendered candidate, not all tutorial expressions, all spell phases or incremental performance; those remain open.

## Crop stages and authored transitions

The candidate now includes all 40 crop stages (232,787 visibility bytes) and 32 V4 bridges (538,722 bytes). Run `bake_model_ao.py -- --profile crops` in Blender, then `blender --background --python tools/lighting/transfer_crop_bridge_ao.py`. The latter validates source/bank hashes and matches every bridge vertex to its own A/B stage using role, UV, position and normal. The V4 backface-protection displacement is 0.000015; the largest measured match distance was 0.0000150595, below the enforced 0.00003 bound. All 538,722 vertices matched. Unmatched data fails rather than assigning a guessed shadow. No AO is baked between overlapping A/B plant states.

V4 batches retain this dedicated attribute. Legacy generated bridges copy each original corner's stage AO during preparation. A stage with AO cannot silently create a V4 bridge without its bank. Tests load original/shipped models and construct all 72 batches, checking visibility attributes and exact preservation of bridge arrays. Seven selected tests passed across model AO and crop lifecycle; production build passed. This is static stage cavity AO, not dynamic light transport during growth or wind.

`crops-bridge-day.png`, `crops-bridge-night.png` and `crops-bridge-report.json` were captured from the existing crops-v4-world fixture with globalAO=1. All eight species are at t=0.5 of their third-to-fourth-stage transition, using real WorldScene/crop shaders. No WebGL/browser error was observed. This older isolated fixture uses legacy Navigation and its own lighting; it does not validate the production spatial-WASM biome layout or the final cinematic-lighting balance. Full before/after pairs, all transition endpoints, wind and Grow in the production scene remain pending.

## Wall and gate local AO candidate

Twenty packed wall/gate/damaged/ruined pieces now have a 71,367-byte sidecar. Bake with `blender --background --python tools/lighting/bake_wall_ao.py`. A 4%-diagonal radius and per-vertex first incident region filter limit static visibility to local structure; this is an approximation, not dynamic fragment occlusion. All source position/normal/index/region hashes and the bank hash are tested. Runtime verifies piece URL/count/offset before binding, under globalAO=1.

`wallBridge` expands visibility alongside each indexed corner. Gate clipping interpolates it with other vertex fields, so new cut vertices cannot lose their value or misalign it. Runtime wall AO uses Float32 for these interpolated values. During regional damage morphs, attenuation is released towards unoccluded at the midpoint and returns to the authored endpoint visibility; an opening leaf similarly releases its baked shade. This avoids retaining a closed-wall shadow after geometry separates, but may soften cavities temporarily. Updates occur in the existing changed-pose path; incremental cost remains unmeasured.

Selected wall/asset lifecycle tests passed (15 distinct tests across two runs), including five materials, five HP values and three gate openings; production build passed. `wall-adobe-{intact,damaged,ruined}.png` shows 300, 140 and 0 HP after real hitStructure commands in the isolated walls-world WorldScene fixture; no browser errors were reported. That fixture uses legacy Navigation, a running clock and its own lighting, so these are state/appearance checks, not frozen AO comparisons or production biome-layout approval. All-material day/night pairs, repair visuals and performance remain pending.


## Resource inventory and performance comparison scope

Run `node tools/lighting/audit_ao_resources.mjs` to regenerate `resource-inventory.json`. The script checks every binary against its declared byte length and SHA-256 before reporting totals. Current 24 optional banks contain **2,979,913 binary bytes** and **213,395 metadata bytes**, including the model catalogue. This is the complete on-disk candidate inventory, not the amount fetched in one biome. Existing center AO textures, terrain/contact atlases and impostor atlases are excluded.

These totals are not GPU-memory measurements: render groups can clone buffers, and wall clipping expands/interpolates visibility into Float32 corner attributes. Nor do uniform-toggle comparisons measure the complete AO overhead: attributes remain resident and shaders retain their AO operations. Those toggles are valid for artistic comparisons only.

For an incremental runtime comparison, load the same native scene in separate runs with `globalAO` absent and with `globalAO=1`. Keep seed, biome, culture, camera, quality, pixel ratio, clock and entity population fixed. Wait for model/tree preparation to finish in both runs and record their readiness; discard hidden-tab samples. Alternate run order, separate cold loading from warmed frame measurements, and retain raw frame samples. Report p50/p95/p99 frame time, CPU animation/VFX time where instrumented, draws, active effects/physics and allocation/residency evidence. Include idle, one cast and consecutive casts; do not attribute existing engine stalls to AO without a reproducible paired difference. No full-cost result is claimed yet.


## Lion and buffalo day/night comparison

`lion-{day,night}-model-{on,off}.png` and `buffalo-{day,night}-model-{on,off}.png` show frozen frontal views in the native mangrove/suajili WorldScene. The studio time buttons set time 150/400 without replacing the selected animal or changing the camera. Model AO is the only toggled shading contribution; crops also share that toggle. Browser errors were empty. Pixel differences are recorded in `lion-buffalo-ao-report.json`; they prove a visible shader contribution, not quality or performance acceptance.

Lion markings and ornaments remain readable in these views. The buffalo crest and muzzle are very dark in both on/off images: simply reducing AO would not address the underlying appearance. Keep its material/lighting evaluation open, including strategic-distance views and other orientations. These static captures do not validate moving joints, facial animation or ragdoll transitions.


### Buffalo darkness diagnosis

`buffalo-albedo-diagnostic.png` uses the existing `beastLighting=albedo` diagnostic in the same native scene. The beast shader returns `filmic4(albedo)` before key/fill, shadow, local AO and contrast terms. Crest and muzzle remain dark in this view, establishing a dark base-color contribution; it does not imply lighting has no further influence. The diagnostic is not a final appearance or pixel-matched pose comparison. Browser warnings/errors were empty.

The registered raw buffalo GLB retains `_FUR_LIGHT` on Mesh_0. Its authoring script deliberately masks dorsal fur while excluding face/eyes/decorations, and the shader applies that fill only in normal beast style. Do not remove the face darkness by disabling AO globally, or assume that the dark crest means its attribute was lost. Further adjustment should preserve black fur identity and evaluate material/contrast at strategic distance, separately from AO strength.


### Preserve near-black detail in beast contrast

The beast contrast operation previously clipped channels below about 0.036 to zero. It now blends from the uncontrasted value to the original curve over 0.02-0.14 using smoothstep. Pure black remains black; values at/above 0.14 retain the old curve exactly. `beast-contrast-curve.json` records 10,001 numerical samples with monotonicity and endpoint checks. This applies to the beast lighting path (the separate legacy warthog path is unchanged), independently of the optional AO switch; workers, Guardian, terrain and building shaders are unchanged. Shader cache revision advanced. No additional textures or lights.

`buffalo-contrast-day.png` and `buffalo-contrast-night.png` were inspected in native WorldScene after the change. The dark fur identity remains; this is deliberately a small correction, not a claim that all dark areas now have rich texture. Pose timing differs from the earlier captures, so those files are not pixel-matched before/after evidence. Ten material/AO tests and production build pass. Browser rendering succeeded; the driver emitted potentially-uninitialized-variable warnings in the environment/toon functions during compilation, so this run is not warning-free. Other species, strategic-distance motion and incremental GPU cost still need review.


## Rhino and warthog local AO review

Eight `rhino/warthog-{day,night}-model-{on,off}.png` captures add frontal native WorldScene comparisons at time 150/400, frozen pose and medium quality in mangrove/suajili. Skin, face markings and tusks remain legible in these views; no runtime errors were reported. The model toggle also affects crops. `rhino-warthog-ao-report.json` records changed pixels, not performance. Rhino uses the revised near-black contrast; warthog retains its separate existing material path. Static frontal inspection does not establish all-angle or animated acceptance. The gallery now includes all five beast comparison sets; lion/hyena and the first buffalo pairs predate the contrast revision and must not be mistaken for new-revision regression coverage.


## Older workers: facial AO comparison

`olderFemale/olderMale-{day,night}-model-{on,off}.png` captures the initial worker-hit expression, frozen before the fall, with closed eyelids and open mouth. The attacking animal was removed using the day control; studio time then switches 150/400 without replacing the worker. Actual native WorldScene, mangrove/suajili, medium quality. Browser errors were empty. Wrinkles remain visible in these views. These are facial close-ups, not full-body framing or completed blink/fall/recovery evidence.

The older male shows pronounced nocturnal skin highlights with AO both enabled and disabled; material response and other angles remain open. Do not certify night appearance solely from this AO comparison. Young profiles, open eyes, movement and strategic-distance visibility remain pending. `older-workers-ao-report.json` records the limited scope and image differences.


### Older male matte material parity

The shipped olderFemale body has `matteWorkerBody` metadata and roughness 0.88; olderMale BakedMaterial lacks that metadata. Worker adoption now applies the same existing matte shader response, roughness 0.88 and metalness zero to the olderMale body atlas only, before attaching it to the scene. Tool and oral materials, textures and normals are preserved; other profiles are untouched. Raw source files and their AO hashes remain unchanged.

Eight focused tests and the 539-module production build pass. `olderMale-matte-night.png` is an actual native WorldScene inspection of the hit expression. Some facial highlights remain visible, so this corrects missing material configuration but does not establish complete resolution of the waxy appearance. Environment response and painted highlights still need isolation. No additional runtime lights, textures or per-frame traversal are introduced.


### Matte worker environment reflection

The matte body variant now scales the environment reflection by 0.006 instead of the general toon coefficient (0.03 plus roughness-dependent terms). The diffuse lighting and normal/texture data are unchanged. This applies to materials explicitly marked matteWorkerBody: currently the older female authored body and older male adoption treatment. Tool materials retain their existing reflection. Shader cache advances to worker-matte-v2.

Four `olderMale/olderFemale-matte-reflection-{day,night}.png` captures were inspected in native WorldScene. The older male nocturnal face loses the pronounced environment glints while wrinkles remain visible; both profiles retain readable facial forms in the sampled pose. These are close-ups of the initial hit expression, not a complete movement/all-biome acceptance. Eight material-isolation tests and the 539-module production build pass. The change adds no maps, lights or per-frame CPU work; GPU cost has not been measured.


## Young workers: facial AO comparison

Eight `youngFemale/youngMale-{day,night}-model-{on,off}.png` captures use the same frozen initial hit-expression procedure as the older workers. Native mangrove/suajili WorldScene, time 150/400, medium quality, closed eyes and open mouth. No runtime errors reported. Local AO produces restrained darkening in these views. YoungMale hair retains a strong highlight even with AO off; this remains a material-review item, not an AO bake failure.

All nine worker/beast profiles now have at least one day/night AO comparison, but coverage is limited to these poses and angles. Open eyes, continuous facial animation, moving joints, all-biome strategic visibility and measured cost remain unverified. `young-workers-ao-report.json` records the scope and pixel differences.


## Young male animated worker cycle

`youngMale-motion.mp4` records the native Game.tick worker hit, fall, recovery and resumed flight with globalAO enabled. Report: 9.098 simulated seconds, finished=true, final fall=0/recovery=null, errors empty. Encoded video is 15.8 seconds, 2,070,497 bytes, silent 30 fps H.264; it includes capture/loading stalls and is not a frame-performance comparison. `youngMale-motion-report.json` contains state and facial-weight samples.

The 1.5-second contact sheet was visually inspected through the fall, supine pose, rise and return to movement. No detached large AO patch was evident in those samples, but the nighttime camera is too distant/dark to certify fine facial or joint shading. Continuous close-up validation and the remaining profiles remain pending. The contact sheet final empty cell is padding beyond the video end.


## Fresh-load idle performance harness

The combat fixture now exposes `benchAOScene`: a fixed day/angle/zoom idle run with 5 seconds settling and 10 seconds raw frame samples, one run per page load. Compare separate loads with globalAO absent/present; model-uniform toggles cannot substitute for this. It records camera, population, framebuffer size, pixel ratio, actor/tree readiness, renderer memory, hidden frames and raw CPU/frame samples. It does not measure GPU time or shader memory, and requires matching metadata and alternating repetitions before attribution.

`idle-ao-on-run1.json` is a diagnostic first run only: 147 frames, no hidden frames/errors, tree preparations all idle. Frame p50 66.53ms, p95 99.62ms; render CPU p95 12.97ms; 82 draws. Other QA tabs remained open, so browser/device contention is not excluded. No AO-off pair or repeated runs yet: these values do not prove AO overhead, a regression cause or satisfactory performance. Script syntax validation passes.


### First single-tab off/on pair

Closed the three other agent-owned QA scenes, then loaded AO-off and AO-on separately in the same tab. Both report native spatial-wasm, mangrove/suajili, medium, 1600x900, pixel ratio 1, identical camera/time/population, actors ready, no pending tree preparations, no hidden frames/errors. Raw samples and metadata: `idle-single-tab-{off,on}-1.json`; comparison: `idle-single-tab-comparison.json`.

Off/on frame medians are 33.235/33.240ms, p95 33.365/49.885ms; render CPU p95 14.405/14.400ms. The on run has 82 versus 80 draws, 328 versus 326 geometries and 215 versus 208 textures. Those resource differences require investigation before interpreting the timing delta as shader-only AO overhead. One pair in one order is insufficient for attribution or approval. Repeated alternating runs, effects/raid scenarios and GPU-byte accounting remain pending. No baseline engine performance diagnosis is made here.

## Draw-call audit follow-up

The QA-only `auditAODraws` button captures a forced render outside timing. Fresh on/off reports (`draw-audit-on.json`, `draw-audit-off.json`) both report 82 calls, 328 geometries and 215 textures. Their intercepted draw descriptors match when the AO attribute count is excluded. Thus the earlier 80-versus-82 difference is not reproduced as an inherent AO draw cost. The earlier timing pair remains inconclusive; this audit does not identify the cause of its resource discrepancy or measure GPU memory.

## Sahelian center: combined lighting comparison

`saheliana-{day,night}-{combined-on,building-off}.png` compares only the center AO toggle with all other global AO, cinematic light and contacts held on. Native spatial-WASM savanna, seed 712, medium quality, fixture camera distance 22, paused clock 150/400. Roof, posts and facade remain readable in this inspected night angle; AO adds local relief without introducing large black patches. No further shader adjustment was made from this pair. This is not all-angle, all-culture, destruction or performance acceptance. Conditions are retained in `saheliana-comparison-report.json`.

## Five-culture fixed-view checkpoint

The Sahelian pair is now joined by Mapungubwe, Musgum, Etiope and Suajili day/night pairs, under the same native fixture settings with all global AO banks active. Only building AO is toggled within each pair. See `centers-combined-report.json` and `comparison.html`. All four additional scenes report no errors. Entrances, roof detail and supplies remain legible in the inspected night views; the building AO primarily strengthens recesses and joins. No shader change was warranted by these particular views. Saturated foreground foliage is noticeable and remains part of the combined-lighting review, not attributed to AO by this building-only test.

These 20 screenshots cover five cultures, one savanna scene per culture and one fixed angle each. They do not establish all-angle/all-biome acceptance, animated destruction/repair, or incremental performance.

## Guardian Multiply: close-view lighting and dissolve

The QA fixture now offers `Detalle del Guardian activo`: it pauses an active summon and frames its current bounds from a frontal three-quarter angle without changing the character or world lighting. It is disabled during measurement/recording and does nothing without an active visible summon.

New Multiply captures cover strategic arrival at .12s, solid pose at .72s, frontal day/night AO on/off detail at .72s, a back view, and nocturnal dissolve at 1.92s. Eyes, hands and cloak remain readable; the luminous breakup remains visible. Cleanup at 2.76s reports zero active/visible summons, maximum one Guardian and no errors (`guardian-multiply-review.json`). These are paused poses, not full-motion or all-spell approval. The model toggle affects all loaded local model AO; native vegetation is held constant, but distant LOD preparation can continue after camera moves, so backgrounds are not a pixel-difference control.

## Shield and Attack: close-view AO evidence

Shield has day/night detail at .72s; Attack has a night release view at .12s and day/night impact-phase views at .30s. The eye/hand/energy response remains visible with AO enabled. Changing world time also changes the wind pose, so the day/night images are not identical-pose pixel comparisons. The target is outside the close framing; these do not validate impact contact or recovery. Both summons finish with zero active/visible Guardians and no errors, maximum one visible (`guardian-shield-attack-review.json`).

The close Attack views expose substantial mantle folding during the gust. This is an explicit open artistic check for motion review, not accepted cloth behavior from these stills. Grow, Multiply, Shield and Attack now have scoped AO lighting evidence; complete moving cloth/facial and tutorial validation remain open.

## Repeated-pose accumulation corrected

Close Attack inspection exposed a runtime layering bug: AnimationMixer can skip writing unchanged sampled transforms, while additive wind and aiming continued modifying those bones on every render. A frozen clock could therefore accumulate a gust indefinitely. `GuardianPose` restores the last mixer-only bone transforms before each sample and captures the clean result before procedural layers. Summons, tutorial guidance, prewarm, ritual and standalone Guardian share this path. Storage is allocated once per model; no new per-frame arrays, meshes or materials are created. Authored wind amplitude is unchanged.

Regression tests reproduce the old drift, repeat a frozen pose 240 times, seek/resume/disable layers, and exercise the installed rig in all four spells at four ages with 60 repeated renders each. The focused 24-test suite passed before the additional installed-rig test; the final pose file has three passing tests. Production build passes (540 modules; existing mixed-import/chunk warnings). Prior close Attack stills showing extreme folded cloth are historical evidence of this bug and are not accepted mantle poses. Full-motion artistic validation remains open.
