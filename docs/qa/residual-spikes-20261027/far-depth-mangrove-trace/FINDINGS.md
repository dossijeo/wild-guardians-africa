# Manglares preparation attribution

One instrumented candidate run, not an A/B acceptance run. During the measured camera travel, 71 depth submissions: 64 native merged asset roots and 7 unnamed terrain roots. Submission CPU sum 59.27 ms, maximum 3.695 ms. Readiness intervals sum 994.56 ms, maximum 429.04 ms. Intervals overlap and are not additive blocked CPU or wall time.

Travel completed in 16.685 s with 15 chunks, 240 advancing frames and zero final failed/pending work. Direct submission CPU alone cannot explain the preceding multi-second A/B regression. This evidence does not establish that repeated material UUIDs are duplicate program recipes, nor justify skipping readiness.

Next attribution must distinguish GPU/driver contention, resource publication timing and scene-state divergence (simulation advances with wall time). Preserve the negative ABAB and do not claim the depth candidate globally accepted.
