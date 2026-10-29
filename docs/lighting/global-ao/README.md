# Global ambient occlusion and day/night visibility — active scope

User request: add suitable AO throughout Wild Guardians, tune visibility in daytime/nighttime scenes and publish repository screenshots for final user review. Work remains on codex/guardian-3d-animation; no main merge. The desktop goal still references Guardian phase 2 because replacing an unfinished goal is disallowed; that older scope is not declared complete.

## Acceptance matrix

All six biomes: savanna, desert, grand river, mangrove, volcanoes, canyons. Compare identical camera/time/settings with AO enabled and disabled, including near/strategic camera distances. Capture day and night. Preserve biome identity, translucency of vegetation, expressive faces, ground contact and bright magic. Measure incremental GPU/CPU/memory/asset size; do not claim baseline engine performance improvements.

| Group | Existing evidence | Remaining work |
| --- | --- | --- |
| Five work centers | Fresh geometric AO maps, native shader integration, day views; some night views | Suajili night correction, all-culture comparison and destruction/repair AO transitions |
| Village buildings, walls, props | Ground contact approximation and existing lighting | Audit material AO; bake missing local visibility and verify no doubled shading |
| Trees, bushes, grass, crops | Canopy/ground contact shading exists | Audit per-material channels; local AO with transparent-leaf-aware bake and bounded strength |
| Workers, animals, Guardian | Expressive rigs and normal/material treatments | Audit source channels; pose-independent cavity AO, check blink/mouth/cloth/moving joints |
| Terrain and rocks | Texture AO and resident contact atlas already exist | Calibrate combined attenuation, especially mangrove black patches; no duplicate AO |
| Water and translucent/emissive VFX | Separate material paths | Verify contact/lighting consistency; do not multiply opaque cavity AO into water transparency or magic emission |

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
