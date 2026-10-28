# Four simultaneous impact audit — unresolved roll timeout

Executed graphically at 3e78351c6 with four catalog hyenas in the WorldScene fixture and real Game.tick. The recorder issues four Attack commands in rapid succession with QA cooldown resets. It does not represent normal spell balance, a large raid, or the full native-navigation campaign.

Observed: peak three physical ragdolls plus one baked fallback; one Guardian maximum; no reported exceptions; all four release their down state and the solver has zero bodies at completion. 353 measured frames, none hidden. The video and runtime trace are retained here.

**Not a quality/performance pass:** one physical roll times out at 3.5167 s, with angular error 0.5813 rad and speed 0.2595. The controller therefore uses its procedural recovery fallback instead of the authored get-up. The first trace does not identify that physical actor's recovery class; the fixture now records per-actor physical/baked recovery class and roll progress for a targeted repeat. No tolerance was relaxed to conceal the failure.

Physics mean 3.189 ms / p95 8.235 ms / maximum 32.370 ms; creation maximum 22.825 ms. Frame median is not recorded in this report: mean 47.061 ms, p95 66.455 ms, maximum 83.230 ms. Video capture and an unpaired single run prevent attributing total frame cost to this feature. Scope of follow-up: identify the failed actor and its ground/obstacle contacts, then correct the physical roll or recovery transition and repeat. General pre-existing engine performance remains outside this task.

This recording has no audio track: the fixture had reloaded after the audio-priority edit and sound was not re-enabled. The prior night-audio recording remains the audio evidence.


## Targeted repeat and rejected torque experiment

`repeat-before.json` reproduces two physical roll timeouts. At simulation 6.470 s, qa-beast-1 uses procedural BeastRecovery after error 0.5381 rad; qa-beast-0 remains rolling at error 0.4630, qa-beast-2 uses AuthoredBeastRecovery, and qa-beast-3 uses the baked authored path. Thus fallback is not merely an aggregate counter ambiguity.

Experiment: increased the bounded gravity-support torque multiplier from 1.8 to 2.4, leaving speed, maximum acceleration, orientation tolerance and timeout unchanged. All 35 automated physics tests passed, but the graphical four-impact repeat still produced two roll failures (last error 0.45484 rad, speed 0.57522). See `torque-2.4.json`. **Rejected and reverted**: stronger assistance alone does not establish a fix. The branch retains 1.8. The target orientation/ground and joint contacts require further diagnosis; no root cause is asserted yet.


## Separate hip and torso diagnostics

`roll-body-diagnostics.json` reproduces two roll timeouts. One actor reaches hip error 0.3305 rad while its torso remains at 0.7372 rad. This is evidence of a torso alignment problem, not proof of its cause. The trace now exposes both angles and copies them per sample.

An experiment targeting every body at the authored supine pose was rejected: the graphical run still timed out (last error 3.1263 rad), and the automated suite regressed to 34/35 passing. `rejected-authored-pose.json` preserves that negative result. All physical behavior changes from this experiment were reverted; only diagnostics remain. The simultaneous physical-roll defect is unresolved.

The two captured diagnostic runs predate copying the angle array per sample: their `errors` arrays retain the final angles for each actor, so they must not be read as time series. The scalar error and age remain per-sample. The final timeout angles quoted above remain valid. After reverting the experiment, all 35 physics/combat tests passed.

See ../roll-compensation/README.md for a subsequent bounded compensation improvement: two graphical four-impact runs have no roll failures, but a new directional variable-rate reproducer remains TODO. This does not close all recovery failures.
