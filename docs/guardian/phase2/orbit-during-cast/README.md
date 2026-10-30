# Camera orbit during active casts

Added opt-in `?orbitDuringCast=1` to the WorldScene QA fixture. It advances the camera orbit at .7 radians per simulation second only while a summon has an event. This tests motion during the cast, unlike the ordinary recorder's between-cast angle changes. The actual game's camera code is unchanged. Uses the installed broader-mantle GLB, with no candidate override.

Recorded day.webm and night.webm through Grabar día/Grabar noche, sound enabled. Adjacent JSON files contain runtime status. Day covers six Grow/Multiply commands, including a 300 ms replacement; night covers Attack and Shield, hyena/rhino and repeated hits. The existing QA fixture resets spell restrictions; these are not balance tests. Day uses presentation clock, night uses Game.tick during the recording.

Inspected the adjacent contact sheets at one-second intervals. Target effects remain visible through the moving views; night shows falls, subsequent recovery, and disappearance of the Guardian. Final night status has zero errors, one maximum visible Guardian, zero active summons/physics and zero roll failures. No fine-grained impact timing or subjective sound judgment is inferred from the sheets.

**Observed visibility limitation:** large orbit changes during a fixed-world summon can let the nearby building partially obscure the Guardian; the daytime close approach also clips it at the left image edge in one sampled view. This is not an all-angle visual pass. The summon retains its world location and does not follow the camera or teleport mid-cast. Further placement/visibility decisions must preserve that requested behavior. Recordings are evidence of the limitation, not justification to hide it. No new performance measurement is claimed.

## Initial lateral visibility correction

Code inspection found that initial candidate visibility sampled only three points on the body's centerline. Added two camera-right/left samples at .8 * bodyScale to detect an occluder hiding one side while leaving the center clear. The planner remains bounded and runs on accepted commands; no per-frame following or camera movement is added. The normal sixteen-candidate pass performs 80 occlusion calls instead of 48. Incremental command cost and new graphical behavior still need measurement.

A regression places a narrow occluder over only the preferred candidate's right-hand silhouette sample. It fails on the original implementation (no lateral sample) and passes with the correction. All fourteen placement tests pass. Existing day/night recordings above predate this change and do not visually validate it. This fixes a specific initial visibility blind spot; it does not guarantee visibility after arbitrary camera rotation.

### Corrected day run and command-cost check

Repeated the actual day sequence after de650c46f, with the same orbit flag and six commands. lateral-day.webm/json and the one-second contact sheet document that run; inspected the sheet. Commands complete with zero errors and at most one Guardian. Large subsequent orbit changes still crop the actor, so this is not a solution to arbitrary post-placement visibility. The lateral regression remains the direct evidence for the newly covered initial-occlusion case.

A production build ran concurrently with part of that first recording, invalidating its timing comparison. Build completed successfully in 14.67 s with existing mixed-import/chunk-size warnings. Reloaded and repeated after it finished, with no agent-side compilation/render workload: lateral-clean.webm/json. That second run again reports zero errors. Its six planning times are 5.285, 2.190, 1.265, 4.340, 4.640 and 4.840 ms. The earlier three-point day reference had 3.350, 2.130, 1.175, 2.780, 3.015 and 3.485 ms. The sample is small, sequential and not phase-locked; it suggests increased command-planning cost, consistent with 80 rather than 48 rays, but cannot precisely attribute the difference. Work occurs per accepted command, not every frame. No new raid FPS claim is made. The second video was saved but was not separately visually reviewed; the first post-correction sheet is the graphical evidence for this turn.

## Visibility pruning

The placement search now evaluates visibility in ascending lower-bound score order and stops only when every remaining clear candidate cannot improve the best fully evaluated score. Original candidate order resolves ties. When no ground candidate is clear, all visibility scores and their original ordering are retained for the aerial fallback.

Reproduce: `node --test tests/guardian-placement.test.js` (15 passed), then `node tools/guardian/audit_placement_pruning.mjs`. The latter compares against commit 8f903ec4e across 1,000 seeded synthetic scenes, including 200 with all ground placements blocked, varied cameras, slopes, silhouettes and occupants. Exact output positions match in all scenes. Visibility queries fall from 193,510 to 134,130 (30.69%). These counts are not a GPU/frametime benchmark or new visual acceptance; existing orbit occlusion/cropping limitations remain.

### Graphical regression after pruning (ede7aff23)

Recorded `pruned-day.webm` and `pruned-night.webm` from the installed production model in the WorldScene fixture with `orbitDuringCast=1`, sound enabled. Both contain audio/video tracks (ffprobe); audio mix was not perceptually reviewed. Reviewed the corresponding 1 fps contact sheets. Day covers six Grow/Multiply commands including 300 ms replacement; night covers Attack/Shield, hyena/rhino, repeated attacks and recovery. Both reports finish with errors=[], maxVisibleGuardians=1, active=0, combatPhysics.active=0. Night reports rollFailures=0 and recovery completion. Large camera turns still cause partial occlusion/cropping; these recordings do not establish all-angle visibility or full-frame anatomical acceptance. Day command planning times: 4.575, 1.810, 2.050, 1.965, 0.920, 2.390 ms. Sequential recordings are not controlled comparative performance evidence. Night reports a 22.48 ms maximum physics step, so do not infer absence of hitches from successful cleanup.
