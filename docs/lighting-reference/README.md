> **Validation correction (2026-10-29):** Captures and timing runs before the native-world fixture correction used the production *visual profile* but the legacy JavaScript terrain generator. They do not validate the current Wild Engine biome layout, water network, vegetation placement or full-world performance. In particular, the published mangrove image showed the wrong water layout. Building shader/atlas checks remain useful in their stated scope. The dark ground marks are under investigation; no cause or visual acceptance is established yet.

# Cinematic lighting iteration 1 — 2026-10-29

User priority: match supplied day/night mockups through convincing architectural volume and richer projected shadows across all biomes, not a warm color filter alone. Desert shadow response is a reference to investigate.

Opt-in candidate: `?cinematicLight=1` in the actual WorldScene fixture. Default production rendering is unchanged pending comparisons. Day comparison uses identical fixture, day button and camera; baseline left, candidate right in [comparison](day-comparison.png). No image grading was applied to captures.

The building branch preserves its normal-mapped continuous radiance instead of replacing it with the broad toon output. It reduces hemispherical fill, retains warm directional light and cool fill, and preserves damage/emission. Its packed-depth nine-tap shadow filter now uses the receiver-plane depth correction already present in the terrain shadow system. The generic candidate also grades reflected radiance using existing visibility. No extra textures, lights or render passes.

Observed: candidate separates dark wood and recesses from plaster more clearly; baseline is flatter and more orange. Still substantially short of the supplied mockup: shadow silhouettes and vegetation detail remain broad, and the building must be inspected from more orientations. This is an initial candidate, not final artistic acceptance.

21 existing destruction/native-shadow/daylight tests passed. Browser day rendering completed. Night, all six biomes, building destruction/repair, water/emissive preservation, GPU timings and close contact artifact checks remain required before enabling by default. The new building path is not yet proven by these existing tests.

## Night and production-profile correction

The first night candidate double-attenuated building lighting: both the calibrated shader endpoints and world intensity reduced it. The revised shader interpolates the world multiplier back to one at full night, preserving the existing day factor. [Night comparison](night-comparison.png): original left, corrected candidate right. Camera and day/night selector match; animal idle phase differs. The building retains darker recesses, but warm window/local light and full mockup matching remain incomplete.

**Scope correction:** the initial Guardian fixture did not enable `approvedVisuals`. These initial screenshots therefore demonstrate changes against the legacy fixture configuration, not the full production visual profile. Desert inspection exposed the missing sand/terrain options. They must not be treated as production appearance approval.

The fixture now supports `lightingReview=1` to use WorldScene's actual `approvedVisualSearch` profile, retaining the explicit `cinematicLight` toggle. `biome` accepts sabana, gran-rio, manglares, volcanes, gran-canon, desierto and creates a legal settlement using that biome's navigation/profile. Existing default combat fixtures stay unchanged. Redo both sides with this flag before judging the reference match. The legacy desert capture is retained to show why the profile correction was needed.

## Geometric AO candidate

Audited all five building GLBs: none declares `occlusionTexture`. The MR red channel is not identified as AO and is not used as one. NativeContacts currently rasterizes natural prop instances only; it does not establish building-to-ground contact.

Added reproducible Blender/Cycles offline bake `tools/lighting/bake_building_ao.py`. First asset: original Suajili geometry/UVs, 1024² linear grayscale atlas, 32 Cycles samples, 16 AO samples, radius 0.96 local units (12% of height). Source/output hashes and settings accompany the PNG in public/content/lighting. Derived from the existing project asset; no third-party asset added. No source GLB overwritten.

Opt-in `cinematicLight=1&cinematicAO=1&lightingReview=1` loads it only for Suajili through Assets ownership/loading. Ambient and rim light receive 72% AO influence; direct/specular/emission do not. Caps and inner/destruction surfaces skip the intact atlas; influence fades between 2% and 30% damage. This fade is a conservative approximation, not dynamic cavity AO. One texture lookup on qualifying building fragments; actual GPU cost remains unmeasured.

Production-profile day baseline/candidate captures are now present. [Original left / candidate with AO right](production-ao-comparison.png). Browser reports ready and no fixture errors. More localized darkening is visible under the roof and around wood/crates. This camera does not prove all UV seams, night behavior, destruction transitions or all cultures. Current result remains short of the reference and off by default. Contact shadows at building bases and improved indirect response remain outstanding, as do all-biome comparisons and cost measurements.

## Five-culture AO bank

All five original building meshes now have their own baked atlas: suajili, etiope, mapungubwe, saheliana, musgum. `bake_building_ao_bank.py --blender <Blender 4.5.3 executable>` runs the bakes, verifies achromatic pixels before lossless single-channel PNG conversion, and records hashes/settings. Opt-in loading resolves the current culture. Disk single-channel storage does not prove GPU single-channel allocation: the existing texture loader may expand it.

12 selected bank/native-shadow/daylight tests pass; production build passes in 15.08s (existing large-chunk warnings). Bank verification checks every manifest culture, original GLB and output hashes, PNG dimensions and grayscale bit depth. It is not artistic validation.

Gran Río + Ethiopian culture was loaded with the production profile and opt-in lighting/AO, with no fixture errors. Added `buildingView=1` to frame the entire centre rather than clip it at the left edge. [Full-building inspection](river-ethiopian-full-ao-day.png) shows separation under layered roof sections and around the doorway. The remaining three cultures still require visual review, and no broad performance/quality acceptance is claimed.

Atlas disk sizes: [{"file": "etiope-geometric-ao.png", "bytes": 460221}, {"file": "mapungubwe-geometric-ao.png", "bytes": 492228}, {"file": "musgum-geometric-ao.png", "bytes": 518327}, {"file": "saheliana-geometric-ao.png", "bytes": 564449}, {"file": "suajili-geometric-ao.png", "bytes": 564027}]

## Building-to-ground contact candidate

Opt-in `cinematicContacts=1` adds centres to the existing 256² resident contact map. Uses each culture's actual rotated placement hull, a smooth 1.2-world-unit falloff, maximum 38% ambient attenuation, and minimum composition with existing natural-prop AO. No additional GPU texture or pass. Only centres are covered: village decorative buildings, walls and moving entities are not included yet. This is approximate low-frequency sky occlusion, not ray-traced contact shadows; hulls can include space beyond the mesh.

The cache key includes centre position, heading, culture and presence. Ruined/collapsing centres are omitted; removal and rotation refresh the same texture. 16 contact/horizon tests pass, including new localization, natural-AO preservation, rotation, removal and stable-texture checks. Build passes in 15.55s.

[Gran Río contact inspection](river-ethiopian-contacts-day.png) runs with the production profile, Ethiopian building, candidate lighting and baked AO. Contact contribution is restrained at this camera scale; no broad black halo is apparent in this frame. It does not establish sufficient quality across slopes, other zooms or cultures. Since the atlas covers the resident terrain, texel footprint can limit narrow-contact fidelity. Measure that tradeoff and CPU update cost before enabling by default. Build/fixture tests are not final performance acceptance.

## Incremental AO timing and volcanic review

Added `Medir GPU de AO horneada` to the real-engine fixture. It freezes the simulation/camera and toggles only `uBuildingAOOn`, using the existing asynchronous GPU timer with 40 warmup + 240 timed interleaved frames. In its reused labels, none/body mean off and effects/all mean on. Each state has 120 samples. All original enabled building uniforms are restored when complete. Does not include loading, texture memory, contact-map rebuild CPU or the complete lighting shader delta.

[First Gran Río/Ethiopian run](ao-gpu-river.json): GPU median 17.581744ms off / 17.860937ms on (+0.279193ms); p95 20.175572 / 20.597655ms. All labels show 53 draw calls, zero hidden frames; no disjoint/discarded queries. Other QA tabs existed, so this is a first interleaved cost estimate, not isolated integrated-GPU acceptance or a whole-game FPS claim.

Mapungubwe in the volcanic biome loaded and was inspected with candidate lighting, AO and contacts at [day](volcano-mapungubwe-day.png) and [night](volcano-mapungubwe-night.png). Roof curvature and pillars remain readable; lava remains visibly emissive. Dark ground and under-roof regions still need comparison against baseline and camera/zoom variants. The contact hull is an approximation under this open-sided structure, not a geometric footprint of individual pillars. No broad performance or all-biome visual acceptance is claimed.


## Hemispheric ground bounce and remaining cultures

Added biome-dependent diffuse ground radiance for buildings (shared uniform, no new pass or texture). The upper hemisphere retains the sky endpoint; the lower hemisphere uses restrained sand/soil/vegetation/rock colours. Night keeps its separate endpoint. This is an authored hemispheric indirect-light approximation, not scene-aware GI, interreflection or local window lighting. AO attenuates ambient/rim only; direct, specular and building emission remain separate. Standard-material emissive radiance is now excluded from the final global tint. Native volcanic emission embedded inside its own tonemapping is not yet independently isolated by this change.

Fixed the QA village lookup: game culture `saheliana` resolves village asset `saheliano`, matching production. No gameplay mapping was changed.

Inspected Musgum/mangrove and Sahelian/canyon in WorldScene with the production profile, opt-in lighting, baked AO and contacts. Saved day views before and after the ground-bounce adjustment (`mangrove-musgum-day.png`, `mangrove-musgum-bounce-day.png`, `canyon-sahelian-day.png`, `canyon-sahelian-bounce-day.png`) and night-control views (`mangrove-musgum-night.png`, `canyon-sahelian-night.png`). Both loaded with empty fixture error lists. Rounded Musgum surfaces and doorway recesses remain legible. The Sahelian roof is conspicuously flat and the night image still lacks the reference's warm local lighting; these are not final artistic acceptance. All five building cultures have now had at least one visual inspection, but this is not the complete six-biome/day-night/camera/damage matrix.

Eight targeted AO-bank/contact/lighting/daylight tests pass. New shader checks cover actual destruction-source replacement, AO exclusion for caps, damage fade, and separate standard emission; they do not substitute for screenshots or GPU measurements. This iteration remains opt-in while the remaining lighting work is evaluated.


## Native terrain correction and shadow isolation

`lightingReview=1` now initializes through `prepareWildEngineWorld`, passes its spatial session to `WorldScene.load`, waits for resident terrain before placing test structures, and pumps the existing frame scheduler during loading and presentation. The visible diagnostic reports `worldAuthority: spatial-wasm` and `mangroveNetwork: true`. This reuses the current production mangrove network and settlement version; it does not edit the game's layout or generators. Legacy combat trials without lightingReview retain their previous path. The review still uses a controlled camera/seed, medium quality and no far-vegetation attachment, so it is not a full production-session or performance acceptance claim.

The native mangrove view now has continuous channels (`mangrove-native-all-day.png`) instead of the obsolete bands in the earlier image. Added UI isolation switches for architectural contacts, all ground contact AO, and solar shadows. With ground AO disabled, the broad dark regions remained (`mangrove-native-no-ground-ao.png`); disabling solar shadows removed them (`mangrove-native-no-sun-shadow.png`). These observations identify the broad regions in this camera as projected shadows, not proof that every old speckle had the same cause.

An initial increase of base ground ambient radiance did not change the sampled fully shaded region: the approved visual profile overrides that ambient term in shadow. The final candidate instead adds diffuse sky fill *after* that override and before tone mapping, weighted by shadow and daylight. Shadow visibility, placement and direct-light calculation remain intact. The separate grass/fern shaders receive stronger diffuse day fill, with night terms preserved. `mangrove-native-shadow-fill-corrected.png` shows more surface detail in the large cast shadow. Earlier `*-fill-day.png` iterations are diagnostic evidence, not accepted fixes. The adjustment is still opt-in and needs remaining biome/night views on the corrected native fixture.

## Wall contacts and incremental CPU cost

Architectural contacts now include non-gate wall collision rectangles, following rotation, scale and integrity; ruined/collapsing walls are omitted. Gates are excluded rather than painting across an open passage. Composition remains minimum visibility in the existing atlas, with a narrower 0.55-unit reach and maximum 24% attenuation for walls. This is low-frequency approximation, not per-stick contact or architectural GI.

`node tools/lighting/measure_contact_cpu.mjs <output.json>` reproduces the CPU-only test. At 200 walls, initial generic-polygon rasterization measured 6.8467ms median / 9.2825ms p95 per rebuild; the exact oriented-rectangle distance measured 2.1556 / 3.0476ms. Cached calls measured 0.1255ms median in both runs. Reports: `wall-contact-cpu.json` and `wall-contact-cpu-optimized.json`. Empty natural-prop chunks, no GPU upload or browser frametime; this is not an incursion performance result. `wall-contact-day.png` predates the native-world correction and is not native-world visual acceptance. Eleven selected lighting/contact/daylight tests pass; broader scene validation remains outstanding.


## Native mangrove spell and recovery checks

The corrected spatial-WASM scene was used for Grow, followed by Attack at night. `native-mangrove-grow.png` and `native-mangrove-attack.png` show a visible Guardian beside the selected target, with the energy connection unobscured in this building-oriented camera. The controlled commands reuse the same Guardian slot; the observed maximum is one. Audio was locked (`played: false`); these images do not validate sound. The staged spell snapshots use the fixture's presentation clock, not a navigation trial.

Then `Medir ciclo físico real` ran continuous Game.tick/WorldScene on the native mangrove. `native-mangrove-hyena-cycle.json` records 330 frames / 12.047735 simulated seconds, zero hidden frames/errors, peak one physical ragdoll, finalDownCount zero, and falling/rolling/recovering phases. This is numerical cycle evidence, not continuous visual acceptance of every pose. The unpaired run includes a 1249.91ms render peak and cannot be accepted as fluid. No cause is established from this run. Physics total p95 was 3.065ms, solver p95 2.20ms, VFX p95 0.895ms. Existing engine performance investigation remains outside this task; the repeat below tests recurrence without assigning the peak to a subsystem.


Repeat (`native-mangrove-hyena-repeat.json`): 340 frames / 12.005665 simulated seconds, no hidden frames/errors, finalDownCount zero, maximum one Guardian. The 1.25s peak did not recur: render maximum 21.065ms, p95 16.935ms; RAF interval maximum 66.495ms, p95 49.91ms; physics total p95 3.155ms. This narrows the observation to a non-repeated first-run spike but does not identify its cause or establish a before/after regression. These are Intel UHD measurements at 1600x900, not proof of a target FPS or smooth incursions with many animals.
