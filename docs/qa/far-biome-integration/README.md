# Far biome integration: candidate

Normal gameplay has not enabled this candidate. The native-world fixture `tests/browser/far-biome-world.html` uses a paused world without saved games. `compact=1` tests a smaller resident radius: 1 versus 2 for medium, 2 versus 3 for high, and a 40-60 m tree transition. Defaults remain unchanged.

## Earlier same-residency experiment

`savanna-abba.json` was captured before the backdrop and cancellation changes in a9436f1, with 25 chunks and a 60-90 m tree transition. Four lots of 120 frames: GPU medians A1 24.70, B1 23.82, B2 24.97, A2 22.32 ms; CPU medians 6.6-6.7 ms. All 480 queries were valid. This does not demonstrate a sustained speedup. Triangles 960,014 to 955,799; calls 59 to 64.

The current version uses one continuous, lower backdrop cylinder instead of eight panels. It owns late arriving resources during cancellation. The initial JSON does not measure those changes.

`savanna.png` shows the initial elevated day camera. `savanna-horizon-night.png` also shows the initial elevated camera after a development reload; its filename is misleading and does not evidence a low horizon test.

## Memory

Four active species require eight RGBA 1024-square atlases: approximately 42.67 MiB with mipmaps; one RGBA 2048x512 backdrop adds approximately 5.33 MiB. Canyon uses two species (21.33 MiB plus backdrop). These are storage estimates, not measured total GPU/CPU memory. WebP transfer size is not decoded memory. Tests verify current-biome-only fetching and cancellation release of late textures and adapters.

Visual matching, coarse terrain seams, reduced residency navigation, angular transitions, quality profiles and combined cost still require evidence before normal gameplay activation.

## Compact-residency Sabana ABBA (bd1da2f)

`savanna-compact-abba.json` contains all 480 GPU samples, four lots of 120 frames at the same camera, 1600x900 framebuffer and medium quality. GPU p50 A1/B1/B2/A2: 21.784/18.433/18.447/21.630 ms; CPU p50: 6.5/3.9/4.2/5.9 ms. Calls: 59/43/43/59; triangles: 960014/726721/726721/960014. No disjoint, context loss, hidden frames, pending queries or game-state changes. This view shows a consistent reduction, not an FPS claim for other views/devices/biomes.

The earlier failed attempt produced no measured lots: the preceding webview stopped advancing preparation. A fresh tab completed the same source. The fixture now reports native loading stages and keeps frames running while awaiting changes in residency.

`savanna-compact-seam.png` records the flat-color seam before the mapped-ground fix. `savanna-compact-mapped-ground.png` records the later textured result, and `mangrove-mapped-ground.png` records full-residency Mangrove with shared base material. Water shoreline precision and all movement/day/night checks are still pending.

After the measurement, the world loader gained an explicit fourth argument `{farVegetation: options}`. It defaults to false; the normal game requests no far textures/worker. Optional `residentRange` ownership restores the preceding radius on disable/dispose. Logical raid-entry bounds retain normal quality radius, independently of the visual resident radius. Four directed world-sync tests verify this and preserve navigation route/suppression objects.

**Activation blocker:** the compact-residency experiment also shrinks `terrainMeshes` used for picking. A player could see approximate distant ground that cannot be clicked. A visual-only reduction with exact picking coverage, or an exact terrain fallback, must be validated before activation. Compact radius must not be presented as a completed gameplay optimization.

## Visual-only residency experiment (before exact-ground split)

`savanna-visual-abba.json` keeps 25 CPU chunks and 25 exact picking meshes but renders nine complete chunks. GPU p50 A1/B1/B2/A2: 21.369/18.555/18.079/19.744 ms; CPU p50: 5.5/5.2/6.1/6.3 ms. All 480 GPU queries are valid and game state unchanged. A1/A2 drift is significant (about 8%); both B lots are below both A lots in this single view. Calls and triangles are identical to the compact-residency case above.

This experiment still replaces visible distant ground with a coarse surface while allowing exact picking. Crops or buildings in that region can therefore disagree with its height. It is not accepted for gameplay.

The next candidate, `compact=trees`, keeps the original exact terrain rendered and pickable and shortens only native prop rendering. Clip/water batches remain intact, including their shadows. Logical IDs, transforms, hazards, and routes remain resident; hidden props regain rendering as the camera moves. The default optional-controller setting is `preserveTerrain: true`; `compact=visual` explicitly disables it for comparison. Twenty-two targeted tests pass, including original raid bounds, ownership restoration, merged and fallback prop selection. No performance result from the whole-chunk experiments is attributed to this new candidate.

## Exact terrain / shorter prop residency (8df30bd)

`savanna-tree-only-abba.json` was measured after integrating main f806e29, before main b93df1a. Original 25 exact rendered/pickable terrains remain loaded; candidate renders native props from nine chunks and retains native clip/water batches. The four lots contain 120 frames each at the same camera/framebuffer as above. GPU p50 A1/B1/B2/A2: 24.550/22.317/21.737/22.405 ms; CPU p50: 6.1/5.6/5.6/6.4 ms. Calls 59/49/49/59, triangles 960014/745279/745279/960014. All 480 queries valid, no disjoint/context loss/hidden frames/pending queries/game-state changes.

A1/A2 drift is about 9%; B1 is nearly the same as A2. This demonstrates fewer submissions in this view, **not a robust GPU improvement**, broad FPS claim or mobile result. Atlases remain allocated while the optional layer is toggled off during A lots; this benchmark does not compare memory allocation.

## Native visual smoke checks (main b93df1a integrated)

All files listed below come from one Mapungubwe village, seed 712, no gameplay saves. Four profiles are represented, not a full biome Ã— culture Ã— quality matrix. Native camera operations also clamp distance/height and may cross chunk borders; the JSON reports actual coordinates.

| Biome | Quality | Evidence | Observation |
| --- | --- | --- | --- |
| Sabana | Medium | `savanna-tree-only-horizon-day/night.png` | Low horizon; backdrop remains too flat/blue. This is an acceptance counterexample. |
| Gran CaÃ±Ã³n | Medium | `canyon-tree-only-day/night.json/png`, `canyon-tree-only-orbit.png` | River and cliff terrain retained. Two resident species. Horizon-button view could enter a cliff; orbit view exposes mesa backdrop. |
| Volcanes | Medium | `volcano-tree-only-day/night.json/png`, `volcano-tree-only-moved.png` | Lateral 96 m movement changes region to 192:0; native preparation settles without GL errors. Nearby baked billboards can visibly simplify the silhouette while models prepare. |
| Manglares | High | `mangrove-high-tree-only-day/night.json/png` | 49 exact terrains and 25 prop chunks; water channels/moss remain native. Angular movement and night phase tested. |
| Gran Río | Low | `river-low-tree-only-day/dusk.json/png` | Original river near terrain; angular movement and mixed day/night atlas phase. Coarse far shoreline remains approximate. |
| Desierto | Very low | `desert-min-tree-only-day/night.json/png`, `desert-min-tree-only-horizon.png` | Native dunes/coarse horizon retained; mesa backdrop visible. Sparse tree population in reference scene. |

Recorded JSON checks show zero world/shader/WebGL errors; no missing-biome asset exception. Static captures are not proof of imperceptible animated transitions. Native 8Â° atlas elevation is appropriate for distant trees, but the 40â€“60 m candidate transition remains visibly simplified in elevated/teleported views. Remaining acceptance work: slow approach/retreat and lateral/orbital recordings, delayed-chunk perception, precise far shorelines, backdrop art/composition, independent performance repetitions, mobile/device memory and other cultures. The optional loader is connected but **normal gameplay remains OFF**.

Runtime atlas storage is bounded by active biome (eight 1024Â² atlases for four species or four for canyon), plus one backdrop. Cancellation tests release every borrowed/owned late resource exactly once; those tests do not measure browser caches, driver residency, decoded CPU images or total game RAM. Distributed atlas transfer is 20,450,296 bytes for all 22 species, not 235 MiB of simultaneous GPU textures.

## Slow approach counterexample (after 287099e)

The fixture now has 20-second native-camera paths for approach/retreat, orbit and lateral movement; it selects an unsuppressed slot-0 tree and reports completion and unchanged game state. Only approach has been run so far. `savanna-slow-approach-mid.png` shows selected tree `0:9:2` during approach/retreat with readiness zero; `savanna-slow-approach.json` records final state and preparation counters. The final view is far again, so readiness zero there alone is expected and does not prove a failed near handoff.

The same report contains approximately 100 cancelled preparations per species over the movement versus 10â€“12 useful completions. This repeated cancellation is an acceptance blocker to investigate, not a successful motion test. One candidate cause is texture preparation re-yielding between already initialized textures on each native packing generation; that hypothesis still needs a repeated native path after correction. No FPS/cost claim is made for this path.


## Warm-texture preparation isolation (5965323 + temporary alias)

A temporary Vite alias replaced only the GPU preparation helper, leaving the source revision under the serial full-test suite unchanged. The candidate remembers initialized texture wrapper/source versions per renderer, invalidates on disposal/context restoration and keeps compile, zero-pixel draw and fence for every new native packing. Fourteen isolated tests pass, including late cancellation, failed upload, context loss/restoration and listener ownership.

`savanna-cache-approach.json` repeats exactly the same slot-0 tree `0:9:2`, 20-second 140Ã¢â€ â€™25Ã¢â€ ’140 m path. The selected tree reaches readiness 1 first at 10.216 s; only 28 of 164 near frames (â‰¤40 m) have readiness 1. Useful preparations at completion: 21/20/19/17; cancelled: 95/89/93/91. No game-state or WebGL errors. These counts show increased useful completions but **do not resolve the continuous-motion transition**.

`savanna-cache-hold.json` adds a three-second stationary hold at 25 m. Readiness 1 occurs first at 10.203 s, with 115 of 261 near frames fully ready. Useful preparations: 32/28/28/23; cancelled: 76/73/74/75. This verifies that the handoff can settle when stationary; renewed motion still invalidates it. Counters are not a performance benchmark, and the duration/near-frame counts differ between these two paths.

Next isolated check: scope render-generation invalidation to the tree species whose proof is being prepared. Currently replacement of any merged prop geometry invalidates all tree species; CPU batch records also reset when LOD packing changes. Neither cache-only result is accepted for gameplay activation.


## Species-scoped preparation (89373e3 + temporary alias)

The signature now includes only color renderables for the corresponding tree slot, material/geometry generations and render-origin/context revisions. Changes of unrelated props no longer cancel that species. CPU packing snapshots remain exact: obsolete packing is rejected rather than authorizing added/replaced trees. Eighteen isolated tests cover these invariants; a further owner-lifecycle check removes renderer context/texture listeners on biome disposal.

`savanna-scoped-approach.json` repeats the original 20-second path with the same tree. Useful preparations 33/24/11/17, cancelled 3/3/1/5, rejected packing 0/0/0/0; 128 of 171 near frames fully ready, first at 8.235 s. `savanna-scoped-hold.json` adds the same three-second wait: 215 of 259 near frames ready, cancelled 3/3/1/4; one obsolete packing in slot 1 is correctly rejected. No game-state or GL errors. Cold/transient chunks still need preparation, and the initial fade interval is included in near-frame counts; these are not FPS results.

`savanna-scoped-near-ready.png/json` explicitly records the selected tree at 25 m with readiness 1, 11.53 s into a longer hold. Native obstruction dithering remains enabled, so the screenshot is technical handoff evidence rather than finished horizon art. The low Savanna backdrop remains an acceptance counterexample.

The serial full suite on the preceding runtime/base (main b93df1a integrated, before warm-cache and Tinify merge) completed **2632/2632 PASS**, no skips, 2447538 ms. After integrating main bccdd74 and the cache/signature changes: **164 targeted tests PASS**, 24 cache/signature/owner tests PASS, build PASS, web package **640 files / 399497252 bytes / 859 relative links / 20 runtime GLBs**. Those checks do not replace the remaining motion and biome visual acceptance.

After merging main d048270 (voices/cards and village atlas compression), **171 targeted tests PASS**, build PASS and package validation PASS: **694 files / 405571330 bytes / 859 relative links / 20 runtime GLBs**, including the voice hashes. The native orbital/lateral fixture now runs at 40 m rather than 82.5 m, so it exercises the 40â€“60 m candidate transition. This fixture change is not a completed visual test.

Shortened prop residency also removes native prop casters outside that radius. Zero-color compaction preserves shadows inside the retained prop region, and native terrain/water remain exact; this does not establish identical shadows from trees beyond the shortened region. The impostors themselves do not cast dynamic shadows. This distinction is a visual acceptance limit of the shorter-radius candidate and must accompany its earlier measurements.

## Real-source motion and per-LOD counterexample (d4bde94)

`savanna-native-approach.json` uses source runtime on port 5192 after main d048270, not the temporary alias. Its 23-second approach/retreat reaches 25 m: 216/259 near frames ready, two readiness descents, unchanged game state and zero GL/errors. `savanna-native-orbit.json/png` completes a 20-second orbit at 40 m but records six descents. `savanna-native-lateral.json/png` completes at 40â€“44.7 m, ends ready and keeps state unchanged; its â‰¤40 m counter includes only one frame and cannot establish stability of the whole transition. These results are not accepted as uninterrupted handoff.

`savanna-native-orbit-diagnosis.json` is an explicitly **partial** diagnostic recording: it was closed before the path completed. Its bounded traces show physical CPU coverage remaining present while packing/resource proofs are invalidated. The same species' unrelated LOD geometry can change while the selected near LOD stays unchanged.

The subsequent candidate therefore records immutable packing separately for each native LOD mesh and binds its fence to that LOD's source and merged geometry/material plus origin/context generation. Changing another LOD cannot revoke an unchanged packing, while replacing matrices, adding IDs or replacing its own resource still rejects the old proof. Thirty-nine focused tests pass, including partial fence acceptance and rejection of new/replaced IDs. Native repetition of this finer candidate is still pending.

The repetition on 5d8f853 is now retained in `savanna-lod-approach.json`, `savanna-lod-orbit.json/png` and `savanna-lod-lateral.json/png`: approach 223/258 near frames ready, with two near descents; orbit still has own-packing descents; lateral has **514 transition frames, 488 ready and zero descents**. All paths complete and retain game state without GL/errors. Per-LOD proofs improve granularity but do not solve changes of the tree's own packing. The 176 directed tests/build on that revision pass; no visual acceptance or FPS improvement is inferred.

A further candidate retains a previously prepared native tree representation in two reusable owned banks per species. Frozen matrix/ID/transform identity and resource generation are validated; each replacement bank receives a real upload draw/fence before becoming available. Only trees whose ordinary native replacement lacks its strict packing proof use the standby; their ordinary replacement stays hidden, and the standby does not cast shadows. Banks preserve the earlier prepared visual during asynchronous replacement, borrow CPU source arrays/materials but own GPU attribute identities and instance buffers, and release late uploads on world close. Eleven focused tests pass. Added GPU storage and transient draw/vertex costs must be measured with native motion before accepting this candidate.

## Retained representation guarded by current selection (d848178 + guard, main cee494f)

`savanna-standby-initial-counterexample.json` records the first standby integration before its current-selection guard: one retained tree could remain drawable outside the selected native batches, increasing the static view from 54 calls / 805743 triangles to 55 / 862613. The fix requires current physical CPU coverage and identical canonical ID/position/scale/yaw in both the native batch and current procedural region, in addition to the standby bank's own upload/fence. Changed, suppressed, omitted or absent trees cannot borrow a retained proof. A focused test covers each rejection.

`savanna-standby-quiet.json` repeats the static scene with that guard: all four species report zero standby trees drawn, with 54 calls / 805743 triangles. This proves absence of static fallback duplication in this view, not equivalent frame time.

`savanna-standby-approach.json` completes the same native-source 23-second 140Ã¢â€ â€™25Ã¢â€ ’140 m path with a three-second hold: **263/263 near frames and 355/355 transition frames ready, zero readiness descents**, unchanged logical state and no reported errors. The end screenshot is a far retreat view, not a close-up handoff proof. Two reusable banks per species estimate 7,624,632 bytes (7.27 MiB) of additional owned GPU attributes/indices/instance storage after this movement. This excludes materials, driver overhead, decoded images and CPU memory; no additional atlas textures are owned by the standby. The former failed paths remain evidence of earlier variants.

This is one successful approach repetition only. Orbital/lateral repetition, other biomes/phases, visible silhouette matching, ownership/disposal and fresh combined CPU/GPU cost remain acceptance work. Normal gameplay remains OFF; earlier ABBA results do not apply to this new bank recipe.

After that recording, additional ownership guards invalidate retained proofs on context restoration and rebuild inactive banks when source geometry/material identities change. Focused tests cover both; they have not been exercised through deliberate native context loss. The current revision passes 112 directed far/native-resource tests and 42 world/registry/shadow checks. Build and web package passed before those last two guards (694 files / 405579650 bytes / 859 relative links / 20 runtime GLBs); they will be repeated for the final source.

## Native retained-bank orbital/lateral repetition (c78e535, main a6b251b)

The real-source repetition completes all paths with unchanged logical state, zero reported errors and zero transition-readiness descents:

| Path | Fully ready transition frames | Initial readiness | Evidence |
| --- | --- | --- | --- |
| Day orbit, 40 m | 486/511 | 1.150 s | `savanna-standby-orbit.json/png` |
| Day lateral, 40â€“44.7 m | 467/494 | 1.282 s | `savanna-standby-lateral.json/png` |
| Warm night orbit, 40 m | 514/514 | First frame | `savanna-standby-night-orbit.json/png` |

Initial unready frames retain the impostor while preparation/fade completes; this is not instant native readiness. Floating-point rounding makes the orbital â‰¤40 m counter include only part of the path and the lateral â‰¤40 m counter zero, so the whole-path comparison uses â‰¤60 m transition frames. This repetition resolves the prior measured descents for these three Sabana paths; it does not establish all-biome acceptance or a combined cost improvement. The captured flat/cyan backdrop is still a visual counterexample.

A subsequent offline-only backdrop candidate replaces Sabana's parallel waves with independently composed broad ridges/mesa caps, warm muted colors and a 145 m decorative cylinder height instead of 80 m. It retains one 2048×512 RGBA atlas and the same shader/draw/vertex recipe; transfer increases by 2,218 bytes (14,246Ã¢â€ ’16,464). Three generator tests verify deterministic seamless profiles, independent relief, and byte-for-byte regeneration of all six deployed alpha backdrops. Other biome assets remain byte-identical. Native composition acceptance of this candidate is still pending.

## Relative retained-bank precision, native disposal and backdrop diagnosis (d9e485c)

The retained native banks now keep frozen CPU matrices as Float64 and subtract a fixed local bank anchor before uploading Float32 translations. A focused test preserves fractional placement at coordinates Â±100000000; this guarantee covers retained banks only, not all far-impostor or regional-ground coordinates. The native orbit repetition (`savanna-relative-bank-orbit.json`) records 510/533 ready transition frames and zero descents, unchanged state and no GL/errors.

`savanna-native-close.json` closes the owner in the actual native world: the previous 151 geometries / 64 textures become 131 / 54 while normal prop residency returns to 25 chunks. Owner removal and logical-state equality pass. The former bank allocation estimate was 6707076 bytes; resource counters reset only as owned resources really release. The net Three.js counter delta is not a measurement of total GPU/driver/CPU RAM, because native groups rebuild during restoration.

The source atlas was explicitly inspected through its decoded texture image (`savanna-decoded-backdrop-preview.png`). Isolating the regional ground (`savanna-ground-isolated.json/png`) removes exactly one draw and 26010 triangles, but does not remove the pale backdrop band. This disproves the old-image/cache and far-ground explanations for that band. Ground/picking/navigation therefore remain unchanged.

The subsequent Sabana-only art candidate reduces the fixed fog mix from .48 to .24, bakes low-contrast facets into the existing 2048×512 atlas, and reduces decorative cylinder height from145 to110. Other biome atlases/parameters remain unchanged. The atlas grows from16464 to46686 bytes; decoded allocation and shader texture/read/draw counts do not increase. Generator tests confirm opaque interiors below the skyline and byte-exact reproducibility. Inspect alpha images on a composed background: some viewers display discarded transparent RGB as gray bands/white seams, which are not holes in this atlas.

`savanna-fog24-{day,night}.png` is the intermediate un-faceted145m candidate; `savanna-facets145-day.png` adds baked relief at145m; `savanna-facets110-{day,night}.png` is the current lower candidate, all captured at the same native horizon camera on5192. Day color and excessive prominence improve, but the backdrop remains compositionally simple; those images are intermediate review evidence, not concept-art acceptance or a performance claim. The experiment remains OFF in normal gameplay. Twelve focused owner/backdrop tests pass; latest combined cost, other-biome motion and final visual acceptance are still pending.

## Additional biome motion and expanded audit (5af1503)

Volcanes completes native-source approach with320/320 transition frames ready, zero descents, unchanged state and no reported errors. Its following orbit records582/612 ready frames, firstready1.164s, zero descents and unchanged state (`volcanoes-retained-approach.json`, `volcanoes-retained-orbit.json/png`). The approach PNG is a transition/retreat view rather than exact25m handoff evidence; another foreground tree's close appearance still needs review. Selected-slot success does not establish all22species acceptance.

The fixture now permits explicit `slot` selection and audits all trees within40m independently of the selected path tree. Two focused tests catch other-species regressions, near omissions and bounded traces while distinguishing initial preparation and objects left behind by the camera. This QA instrumentation is not enabled in gameplay or ABBA measurements.

The expanded Gran CaÃ±Ã³n slot1 approach (`canyon-retained-approach-counterexample.json/png`) completes but records only290/420 ready transition frames and a descent at51.971m with absent physical coverage. Another tree loses coverage at39.762m; the nearby audit has495 observations/342 ready, one descent and no omissions. The experimental adapter deliberately filters physical chunks by frustum/residency, so these observations require separating actual loss of on-screen representation from leaving its selected frustum. The added physical trace reports native chunk bounds, residency, frustum and LOD orders on each descent. No coverage guard was relaxed and no acceptance conclusion is drawn before that repetition.

After merging main through831bd40 and its subsequent QA-only experiment archive, build and package PASS:694files/403526145bytes/859relative links/20runtimeGLBs including current voice/audio hashes. The initial package attempt ran before Vite completed and is discarded; the repeated check after build completion is the reported result.
## Circular native prop residency fixes the on-screen canyon descent

`canyon-retained-physical-diagnosis.json` repeats the failed path with actual native references. The selected52.165m tree is in frustum and a packed LOD1 of a loaded chunk, but `farPropsVisible=false`: the9chunk square ends as close as48m and therefore cannot cover a40â€“60m handoff. The other39.786m tree retains native LOD1 and prop residency but its chunk is outside the view frustum. Neither case is obsolete GPU packing; the guards correctly reject absent physical selection.

The next candidate unions the original square with a horizontal circle intersecting chunk rectangles at `end + transitionMargin` (60+8m for this QA). This is arithmetic only, with no terrain sampling or procedural regeneration. The exact25terrain chunks, picking, navigation and original raid border remain unchanged. The owner restores the preceding transition distance on disable/dispose. Twenty focused boundary/ownership/navigation/stream tests pass.

`canyon-circular-approach.json/png` completes the identical selected-slot path with392/409 ready transition frames, **zero selected-tree descents**, unchanged state and no reported GL/errors. Initial17 frames keep the impostor during preparation/fade; do not call this immediate readiness. The all-near trace still retains one other-tree drop at39.786m explicitly confirmed outside the frustum, with prop residency and native LOD1 preserved. Final native prop residency is12chunks; count varies with eye position. This is a new cost variant, so earlier9chunk ABBA results must not be attributed to it. Further biome/motion/art and combined cost acceptance remain pending.
## Combined cost of all-prop circular residency (4784baf)

`savanna-circular-abba.json` measures the complete native scene at1280Ã—720 with source4784baf, media/Mapungubwe/seed712, paused daytime, exact terrain and current retained banks/backdrop. Each A/B/B/A lot has45 warmup and120 measuredframes. GPU timer queries are supported,480 samples, no disjoint/context loss/discard/pending query; state remains unchanged and errors0.

| Lot | GPU p50 ms | CPU render p50 ms | Draws | Triangles |
| --- | --- | --- | --- | --- |
| A1 native |22.106|6.4|59|960014|
| B1 circular all props |22.769|6.1|60|936332|
| B2 circular all props |22.650|6.3|60|936332|
| A2 native |22.919|6.3|59|960014|

A baselines drift3.7%; B is close to their average and does not demonstrate GPU improvement. These samples are not converted into promised FPS. The larger circle also brings back small props/shadows that should disappear earlier, so the next candidate separates them: the original square remains for small vegetation/debris/stones and a circle extends only the biome's actual tree slots. Clipped terrain pieces retain their existing handling. Twenty-seven grouping/shadow/ownership/navigation tests pass, including current native matrix populations and legacy unmerged layers.

`canyon-tree-circle-approach.json` repeats the same path after this separation:385/406 ready transition frames, zero selected-tree descents, unchanged state/errors0. The one other-tree decline remains explicitly outside frustum. Final residency is9small-prop chunks/12tree chunks/25exact terrain-picking chunks. Native combined cost for this tree-only circle is still pending; the all-prop circular measurement cannot describe it.
## Combined cost of tree-only circular residency (f2302ca)

`savanna-tree-circle-abba.json` is a fresh native measurement with the same paused seed712 Sabana/Mapungubwe/media camera, 1280Ã—720 CSS viewport and 1600Ã—900 world framebuffer. Each lot has45 warmup and120 measured frames; all480 GPU queries resolve without disjoint/discard/context loss, and logical state remains identical.

| Lot | GPU p50 ms | CPU render p50 ms | Draws | Triangles |
| --- | --- | --- | --- | --- |
| A1 native |21.399|6.2|59|960014|
| B1 tree-only circle |20.325|6.2|55|810914|
| B2 tree-only circle |20.544|6.2|55|810914|
| A2 native |21.611|6.7|59|960014|

The two B medians are about5% below the average A median in this single scene, with A medians differing about1%. This supports a local GPU-cost reduction for this variant; it does not establish an FPS gain across biomes, qualities, motion or devices. Frame-time distributions remain noisy. The extra native tree casters remain while small-prop casters follow the smaller square, so this is a deliberate distant-detail change rather than pixel-equivalent rendering. Visual/motion acceptance in the remaining biomes is still pending and normal gameplay remains OFF.

## Additional tree-circle biome paths (6100e12, main8d6d5b5)

The following native paths use exact terrain/picking/navigation and tree-only circular residency. JSON includes complete per-species preparation counters and nearby-tree traces; PNGs are final path views, not complete motion videos.

| Biome / phase / path | Fully ready transition frames | Selected descents | Evidence |
| --- | --- | --- | --- |
| Manglares / day / approach |267/267|0|`mangroves-tree-circle-approach.json/png`|
| Manglares / night / orbit |490/490|0|`mangroves-tree-circle-night-orbit.json/png`|
| Gran Río / day / lateral |562/594|0|`river-tree-circle-lateral.json/png`|
| Gran Río / dusk / approach |276/277|0|`river-tree-circle-dusk-approach.json/png`|
| Desierto / low / day / approach |606/606|0|`desert-low-tree-circle-approach.json/png`|

All five paths preserve logical state and report zero errors. Initial unready frames keep the impostor while native preparation completes. All-near readiness traces record16/5/12/15/1 declines respectively, each with `frustum=false`, tree residency preserved and native LOD orders still present. These are retained explicitly rather than hidden or counted as on-screen readiness failures. The all-near counter is not an assertion that every tree in every viewport was ready from its initial observation.

These checks expand motion evidence to all six biomes across this and earlier source revisions, but do not validate every species, every quality or pixel-equivalent lighting/silhouette matching. Manglares' final horizon remains visibly flat; the Gran Río close tree is a native model but distant dithering is noticeable in a static capture. Backdrop/atmospheric composition and remaining species/quality checks still block activation and an acceptance PR. No gain is attributed to these paths; the GPU cost evidence remains the single Sabana ABBA above.

## Configurable atmosphere candidate (not visually accepted)

The experimental adapter and decorative backdrop now accept a shared validated day/night fog palette and fog start/end distances. Defaults remain the former160/380m and#b5d9e8/#263747, preserving earlier evidence. QA parameters `fog-start=30&fog-end=300&fog-palette=sky` select a candidate that introduces a small haze in the40â€“60m handoff and integrates distant ground before its regional edge. This changes only existing linear-fog uniform values, with no new shader pass, noise or texture reads.

`node tools/experiments/sample-far-sky-horizon.mjs` decodes the existing RGBE panoramas offline and applies the current sky exposure/gamma/saturation formula at sampled horizontal rows. The equatorial mean approximates day#b3b5c0/night#3f4140. It is an approximation over horizontal directions, excludes procedural stars and does not assert exact matching to every camera ray. The QA palette is passed to terrain/impostors and decorative backdrop together;12 focused atmosphere/backdrop/ownership checks pass. Native visual and combined-cost comparison of this candidate remains pending; normal gameplay stays OFF.

## Native atmosphere and near handoff comparison (4ffc73f /6001b5d)

`savanna-fog-baseline-current-{day,night}.json/png` repeats the old fog with current main's camera intent fix. `savanna-skyfog30-{day,night}.json/png` uses30â€“300m and the sampled sky palette. Their camera arrays are exactly equal:[51.54259579985163,14.02192278906814,14.848751295665068]. This avoids comparing different poses after the main camera fix. The candidate reduces the previous cyan grading, but leaves a flat lower decorative band and overly bright blue night mountains.

`savanna-skyfog30-near25.json/png` is actual near-handoff evidence, captured during hold10 at age18.9125 with exactly25m minimum distance and selected readiness1. The matching native tree is fully3D. Its complete30s approach (`savanna-skyfog30-approach.json`) has513/528 fully ready transition frames, zero selected descents, state identical and errors0. This is not proof of every other tree/species or performance.

A subsequent soft-grade option (`backdrop-grade=soft`, source6001b5d) retains one atlas/one draw/same cylinder and uses the existing fog mix with an inexpensive quadratic UV weight toward fog at its bottom; the default configuration retains its former constant expression. The same option reduces the decorative night tint to[.08,.10,.12]. `savanna-softfog-{day,night}.json/png` confirms the same camera and zero errors. The base band is less pronounced and the night backdrop better matches the dark world; mountain shapes remain simplified. It adds no texture reads or assets, but does add a few arithmetic operations in this optional fragment variant, so no zero-frametime-cost claim is made. Other-biome visual and combined-cost repetitions remain pending before enabling it. Thirteen focused checks pass; all normal gameplay remains OFF.

## Cost repetition of soft atmosphere (377a6b8)

`savanna-softfog-abba.json` measures the complete tree-circle variant plus30â€“300m sky palette and soft decorative grading in the initial native seed712/media/Mapungubwe view at1280Ã—720 CSS /1600Ã—900 framebuffer. All480 GPU queries resolve without disjoint or discarded samples; state is unchanged and errors0.

| Lot | GPU p50 ms | CPU render p50 ms | Draws | Triangles |
| --- | --- | --- | --- | --- |
| A1 native |22.595|6.6|59|960014|
| B1 soft atmosphere |21.712|5.9|55|810914|
| B2 soft atmosphere |20.678|6.2|55|810914|
| A2 native |23.769|7.9|59|960014|

Both candidate medians are below both native medians in this view. A baselines drift5.2% and B medians differ4.8%, so this does not establish a precise percentage gain or isolate the arithmetic cost of the backdrop gradient. The earlier tree-circle measurement is a different source/configuration and is not reused to claim a free shader change. Other-biome/quality cost remains pending.

## High-quality Manglares species, suppression and disposal (4d9b5e2)

`mangroves-high-softfog-{day,night}.json/png` captures the same horizon with49 exact terrain/picking chunks,25 small-prop chunks and current tree residency. Only the active biome's four pairs of atlases load (estimated44,739,242.67 texture bytes including mipmaps), plus5,592,405.33 backdrop bytes; these are allocation estimates, not total GPU/RAM measurements. The wide soft-grade horizon is less abruptly flat than the prior low-angle orbital capture, which used a different camera/source; this is visual evidence, not an exact A/B comparison.

The species selector repeats native motion without reloading atlas resources:

| Slot / phase / path | Ready transition frames | Selected descents | Evidence |
| --- | --- | --- | --- |
| 1 / night / orbit |422/438|0|`mangroves-high-slot1-night-orbit.json`|
| 2 / dusk / lateral |425/425|0|`mangroves-high-slot2-dusk-lateral.json`|
| 3 / day / approach |244/244|0|`mangroves-high-slot3-day-approach.json`|

All paths preserve state/errors0. All-near declines10/0/11 retain native orders/residency and havefrustum=false. Slot0 was exercised in the previous medium-quality paths, so all four Manglares slots now have native motion evidence, across different phases/qualities/revisions rather than a complete Cartesian matrix.

`mangroves-high-visible-suppression.json` removes a nearby prepared native tree through logical suppression: ID0:6:5 is suppressed, its native occurrences become0 and its remaining impostor state isenabled=false. `mangroves-high-native-close.json` then closes the owner: state equality and owner removal pass, counters218geometries/72textures become194/62, and the retained-bank owned allocation estimate before release is10,496,916bytes. Counter changes are affected by native grouping restoration; do not present them as measured total memory reclaimed.

## Very-low quality Sabana slot1 (ffdda6c)

`savanna-very-low-slot1-night-orbit.json/png` exercises the baobab atlas through a complete night orbit with the soft atmosphere in the lowest profile:656/691 fully ready transition frames, zero selected descents, identical logical state and errors0. All13 nearby-tree declines retain residency/orders and are outside the frustum. This validates one additional species/profile/phase only; slots2/3 in this profile remain pending. The final PNG illustrates that route rather than exact per-angle atlas matching.

## Current source validation after main811db06 (ac8e990)

42 targeted atmosphere/backdrop/ownership/native grouping/shadow/transition/terrain-camera checks PASS (`current-directed-tests.txt`). Build PASS (`current-build.txt`); package PASS (`current-package.txt`):694files/403539773bytes/859relative links/20runtimeGLBs, including current Opus/voice/image aliases. The full-suite2632PASS record predates these changes and is not represented as validation of this source. Remaining native species/biome and optional atmosphere acceptance work is still required before PR.

## Remaining Sabana and Gran Río species (b449105)

| Biome / quality / slot / phase / path | Ready transition frames | Selected descents | Evidence |
| --- | --- | --- | --- |
| Sabana / very low /2 / dusk / lateral |638/669|0|`savanna-very-low-slot2-dusk-lateral.json`|
| Sabana / very low /3 / day / approach |385/387|0|`savanna-very-low-slot3-day-approach.json`|
| Gran Río / low /1 / night / orbit |802/840|0|`river-low-slot1-night-orbit.json`|
| Gran Río / low /2 / dusk / lateral |806/806|0|`river-low-slot2-dusk-lateral.json`|
| Gran Río / low /3 / day / approach |437/437|0|`river-low-slot3-day-approach.json`|

All five paths report errors0 and identical state. Nearby declines0/12/4/10/15 respectively are outside the frustum, with native residency/orders preserved. Combined with prior slot0 evidence, all four slots of Sabana/Manglares/Gran Río now have selected-tree native motion evidence. With earlier Volcanes0, Desierto0 and Canyon1 paths,15 of22 slots have such evidence; seven remain (Volcanes1â€“3, Desierto1â€“3, Canyon0). This is not a complete phaseÃ—quality matrix or final art approval.

`river-low-softfog-{day,night}.json/png` retains the open procedural distribution and fog but exposes a new decorative-art counterexample: its low, parallel wave profile reads as a thin horizontal wall against the sky. Native readiness success does not resolve this backdrop composition. It remains pending before acceptance.

### Gran Río skyline revision (offline; native acceptance pending)

The earlier `river-low-softfog-day/night` captures retain the thin horizontal backdrop counterexample. The new generator composes five independently seeded rounded ridges per layer, retaining the same 2048×512 atlas, cylinder height (85 m), draw call and shader recipe. It changes only the Gran Río backdrop image (14,490 → 14,760 bytes). Five generator tests pass, including periodic seams, independent relief, bounded slopes and byte-exact deployment. No native artistic or performance acceptance is claimed for this revision until it is viewed in the actual scene. Mangrove profiles remain flat marsh silhouettes.

The current `river-ridges-day/night` native captures use the exact earlier comparison camera [51.54259579985163,14.02192278906814,14.848751295665068], low quality, seed712 and 30/300 soft atmosphere. Errors/WebGL=0, state paused. Independent rolling relief is now visible, but the low decorative skyline still reads as broad horizontal layers, particularly at night. This is intermediate art evidence, not final acceptance or a claim that the flat-band concern is eliminated.

### Current base validation (c4e851b, includes main af13fce)

41 targeted ownership/GPU/standby/atmosphere/backdrop tests pass. Vite build succeeds. Web package validates 694 files / 403,540,167 bytes, 859 relative links and 20 runtime GLBs, with current image and voice runtime aliases. `current-directed-tests.txt`, `current-build.txt`, `current-package.txt` were refreshed from this exact revision. The earlier full suite remains historical evidence, not a claim that the latest source has passed the full suite.

### Additional Volcanes species paths (c4e851b)

| Slot / phase / path | Fully ready transition frames | Selected declines | Other nearby declines |
|---|---:|---:|---:|
| 1 / night / orbit |537/568|0|13|
| 2 / dusk / lateral |542/574|0|4|
| 3 / day / approach |280/286|0|10|

All three paths complete with unchanged simulation state and errors0. Every recorded nearby decline is outside the native chunk frustum, with physical residency/orders retained. Together with prior slot0, all four Volcanes slots have selected-tree motion evidence at differing phases, without implying a full Cartesian quality/phase matrix.

### Additional Desierto species paths (c4e851b, high quality)

Slot1 night orbit:774/818 transition frames fully prepared; slot2 dusk lateral:720/757; slot3 day approach:401/401. Zero selected descents in all three; unchanged simulation state and errors0. Nearby declines are0,0,0. Sparse desert placement is retained (slot1 initially only nine eligible trees), without increasing procedural density to make the fixture easier. Together with prior slot0 low-quality evidence all four Desert slots have motion evidence.

### Final selected species route (c4e851b)

Canyon slot0, low quality/night orbit, completes1068/1124 fully prepared transition frames, zero selected descents and errors0, unchanged state. Its 0 nearby declines are all outside the physical frustum, with residency/orders intact. Combined with earlier Canyon1, all22 species slots in the six biomes now have a complete selected-tree motion route. This is not an exhaustive phase/quality/culture Cartesian matrix, final horizon-art approval, native context-loss acceptance, or universal FPS evidence.

The current native context-loss fixture adds explicit `WEBGL_lose_context` controls and suspends rendering only during actual context loss, preserving simulation state. It records loss/restore events separately; it neither clears accumulated error diagnostics nor bypasses GPU readiness. Normal game files are unchanged. Native recovery acceptance will be reported with before/after resource proofs and a completed post-restore path.

### Native context recovery (4464c3f + QA controls)

`savanna-native-context-recovery.json/png` records actual `WEBGL_lose_context` loss and restoration, unchanged state and errors/WebGL0. All four species repeat native preparations and texture uploads; the completed subsequent approach is272/272 fully prepared transition frames, zero descents. This trial loses context after initial preparation; it does not itself demonstrate cancellation during a live fence. The follow-up revision invalidates texture/native-proof epochs on loss as well as restoration, avoids scheduling new preparations while the context is lost, and releases both owned event listeners on close. A unit test injects loss during a pending fence, proves cleanup/cancellation and then a new upload after restoration;34 targeted tests pass. Native evidence must be repeated on this follow-up revision.

`river-context-negative-clock.json` retains a failed follow-up recovery trial. A queued RAF timestamp predates the fixture reset of `last` during restoration, giving a negative delta; FarTreeTransitions correctly rejects it and the QA frame stops. The stale report still showed errors0, but native console contains `Invalid fade time`. No recovery/path acceptance is claimed from that trial. The fixture now clamps elapsed time to [0,.1], retaining strict production fade validation. A fresh native repetition is required.

The fresh `river-native-context-recovery.json` after f150ee3 has a clean top-level error array/console and the selected approach305/305 ready, but its nested layer/standby arrays contain multiple `Native GPU preparation error` entries. It is **not accepted** as correct recovery. `river-context-preparation-errors.json` retains the complete later report; no ABBA was started on that scene. The preparation diagnostic now includes the actual hexadecimal WebGL error code without weakening or bypassing the completed-fence check.

`river-context-invalid-operation.json` confirms hexadecimal0x502 (INVALID_OPERATION) during several nested layer/standby preparations after restoration. The shadow adapters captured Three's replaced shadowMap object and did not reinstall their hooks. The follow-up binds native comparison/cache hooks first and asset proxies second to the replacement map, without duplicate hooks when the map is unchanged; disposal restores the current original and releases listeners.20 shadow tests pass, including two replacement maps, proxy traversal, cached redraw, shared depth uniforms and listener disposal. This is a candidate cause/fix, not native resolution: three attempts to open a fresh browser2 scene subsequently timed out attaching the webview, with no tab created. GPU performance comparison remains unstarted.

### Recovery candidate regression validation (main4c4a9df integrated)

156 directed far/terrain-camera/shadow/native-GPU tests pass. The initial run caught one ownership assertion still expecting a single context listener; it now verifies the two owned loss/restoration listeners and their complete removal. Build and web package pass (694 files / 403,540,993 bytes, 859 relative links,20 runtime GLBs). Current QA reports aggregate nested species/standby errors into the main error list, and ABBA rejects such errors before setting done=true; two focused tests cover this previously missed diagnostic. This does not resolve the outstanding native0x502 acceptance or establish new GPU performance.

### Disposal diagnostics (not recovery acceptance)

The optional QA trace preserves and reports WebGL errors. Gran Río low and medium still fail after shadow-hook restoration. Stage diagnostics identify 0x502 before native preparation; the disposal trace records deleteBuffer/deleteVertexArray callbacks from old Three geometry listeners and deleteTexture from old material listeners after context restoration. The 64 retained records and 830 omitted rows are bounded diagnostics, not a benchmark. No recovery acceptance or performance comparison is claimed. The trace and stage probes are opt-in and block ABBA while enabled.

### GL epoch candidate (native verification pending)

The constructor intercepts its native canvas.getContext call only synchronously, preserving Three's context attributes and internal alpha:false behavior. Handles are recorded before GPU allocation. On actual context loss, the epoch advances; deleting a recorded handle of the matching type from an earlier epoch is a no-op. Current, unknown and mismatched handles retain native deletion/error behavior. The guard never queries or clears GL errors, uses weak handle references, and restores owned methods/listeners on disposal after renderer.dispose. Eight handle categories, repeated restores, constructor failure and ownership tests pass:58 directed tests including shadow/native-GPU/trace and world ownership. Two attempts to open a native verification page failed attaching the browser webview, with no tab left; recovery is still unaccepted.

### Native GL epoch recovery, low quality (25dcec1 + main d8caf74)

Gran Río/baja, exact gameplay terrain retained, soft atmosphere, Mapungubwe, seed712. With the opt-in error-preserving disposal trace, actual context loss/restoration followed by a20s approach completes406/406 prepared transition frames and264/264 near frames, no descents, unchanged state, aggregated errors/WebGL0 and an empty disposal-error trace.905 recorded old-context deletes are skipped. A second actual loss/restoration and20s lateral path completes839/839 prepared transition frames with no descents/errors;1,139 stale deletes cumulatively skipped. Closing the experiment releases its owner with unchanged state, geometries89→62 and textures32→22, no nested/GL/console errors. Owned bank estimate before closing8,096,520 bytes is not total GPU RAM. See river-context-epoch-traced, -second and -close JSON plus the matching PNG. This diagnostic run is not a performance measurement; medium-quality uninstrumented acceptance is pending.

Build and web package after integrating main d8caf74 pass:694 files /403,546,374 bytes,859 relative links,20 runtime GLBs.

### Uninstrumented medium-quality recovery

The same guard, Gran Río/media with normal shadows and no diagnostic GL wrappers, passes actual loss/restoration and a20s approach:283/283 prepared transition and181/181 near frames, zero descents, unchanged state, nested/GL/console errors0;939 known stale deletes skipped. After restoration, retiring a tree produces logical suppression=true, native occurrences0, impostor ready0/enabled=false. Closing releases the owner with unchanged state and geometries104→76/textures30→20, no errors. The bank estimate is8,093,256 bytes, excluding borrowed geometry/atlas storage and driver memory. Files river-context-epoch-media, -suppression and -media-close preserve complete reports, with a native PNG. This is correctness evidence for these two qualities, not a GPU-cost benchmark or universal context recovery guarantee.

### Gran Río decorative relief candidate

After correctness recovery is demonstrated, the offline Gran Río skyline now places its rounded peaks higher in the existing atlas. This addresses the low-band counterexample without changing the85m cylinder, shader, one texture read or2048×512 resolution. Image bytes14,760→18,078; estimated decoded GPU texture allocation is unchanged. Nine offline generation/backdrop tests pass (periodicity, independent rounded layers, skyline/body alpha and byte-exact deployment). No native visual or frametime acceptance is claimed yet; the former river-ridges-day/night images remain the comparison baseline.

Native river-raised-relief-day/night captures match the previous camera exactly and report errors/WebGL0. The skyline is higher but still reads as broad bands: five rounded ridges span too large an angle. This candidate is not final art acceptance. A subsequent offline composition uses16 irregular narrower crests with8px profile sampling and varying amplitude; same atlas size/cylinder/material, nine focused tests pass. Its native views are still pending.

The river-crests-day/night native captures (43c9b9c) retain exactly the prior camera, biome, seed and atmosphere, with errors/WebGL/console0. Several visible crests/valleys replace the broad near-horizontal bands. The washed day tint and subdued night tint remain consistent with the foreground. This is basic composition acceptance for this view; angular/high-camera coverage and combined GPU cost are still pending. Texture size33,572 bytes, unchanged decoded dimensions/material recipe.
