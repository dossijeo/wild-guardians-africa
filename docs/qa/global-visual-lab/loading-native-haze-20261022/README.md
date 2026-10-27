# Native loading atmosphere and mockup review

The diffuse option now includes the selected peripheral haze opacity (.76 near / .92 distant). The default loading atmosphere is unchanged. This uses the existing fullscreen mist draw and removes the loading-mist QA route from this capture.

Reproduce: `node tools/experiments/capture-loading-native-haze-20261022.mjs` (Vite 5190). Four real captures are pixel-identical to loading-native-contact-20261022. Day/night, 1280x720 and 390x844, seed 712, progress .75. Static counters: 6 draws / 16002 triangles. No console or GL errors; six shadow direction poses pass and world shadow ownership is restored. Five focused tests pass. No new timing or FPS claim.

Side-by-sides preserve each source aspect ratio; the daytime mockup is 1280x571, not 1280x720. Left: original user mockup. Right: real game capture. Remaining observed differences:

- Night sky outside the beam is too dark/desaturated; stars are smaller and less prominent than the reference.
- Night island edge reaches near-black whereas the reference retains blue ground detail. Keep the strong central pool, recover a little peripheral detail.
- Day soil is grayer and less warm than the reference; the mesa and haze now provide a similar overall direction.
- The actual plants occupy a wider, more dispersed group and retain the original mature maize model with tassels/yellow leaves. Do not replace its silhouette to imitate the AI plants.
- UI ornament is brighter/more saturated; night still retains sunflowers unlike the reference. Cancel is smaller. These differences are visible and not yet resolved.
- The daytime beam is broad and diffuse but its parallel structure is less perceptible than the reference.

Global sky grading remains a QA route. Full-region feedback, initial portrait leaf edges and additional aspect ratios remain pending. Full visual quality is not claimed.
