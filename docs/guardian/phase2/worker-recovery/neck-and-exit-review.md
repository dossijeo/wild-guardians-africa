# Worker fall and recovery follow-up

The late Fall recoil is settled in the Head, Neck, Spine and Spine1 quaternion tracks from 2 seconds to the original final pose. Impact keys and the final pose remain unchanged, so the authored recovery boundary is preserved. This is an animation correction, not a mesh or clothing-weight repair.

The full-cycle browser preview now uses advanceWorkerRecovery and the packed production Worker_GetUp clips. It revealed an abrupt transition from the final upright pose to Run. A 0.24-second simulation-timed blend from Idle(0), the recovery endpoint, now softens that transition while navigation resumes immediately. The extra paused mixer action is reused and stopped after the blend. A new fall cancels the exit blend.

Validation: 28 tests passed across worker-actions, worker-recovery-state, worker-fall-settle and worker-recovery-boundaries. Real rigs additionally verify blend weights, cleanup and later Idle reuse. Browser inspection at cycle 6.78 seconds shows the transition initially retaining the upright pose rather than immediately snapping to the running stride.

Close views of all four current gameplay models at Fall 3 seconds are saved as *-neck-final-review.png. The cervical chain remains connected; clothing shoulders still have angular folds. These captures do not establish that every visible clothing deformation has been eliminated. The youngFemale face in this runtime preview is still the installed original, not the separately repaired facial candidate.

Limitations: this fixture uses a flat unobstructed navigation stub. Continuous in-game raid validation, uneven terrain and dynamic obstacles remain outstanding. Do not interpret these isolated views as full visual acceptance of the worker lifecycle.

## WorldScene encounter check

The combat fixture now exposes a worker profile selector, a real encounter trigger and a close camera. Each trial allocates a new worker entity ID so the renderer cannot reuse another profile's cached mesh. The trigger invokes updateWorkerEncounters with an overlapping live animal; subsequent time advances use Game.tick, Navigation and WorldScene, not the isolated skeletal preview.

Kofi was checked at 3.0 seconds after impact, 4.8 seconds during recovery and 7.2 seconds after impact. The live hyena continued its crop attack. The worker completed recovery and resumed fleeing; the final exposed state has fallRemaining=0, no recovery, exit=0, and no reported runtime errors. Captures: worldscene-kofi-fall.png, worldscene-kofi-rise.png, worldscene-kofi-flight.png; final diagnostic JSON alongside them. Audio was not unlocked, so this run does not validate playback. This is stepped visual inspection, not continuous video or all-profile acceptance.

The integration review also fixed immediate downHeading capture on the first hit and publishes position changes to worker planning observers both on that hit and on recovery completion. Downed arrivals are excluded from new task reservation while recovering. Thirteen encounter tests pass, including a Game.tick recovery lifecycle and planning notification assertion. Dynamic obstacle changes during the recovery and the remaining three runtime profiles still need graphical coverage.

## Remaining runtime profiles and support diagnostics

YoungFemale, olderMale and olderFemale were subsequently checked in the same WorldScene fixture at 4.8 seconds after impact and at 7.2 seconds. Each completed recovery and returned to fleeing with fallRemaining=0 and exit=0. Their rise/flight captures are stored alongside the Kofi captures. These are the installed gameplay assets; Amara's separate facial repair candidate remains pending installation.

The fixture now has an explicit, on-demand terrain contact diagnostic. It skins every visible skinned-mesh vertex, transforms it to world space and compares it with Navigation.field.surface at that vertex. It does not add a per-frame scan to the game. At the sampled seated recovery pose, minimum gaps were 0.0221 m (youngMale), 0.0250 m (youngFemale), 0.0222 m (olderMale), and 0.0263 m (olderFemale). For the female models the limiting vertices are weighted to LeftLeg in the skirt; foot minima were 0.0780 and 0.0710 m. These are single-pose samples at different valid trial positions, not proof of consistent support over the whole animation. Raw measurements: worldscene-support-samples.json.

All-profile state completion is now observed. Continuous visual acceptance, more pronounced slopes, changing obstacles, clothing folds and authored support trajectories remain open. No performance conclusion follows from this diagnostic.
