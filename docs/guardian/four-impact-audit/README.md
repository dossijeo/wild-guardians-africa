# Four simultaneous impact audit — unresolved roll timeout

Executed graphically at 3e78351c6 with four catalog hyenas in the WorldScene fixture and real Game.tick. The recorder issues four Attack commands in rapid succession with QA cooldown resets. It does not represent normal spell balance, a large raid, or the full native-navigation campaign.

Observed: peak three physical ragdolls plus one baked fallback; one Guardian maximum; no reported exceptions; all four release their down state and the solver has zero bodies at completion. 353 measured frames, none hidden. The video and runtime trace are retained here.

**Not a quality/performance pass:** one physical roll times out at 3.5167 s, with angular error 0.5813 rad and speed 0.2595. The controller therefore uses its procedural recovery fallback instead of the authored get-up. The first trace does not identify that physical actor's recovery class; the fixture now records per-actor physical/baked recovery class and roll progress for a targeted repeat. No tolerance was relaxed to conceal the failure.

Physics mean 3.189 ms / p95 8.235 ms / maximum 32.370 ms; creation maximum 22.825 ms. Frame median is not recorded in this report: mean 47.061 ms, p95 66.455 ms, maximum 83.230 ms. Video capture and an unpaired single run prevent attributing total frame cost to this feature. Scope of follow-up: identify the failed actor and its ground/obstacle contacts, then correct the physical roll or recovery transition and repeat. General pre-existing engine performance remains outside this task.

This recording has no audio track: the fixture had reloaded after the audio-priority edit and sound was not re-enabled. The prior night-audio recording remains the audio evidence.


## Targeted repeat and rejected torque experiment

`repeat-before.json` reproduces two physical roll timeouts. At simulation 6.470 s, qa-beast-1 uses procedural BeastRecovery after error 0.5381 rad; qa-beast-0 remains rolling at error 0.4630, qa-beast-2 uses AuthoredBeastRecovery, and qa-beast-3 uses the baked authored path. Thus fallback is not merely an aggregate counter ambiguity.

Experiment: increased the bounded gravity-support torque multiplier from 1.8 to 2.4, leaving speed, maximum acceleration, orientation tolerance and timeout unchanged. All 35 automated physics tests passed, but the graphical four-impact repeat still produced two roll failures (last error 0.45484 rad, speed 0.57522). See `torque-2.4.json`. **Rejected and reverted**: stronger assistance alone does not establish a fix. The branch retains 1.8. The target orientation/ground and joint contacts require further diagnosis; no root cause is asserted yet.
