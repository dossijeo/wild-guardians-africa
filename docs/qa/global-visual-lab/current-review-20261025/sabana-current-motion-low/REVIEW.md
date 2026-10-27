# Sabana: current low-quality active excursion

Renderer reference edf74541e. Current review recipe, seed 712, 1280x720, baja, pthreads and scheduler, impostors and mountains enabled. Two 40-second out-and-back excursions, live simulation/wind, daytime then nighttime (night continues day state). The recorder and screenshots add overhead; observed frame counts are not FPS benchmarks.

Day: 1405 observed frames, simulation advances 39.744 seconds. Night: 1151 frames, advances 56.013 seconds. Workers move, chunk sets and render origins change; horizontal path audit finds zero deviations. Minimum eye clearance is 7.777 m in both phases. No recorded console errors, no observed pauses, no vegetation capacity overflow; final GL error zero. Final near queues are empty in both phases. Sparse GL sampling does not establish that every intermediate call was error-free.

Both nine-panel contact sheets and full-resolution midpoint day/night images were inspected. Foreground grass remains a continuous layer; near trunks, middle vegetation and distant mountains remain visible over terrain. Low quality lacks the shadow depth of the medium artistic reference and nighttime grass has less contrast. Do not change medium density or lighting to match this reduced profile.

Unresolved visual finding: a straight vertical terrain strip in the central background is clearly visible in full-resolution day-4 and night-4. background-edge-crop.png enlarges pixels [450,235,680,300] from day-4 for diagnosis; it is not a new render. The contact sheet alone understated this defect. No blanket visual acceptance: isolate the regional ground/seam mesh before changing density or materials. See the subsequent sabana-seam-isolation experiment.

Videos remain local alongside the raw telemetry; provenance.json records hashes. Reproduce with WG_CURRENT_REVIEW=1, WG_MOTION_SPARSE_GL=1, WG_COVER_QUALITY=baja, WG_FIXTURE_BIOME=sabana, and a fresh WG_REVIEW_OUT, then run capture-horizon-raised-motion-20261023.mjs and audit-horizon-raised-motion-20261023.py.
