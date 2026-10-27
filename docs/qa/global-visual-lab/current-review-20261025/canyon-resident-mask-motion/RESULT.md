# Negative control: regional resident mask does not cover Canyon

2026-10-25, current review, media, seed 712, 720p, native longitudinal camera, active simulation, day/night. Candidate only adds groundResidentMask=1 to the baseline URL; no production code changed.

Inspected day-6.png at full resolution. The same rectangular opening remains; chunk 0,4 is absent and one chunk is preparing. Console errors empty; final GL error zero. Do not adopt this flag as a Canyon fix.

Code attribution: far-vegetation-profile.js explicitly excludes canyons/desert from includeFarGround. The flag only controls native-far-ground.js. Canyon uses NativeHorizon instead. Its horizon material sets horizonBounds, and AfricanToon plus standard-depth discard the entire near rectangle. The spatial horizon builder also omits cells entirely inside that rectangle. A shader-only mask is therefore insufficient: missing central geometry cannot be recovered by changing discard.

Next investigate atomic handover of the existing horizon and installed near chunks, or a deliberately retained/constructed fallback for missing cells. Ensure both color and shadow/depth coverage agree and account for render-origin rebasing. Do not introduce synchronous terrain generation to hide the missing chunk.

The 19 existing far-ground ownership/seam/visibility tests pass. They do not exercise NativeHorizon missing-cell coverage. Capture observations include recorder overhead and are not performance measurements. Default review recipe remains unchanged.
