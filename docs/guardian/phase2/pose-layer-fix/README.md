# Guardian pose-layer correction: native night sequence

`night.mp4` is a 23.672-second native WorldScene recording with global AO and cinematic lighting enabled (savanna/Suajili). H.264 1600x900, 30 fps container, AAC audio; 11,424,294 bytes. Encoding at 30 fps does not establish 30 distinct game frames per second.

The existing `recordNight` fixture exercises hyena Attack, Shield, rhino attacks, camera changes and repeated hyena hits through recovery. QA resets spell cooldowns and may replace the selected beast; this is not production balance or a performance benchmark. Audio was unlocked and an audio stream is present; no full perceptual mix review is claimed.

The capture finishes successfully. `night-report.json` records maximum one Guardian, zero final active/visible/pending summons, zero physics bodies/active simulations and no errors. The final animal has no down state. The report is a post-recording snapshot, not a complete per-frame physics trace.

`night-sheet.jpg` samples every two seconds and was visually inspected: manifestations, knockdowns and return to standing are visible. The last black cells are contact-sheet padding. The strategic framing is insufficient for full detailed cloth/face approval, and sampled stills cannot prove smoothness between samples. A close continuous motion review remains open.

The corrected runtime restores the mixer's clean pose before additive wind/aim/point layers. This avoids accumulating transforms when the sampled pose has not changed. Original wind amplitudes and source clips are preserved. See `tests/guardian-pose.test.js` for the old-path reproduction, repeated samples/seeks, and installed-rig checks across four spells.

## Daytime companion

`day.mp4` (22.422 seconds, 15,828,157 bytes) records the existing Grow/Multiply sequence with camera changes and closely spaced final casts. It uses the presentation-only fixture clock, not full Game.tick, so crop maturation is not validated here. `day-report.json` records zero errors, maximum one Guardian, and zero final active/visible/pending summons. `day-sheet.jpg` was inspected at two-second sampling; its final black cell is padding. This is strategic visual evidence, not a fine cloth-motion or performance approval. The current face/pose/lap-pose checks also pass (10 tests); their coverage does not replace perceptual review of speech.

## Daytime simulation correction

The recorder now uses Game.tick for both day and night and stores per-plant initial/final growth and watering states. An initial run with full ticking still showed no growth because the crops had never received their first watering; `day-unwatered-report.json` retains that result. The day fixture now explicitly prepares initial watering through the normal `waterPlant` function. Production rules are unchanged.

`day-simulation.mp4` supersedes `day.mp4` for actual crop advancement. In `day-simulation-report.json`, plant-3 advances from 0 to 31.5575 growth seconds while reference plant-5 advances to 21.8809. Initial watering is recorded as manual for both. Sampled video frames visibly show crop growth and Guardian manifestations; there are no reported errors. This does not establish harvest/delivery completion, resource balance or performance: the fixture still resets cooldowns and prepares watering. Nineteen existing spell-preview, Multiply-persistence and crop-lifecycle tests pass. The close cloth-motion and wider AO review remain open.

## Close Attack inspection

`attack-close.mp4` records the active Attack from simulation age 0.02 through disappearance using Game.tick. The new `recordGuardianDetail` QA control frames the active Guardian, records until the summon ends, and pauses the scene afterward. It does not change production camera behavior. `attack-close-report.json` reports 2.460725 simulation seconds, zero final visible/pending summons and no errors.

`attack-close-sheet.jpg` was visually inspected at six samples per second. The sampled mantle no longer shows the accumulating wrapped/pinched pose seen before the correction; the casting arm gesture, luminous vortex and dissolution are visible. The final black cells are padding. The beam exits the close frame, so this recording cannot validate its contact with the beast or recovery. Sampled images do not establish continuous motion smoothness, full cloth/plume artistic acceptance, performance or other camera angles. The wider validation remains open.

## Joint Attack framing

The QA detail control now offers `Incluir objetivo en detalle`. It encloses the Guardian, the target model and contact point, adds a two-meter motion margin, and fits a bounding sphere using the limiting horizontal/vertical camera FOV. This affects only the QA camera.

`attack-joint.mp4`, `attack-joint-sheet.jpg` and `attack-joint-release.png` retain the native night Attack with both characters in frame. The sampled sequence shows the connecting discharge followed by recoil and falling; the inspected release image is extracted at video time 0.35 s (video timestamps are not simulation age). The report records 2.486775 simulation seconds, zero final visible/pending summons and no errors. The view is still too wide for exact palm/contact-surface certification; the recording ends before recovery. No frame-accurate audiovisual timing, full recovery, continuous smoothness or performance approval is claimed.

## Installed-rig discharge verification

The added guardian-pose regression loads the installed Guardian GLB and its authored Spell_Attack clip, with an actual live victim ID. It samples charge, early/mid/late flight and impact across three contact locations including elevation changes. It verifies a real hand binding, changing hand poses, charging at the hand, initial trail attachment, both cylinder endpoints on the current hand-to-contact segment, no premature tip contact, and impact flash/location at the shared marker. The trail is intentionally detached from the hand late in flight. This geometric check does not certify the bone lies inside the visible palm surface.

37 tests pass across guardian-pose, guardian-singleton, guardian-combat and guardian-surface-pick, including installed skin picking for all five beasts and sequential presentations. Combined visual timing/audio and exact visible palm placement still require perceptual review.

## Continuous joint capture through recovery

`attack-recovery.mp4` extends the joint view through the selected hyena's full down state, recovery pose blend and 750 ms of resumed simulation. The QA recorder now follows the original target ID, samples logical position/down/recovery-exit state, and distinguishes a disappearing victim from completed recovery. It bounds waiting to 90 real seconds. No production mechanics change.

`attack-recovery-report.json` records 8.41227 simulation seconds, enteredDown=true, completed=true and no errors. The target remains present and resumes walking after recoveryExit clears at sampled time 7.4647 s. Its largest sampled horizontal displacement while down is approximately 2.06 world units; this includes settling/alignment, not only airborne travel. `attack-recovery-sheet.jpg` was inspected at two samples per second: fall, grounded pose, rising and standing/walking remain in frame. Black final cells are padding. This is one nighttime hyena on this terrain/camera; detailed limb/foot clearance, other species/angles, audio mix and performance are not certified by this view.

## Heavy-species follow-up

`rhino-recovery.mp4` and its report retain a second native nighttime cycle. The rhino enters down state and completes recovery plus exit blend in 10.511365 simulation seconds, remains present, resumes walking, and reports no errors. The sampled contact sheet was inspected: knockdown, prone/rolling poses, rising and walking remain visible. This is not an exact camera/direction match to the hyena: placement uses the currently selected camera.

The rhino moves about 0.60 horizontal world units by the sample nearest one second, versus 1.52 for the hyena. Its maximum displacement while down reaches 2.8003, versus 2.0631 for the hyena. Thus total down displacement cannot be presented as a direct knockback/mass comparison: later motion contributes substantially. The recording report did not yet retain phase names, so the cause of the additional travel is unproven. Future recorder samples now include magicDown.phase to distinguish fall/roll/recovery. The heavy-species late displacement remains a review item, not a certified outcome.

## Rhino phase-localized repeat

`rhino-phase-report.json` repeats a nighttime rhino hit after a fresh QA reload, with phase labels; `rhino-phase-summary.json` groups consecutive samples. This run uses the initial camera, so it does not reproduce the prior trajectory exactly. The target completes recovery, remains present and resumes walking without errors. Recorded simulation duration is 10.030245 s.

Between the first/last samples of each phase, horizontal logical displacement is 1.4027 units during falling, 0.7874 during rolling, and zero during recovering. These are endpoint displacements, not accumulated path length; gaps at transitions are excluded. The final pose blend overlaps resumed navigation, as designed, and is not part of the fall distance. This localizes the extra travel in this run to pre-get-up dynamics rather than drift during the authored get-up. It does not establish the cause of every previous trajectory or certify all collision cases. No impulse/mass tuning was justified from this evidence alone.

`rhino-phase.mp4` retains this exact run. Its one-frame-per-second sheet was visually inspected: the animal stays in view through rolling and standing; fine foot clearance and motion between sampled frames remain unverified.

## Native presentation frame comparison

`frame-pairs-first.json` and `frame-pairs-warm.json` retain two actual browser runs without video recording. The existing harness uses eight balanced off/on blocks (1.2 s warmup and 4 s sampling each), Attack commands every 600 ms, 20 beasts, 1600x900 at pixel ratio 1, Intel UHD Graphics/D3D11, native spatial authority, cinematic lighting and global AO. Its presentation-only clock excludes navigation and active ragdoll simulation. QA resets cooldowns. All blocks report zero hidden frames and both runs report no errors.

The first run is not a clean incremental comparison: its initial reference block has a 2161.58 ms p99 and draw counts still change (154 then 146). The warm repeat has reference draw p95=146 and Guardian p95=157. Guardian animation CPU p95 ranges 0.230-0.260 ms, VFX CPU p95 0.355-0.390 ms. These are separately instrumented CPU sections, not total frame cost or GPU time; do not add percentiles as if they were simultaneous.

Warm reference frame p95 ranges 116.37-133.32 ms; Guardian p95 ranges 116.675-149.57 ms. Guardian median frame time alternates between roughly 33.4 and 49.8 ms; reference medians stay around 33.3-33.5 ms. This is not evidence of negligible impact or satisfactory fluency. The report contains block aggregates rather than raw per-frame distributions, lacks GPU/memory measurement, and does not isolate baseline stalls. A causal GPU/frametime assessment and actual raid/physics comparison remain open. Baseline engine performance investigation belongs to the separate ongoing task.

## Direct submission audit

`attack-arrival-draws.json` and `attack-impact-draws.json` inspect one forced frame each, outside timing, with the 20-beast scene held paused. Renderer counters are 155 and 157 respectively; these phase snapshots are not timing samples. The Guardian body submits four skinned meshes once each: main body 15,361 triangles, eyelids 9,472, localized mouth parts 768 and 128, total 25,729. Eyelids account for about 36.8% of body triangles. Source inspection confirms no Guardian shadow casting and single-pass transparent body/vortex materials. This audit does not show a redundant body pass to remove.

Eyelid geometry is a potential strategic-distance LOD target, but has not been altered: its shape keys, full/partial closure and visible rim quality must survive any simplification. Triangle share alone does not establish that it is the frame-time bottleneck.

## Lion lateral impact

`lion-side.mp4` and `lion-side-report.json` record the native nighttime lion with the QA side-direction override. This fixture places the caster three units to the side of the animal heading and offsets the contact by 0.7 footprint radius; it does not validate automatic placement or exact skin ray picking. Actual Game.cast/Game.tick and installed rig/physics are used. The capture lasts 9.062675 simulation seconds, enters down state, completes recovery and exit blend, and resumes walking with no errors. Maximum sampled horizontal down displacement is 2.1141 units. The physical roll completes without timeout (0.4833 s, final angular error 0.14284 radians).

The 1.5 fps contact sheet was inspected: discharge, lateral fall, grounded pose, rising and resumed movement remain visible. The wide view does not certify fine foot clearance, every joint angle or continuous smoothness. No collision with the nearby building is inferred from this view. This adds one directional/species case, not the full collision/angle/performance matrix.


## Native lion fall against a wall

`lion-wall.mp4`, `lion-wall-sheet.jpg` and `lion-wall-report.json` record an actual Game.tick / native WorldScene cycle with one lion and a thorn wall. The fixture previously tried to build while a prior raid remained active; production correctly rejected that command. The wall setup now clears the previous QA raid and spell presentation before building during daytime. Production permissions are unchanged. The successful repeat deliberately began with an existing prepared beast.

The 12.011 simulation-second run issued one Attack, recorded falling, rolling, recovering and walking, and ended with zero downed actors and no errors. Six diagnostic samples registered structure contacts, maximum 13 contact pairs. The lion retained 84 health and resumed walking. The one-second contact sheet was visually inspected: the fall, grounded pose, rise and resumed movement are visible beside the wall. This wide view does not establish fine skin penetration bounds or continuous perceptual smoothness. Contact counts include structure colliders, not a per-wall skin intersection measurement. Audio was not unlocked, so this recording does not validate SFX.

Recorded performance is diagnostic only (video capture active): frame p95 66.765 ms, p99 83.235 ms, max 382.275 ms; total physics p95 7.685 ms. These figures are neither a paired regression comparison nor a fluency acceptance. Further obstacle types, elevations and species remain pending.


## Attack timing and concurrency evidence scope

Production Attack uses a 12-second simulation cooldown (`Game.cast`), with release/impact markers at 0.14/0.24 seconds and 0.28 seconds of initial afterglow (`guardian-timing.js`). Health and interruption are committed immediately; the physical/visual response waits for the impact marker. The cooldown tests exercise pause, save/load and subsequent eligibility. Consecutive normal player Attacks therefore cannot overlap this 0.52-second presentation window.

The QA cast helper deliberately resets cooldowns. Its rapid multi-target measurements are stress fixtures, not proof of normal balance or economic behavior. Guardian presentation queue tests prove one visible instance and sequential hand-origin beams; alone they do not prove damage/VFX synchronization for commands forced inside the cooldown. The production simulation has no such rapid-command queue. Do not use a forced simultaneous Attack fixture as evidence of correct player-facing impact timing. The 0.6-second sequential impact recorder avoids the presentation window, but still bypasses production cooldown and remains a stress test.

The singleton lifecycle regression also covers replacement of the state object, clock rollback and a game result with four queued presentations: the queue is emptied, all six presentation objects are hidden, historical events are not replayed, and new commands after replacement/rollback work. This is automated lifecycle coverage, not graphical scene-transition acceptance. The combined singleton/combat/audio suites pass 35 tests at commit 8e5382eff.


## Grow close wind baseline

`grow-close.mp4` and its 6 fps contact sheet show daytime Grow from early materialization through dissolution. The hands and outgoing beams are visible, but cloth motion remains restrained from this angle. This is a baseline for further wind iteration, not artistic approval of the requested broad flag-like motion. The full repeat report was lost when the QA pause-label correction reloaded the page; `grow-close-report.json` explicitly records this limitation instead of attaching metadata from an earlier late-start capture.

The physics measurement had left the pause button saying Freeze while simulation was already paused. Its cleanup now sets Resume consistently, preventing accidental unpause during subsequent frozen captures. This affects QA controls only.


## Travelling secondary spell wind — superseded binding evidence

`guardian-spell-wind.js` replaces the short uniform arrival gust with sustained, phased secondary motion over the authored Mantle_Spell clip. Mantle anchors/middle/tips use 0.035/0.16/0.29-radian base amplitudes with phase delays by depth and panel; feathers use separate root/tip amplitudes and wood a slower response. A smooth entry and fade bound the layer. It changes rotations only after clean pose restoration, adds no geometry or draw calls, and performs no per-frame object allocation. CPU cost has not yet been measured comparatively.

`grow-wind-v2.mp4`, report and 6 fps contact sheet show real Game.tick/native WorldScene, beginning at age 0.12 s and ending with zero visible/pending summons and no errors. Sampled frames show a wider lower cloth silhouette early in arrival, visible hands and intact disappearance. Camera/background differ from the prior baseline, so this is not a matched pixel comparison. Full broad-wind artistic acceptance, rear angles, night and all four spells remain pending. Nineteen pose/singleton tests pass, including repeated renders of the installed rig and hand-origin Attack trajectories.


## Shield night side inspection — before binding correction

`shield-wind-v2.mp4`, report and 6 fps contact sheet capture the new secondary wind in native nighttime WorldScene, starting at spell age 0.12 s. Actual Game.tick advances 2.32834 seconds, with no reported errors, zero visible Guardians and zero queued presentations at the end. The sheet was inspected: lower cloth changes silhouette, hands/projected energy remain visible from this side, the spirit dissolves, and the persistent Shield dome correctly remains. This is not full angle/intersection or performance acceptance.

An initial frontal close-camera attempt landed inside a building and was rejected; it was replaced, not counted as passed. The QA detail camera now has front/right/rear/left choices. Only the QA camera changes: player camera and production placement are untouched.


## Correction: Three.js bone-name sanitization

The first wind benchmark found **zero matching bindings**: GLTFLoader removes periods, so `Mantle.FL.0` becomes `MantleFL0`. Consequently `grow-wind-v2` and `shield-wind-v2` did NOT exercise the new procedural wind. Their visible motion came from the baked clip; prior attribution to the added wave was incorrect. They remain historical evidence only. The binding now accepts both authored and sanitized names. The installed-rig test asserts exactly 12 cloth, 8 feather and 4 wood bindings, in addition to repeat-pose stability and hand trajectory checks. All 19 selected tests pass.

`shield-wind-bound.mp4` and the inspected 6 fps sheet are after this fix, from age 0.31962 s through disappearance. The lateral lower-cloth silhouette moves without obvious gross breakup in the samples. A second attempted Shield was correctly rejected for overlapping areas before recording; that error remains in the report. This is therefore not a clean full command-flow validation, nor all-angle cloth acceptance.

Reproduce CPU measurement with `node tools/guardian/benchmark_spell_wind.mjs`. `spell-wind-cpu.json` contains 12 alternating ABBA/BAAB blocks, 4,000 updates per batch, on the installed 24-bone rig. Node 20/i7-11800H median batch-average time is 0.003693 ms for the former gust versus 0.004111 ms for the bound wave, both including identical pose restoration. This is an isolated CPU microbenchmark, not browser frame percentiles, GPU cost or raid performance. The earlier zero-binding measurement was discarded. Production build passes (541 modules), with existing mixed-import and large-chunk warnings.


## Multiply rear view after binding correction

`multiply-wind-rear.mp4`, report and 6 fps contact sheet inspect the active 24-bone wind from behind in daytime native WorldScene. The capture begins at 0.12 seconds and advances 2.344095 simulation seconds; it ends with zero visible/pending summons. The rear cloth hem varies in height/silhouette, ornament geometry remains attached in the sampled frames, and dissolution completes. The retained Shield dome is from the preceding command and is intentionally not cleared by the recorder.

The report preserves the previously recorded Shield-overlap rejection; no additional error was added during this capture. This is visual rear coverage of Multiply, not a clean-start integration run or a continuous-motion/performance approval. The close view exposes the back but does not prove all fine cloth/body intersections are absent.


## Attack with active wind and captured SFX

`attack-wind-audio.mp4`, report and one-second contact sheet show native nighttime Attack from age zero through completed hyena recovery (11.12386 simulation seconds). The report explicitly records 24 wind bindings, no pre-existing or new errors, zero final visible/pending summons and a completed down/recovery cycle. The audio context was unlocked; appearance, launch, species hurt, impact and disappearance cues report played. The MP4 contains AAC audio. Playback events and an audio stream do not establish perceptual mix quality or audible synchronization, which remain unapproved.

An initial low joint framing hid the fall behind a rock and was replaced. Joint Guardian/target inspection now raises the QA camera elevation ratio from 0.22 to 0.7; body-only close framing is unchanged. The replacement sheet was visually inspected: the target remains visible through fall, grounded recovery and walking. At this wide scale it cannot validate fine cloth intersections or contact deformation. Production camera behavior is untouched. Close reports now record the selected angle, binding count, pre-existing error count and errors during recording while retaining the complete error list.


## Solid placement envelope

The world planner previously checked only a 0.45 m radius torso capsule against indexed buildings/props/walls although framing reserved substantially wider cloth space. The solid envelope now uses 1.2 m times bodyScale. A regression exercises the real world-plan wrapper and volume index with a wall that misses the old capsule but touches the mantle envelope; the chosen alternative clears it. All 19 placement tests pass. `placement-wide-envelope.png` is a native daytime Grow smoke inspection beside the village, not exhaustive crowding or all-camera acceptance.

## Buffalo elevated impact

`buffalo-high.mp4`, JSON and 2 fps contact sheet record an elevated Attack with the active 24-bone wind and real Game.tick, from age zero through completed recovery (9.40025 simulation seconds). Maximum visible Guardians remains one; the cycle ends with no errors and no pending summon. The right-side QA view leaves the buffalo visible during fall, roll, get-up and resumed walking. Two earlier views were rejected because a building or tree canopy concealed the action; their recordings were replaced.

The elevated origin is a QA direction override, not evidence for automatic placement. The wide view supports gross cycle continuity but cannot approve fine skin/ground contacts or continuous-motion quality from the sampled sheet alone. Audio events are preserved, including earlier attempts; this is not perceptual sound-mix approval or a performance benchmark.

## Recovery handoff instrumentation

The close recorder now captures visible hip world position and recovery solid correction alongside logical x/z. Logical positions alone cannot establish a visible teleport because BeastRecoveryExit retains and blends the world pose for 0.3 seconds.

`buffalo-handoff.json` and matching MP4/sheet repeat elevated Attack after a fresh page load. The inspected sheet shows a complete cycle. Across the samples at 7.33935 and 7.43913 seconds, logical displacement is about 0.150 m while visible hip horizontal displacement is about 0.0133 m; solid correction is zero in the last recovery sample. This supports continuity for this run, not a reproduction or explanation of the larger lateral change in the earlier recording. The dedicated world-pose handoff regression passes. No production recovery behavior was changed on this evidence.

## Broader distal wind and complete Grow capture

`grow-wind-bound` is the first complete Grow capture with verified 24 bindings (age zero, 2.47652 simulation seconds, no errors). Its lateral silhouette remained restrained. The follow-up increases cloth root/middle/tip amplitudes from 0.035/0.16/0.29 to 0.045/0.24/0.48 radians, feather root/tip from 0.10/0.24 to 0.13/0.32 and wood from 0.15 to 0.22. Phase delays, frequency and fade remain unchanged; no additional bones, draw calls or simulation loop are added.

`grow-wind-wide` captures the revised values from age zero for 2.511315 simulation seconds, again 24 bindings and no errors. The inspected 6 fps sheet shows greater hem lift/curvature without gross mesh separation in these samples. Both are daytime lateral views but use different crop sites after reload, so they are not a pixel-aligned controlled comparison. This does not establish all-angle intersection clearance or acceptance for the other spells at the new amplitudes. All 19 pose/singleton tests and the 541-module production build pass; existing chunk-size/mixed-import warnings remain.

## Broad wind across the remaining spells

`multiply-wind-wide`, `shield-wind-wide` and `attack-wind-wide` add age-zero recordings on the larger amplitudes from 667d14ea6. Each reports 24 bindings, zero preceding/new errors, and zero final visible/pending Guardians. Durations are 2.49439, 2.461675 and 2.49561 simulation seconds respectively, using Game.tick.

The inspected 6 fps sheets cover daytime rear Multiply, nighttime left-side Shield and nighttime right-side Attack. The rear hem changes silhouette; no obvious mantle/arm penetration or detached Guardian ornaments is apparent in these samples. Shield retains its dome, and a moving lion crosses behind the spirit. Attack visibly begins at the hand, but its victim leaves the close frame; this capture does not validate the victim's full fall/recovery. These recordings provide specific views, not continuous-motion or all-angle acceptance. Audio was not unlocked in this session, so these are silent visual evidence.

## Four active impact cycles after broad wind

`four-impact-cost.json` is a native WorldScene/Game.tick run with four hyenas and sequential QA commands at 0, 0.69846, 1.34633 and 2.045005 simulation seconds. QA resets the normal Attack cooldown, so this is a concurrency stress fixture, not normal gameplay cadence. All four recover; peak articulated actors is three and peak baked fallback one; no errors or hidden frames; 16.065285 simulation seconds / 514 sampled frames.

Frame time mean/p95/p99/max: 32.61/66.48/83.035/83.54 ms. Physics total p95 8.65 ms; solver p95 3.165 ms; recovery-follow p95 5.575 ms; visual recovery p95 4.395 ms. These inclusive/phase-dependent percentiles must not be added. Guardian animation p95 0.230 ms, VFX p95 0.750 ms. Draws p95 103; renderer memory reports 343 geometries/173 textures, JS heap 497,519,696 bytes (not total GPU memory).

This is diagnostic evidence, not a paired before/after regression measurement. Source inspection identifies authored recovery sampling in both the physics follow path and visual render path; reusing an identical pose is a candidate optimization, requiring contact/world-transform validation before adoption. Baseline engine performance is not attributed to this feature. Audio was not unlocked and no video was recorded in this run.
