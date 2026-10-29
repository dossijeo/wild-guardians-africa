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
