# Day loading atmosphere

Reference / prior / new comparison in day-comparison.png. The prior loading mist vignette darkened both sky and fog: edge opacity .30 and RGB multiplier .70. This candidate changes only the day endpoints to .08 and .96, and warms mist day colour from #dac5a0 to #ead4b4. Night endpoints remain unchanged. The soil/material beam illumination remains the preceding diffuse-contrast implementation with aligned shadows, and the existing atlas central mesa is reused.

Eight real screenshots at the same seed, crop progress, camera and viewport as the previous candidate. Six cached-shadow draws, 16002 triangles, zero GL/JS errors. Both night beam screenshots are pixel-identical to the previous central-mesa version. Direction audits still pass at -10/0/+10 degrees in both formats. No new draw/texture/geometry, but no GPU timing claim is made.

Retain as a visual candidate: daytime sky/fog no longer flatten into grey and the dark island remains distinct. The mockup has different cloud detail and greener maize; original maize models and fixed zoom are preserved. This is still QA routed presentation, not an integrated native loading screen. Integration, animated performance and full-capacity validation remain required.

Reproduce: node tools/experiments/capture-loading-day-air-20261022.mjs with Vite on port 5190. Filenames base/beam compare lighting inside this harness; compare the beam image with loading-central-mesa-20261022 for the atmospheric change alone.
