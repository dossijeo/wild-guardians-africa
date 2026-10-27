# Isolating render-origin changes

QA-only origin sequence0/96/0/96/0 with fixed populated camera, target and resident chunks. No scene movement or group reset. Uses original render path and restores automatic origin updating after each phase. Medium, seed712,1280x720,full backgrounds, paused state, day/night. Run audit-volcano-origin-isolation-20261022.mjs then compare-volcano-origin-isolation-20261022.py from tools/experiments.

All10 stops completed without browser/GL errors or saved-state changes. Calls102 and triangles603242 stay identical across origin changes. Changing origin produces10945 differing pixels/max channel delta41 by day and5145/delta28 at night. Returning to the same origin leaves0–6 differing pixels, maximum delta5. These are exact-image diagnostics, not a perceptual improvement score. No production source changes.

Conclusion: origin change is reversible with small same-origin residuals and does not explain the44-triangle reduction in the streaming experiment. It also does not reproduce that experiment's maximum channel difference171. Streaming and rebasing must not be conflated. No claim of bit-exact origin invariance or global closure.
