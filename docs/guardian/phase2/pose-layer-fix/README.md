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
