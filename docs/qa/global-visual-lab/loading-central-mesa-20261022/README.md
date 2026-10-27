# Central mesa loading backdrop

QA refinement following the user's original day mockup. `day-comparison.png` shows original reference, preceding diffuse-light renderer, and central-mesa candidate. Original maize, fixed camera, illumination and shadow direction are unchanged.

Reuse a central portion of the existing savanna backdrop atlas: UV .06,.515625,.35,.984375, aspect 2.47, height 7, baseY -2.6. No new asset or draw. Increased fog mixing .45/.85 and mip bias 2.5 soften the distant mesa. This decorative atlas composition does not change game models or authoritative terrain.

An initial height-9 version was visually rejected: the peak crowded the top edge and looked too close. The selected version lowers/reduces it and increases atmospheric softness. The daytime sky still looks greyer than the mockup; that remains a separate refinement.

Eight real captures: 1280x720/390x844, day/night, same four plants, progress .75, seed 712. Six cached-shadow draws and 16002 triangles, no GL/JS errors. Both night candidate images are pixel-identical to the previous diffuse-light version. Projected light/shadow direction checks remain passing. No GPU-time saving is claimed; no timing benchmark was run for this composition-only change.

Reproduce with `node tools/experiments/capture-loading-central-mesa-20261022.mjs` and Vite port 5190. The files named base compare original illumination with the same new backdrop; use `day-comparison.png` to compare backdrop versions. Retained as QA candidate, not integrated into production. Portrait inspection confirms the plants remain visible, but full-capacity and animated-orbit validation of this backdrop remain pending.
