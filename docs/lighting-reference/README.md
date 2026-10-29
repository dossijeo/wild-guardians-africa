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
