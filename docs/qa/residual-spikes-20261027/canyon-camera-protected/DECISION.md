# Canyon blue capture was a QA camera fault

Original scripted quality travel replaced World.updateCamera with lookAt only and translated x at fixed eye/target height. Diagnostic replay measured eye y=16.9193, terrain y=38.7750 at the same x/z: the eye was 21.8557 m underground. Target y=3.9678 was also below terrain y=40.5109.

Removed that QA override, preserving production terrain protection. Same historical fixture and three quality changes now yield eye y=53.6423, clearance14.8673m. Simulation advanced240/240 travel frames, zero paused frames,15 new chunks,zero failed or pending final jobs. Medium capture inspected: terrain and props visible. No production renderer code changed. This resolves the blue-image attribution, not a full artistic signoff: a distant terrain line is visible and remains to inspect.

Raw reports and captures retain both cases. Reproduce corrected case with node tools/experiments/check-canyon-camera-diagnostic.mjs <new-output-directory>. For the original camera case, use spatial-thread-game-quality-case.js from b7078fa3a; the diagnostic tool itself only adds capture-time camera/ground readings. Preexisting harness diff is stored in the sibling six-biome-quality-defaults directory. No performance acceptance: these runs retain synchronous GL diagnostics and screenshot settling.
