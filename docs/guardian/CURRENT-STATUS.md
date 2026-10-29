# Current delivery status (2026-10-29)

This is an index of current evidence, not acceptance of the entire phase. Earlier entries in PHASE2.md and CINEMATIC-RAGDOLL.md describe historical iterations; their pending lists must be read with the later evidence below.

| Area | Current evidence | Remaining acceptance |
| --- | --- | --- |
| Guardian dialogue, face and wind | Eyelid revision, broader mantle weights and amplified wood/feather-tip wind installed; face-authoring/guardian; wind-wide/mantle-review; 54 offline voice sequences | Full requested continuous tutorial video with audio; perceptual review of all voice sequences; broader wind/artistic acceptance |
| Tutorial guidance | tutorial-real: actual game intro, HUD/world pointing, alternative first-center placement and next lesson; guide-orbit: camera/zoom replan and Grow handoff | tutorial-portrait: 390x844 HUD pointing/rest checked; full real-game portrait/world paths, continuous transitions and English walkthrough remain |
| Spell bodies and VFX | Single-instance controls and targeted tests; PHASE2, retained-attacks, multiply-branches, shield-night | vfx-scalar-review: new day/night four-spell videos, camera/zoom/consecutive casts; full occlusion/camera matrix and subjective audio review remain |
| Beast impact and recovery | Five species installed; shared-ragdoll-world, species-cycles, wall-cycle, stand-up-source | repeated-getup: all five species interruption runs recorded; buffalo wide-view follow-up stays in frame, warthog contact partially obscured; vfx-scalar-review adds rhino wall recovery and four-hyena/rhino 3-physical/1-baked cycles; peer separation and retained offset fix tested on hyena; full terrain/obstacle/direction/concurrency matrix and changing obstacles remain |
| Worker faces | Current strict catalog audit: 9/9 animal+worker profiles have blinkL/blinkR/mouthOpen | Remaining local facial seams in worker models; broader in-game visual acceptance |
| Older male installed repair | Cheek repair registered after moving portrait and daylight WorldScene review; recovery rebound and all four boundary tests pass; ten facial bindings | Broader facial/lighting acceptance; local normal detail is attenuated in the repaired cheek/nose mask |
| Editable sources | All ten actor Blend files reopened with readable packed images | Persistence check does not certify artistic quality |
| Performance | gpu-current: five interleaved frozen-frame component comparisons | moving-current: sequential moving-raid measurements and scalar packing comparison; incremental cost and frametime tails still unaccepted; unrelated baseline performance assigned to another agent |

The current olderMale candidate hashes are in face-authoring/olderMale/candidate-files.json. Earlier v7 reports bind the previous revision; cheek-frame contains the current geometry/clip audits and world-cycle recording. The latest olderMale candidate is now runtime registered. The full objective remains active and no merge to main is authorized.

Latest focused revisions: vfx-scalar-review now includes buffalo normal-only registration, baked wall-contact temporal refinement, recovery CPU attribution, corrected full-body/vortex summon framing after camera changes, and twelve-second close wind recordings. These supersede the corresponding older diagnostic observations without closing the remaining acceptance matrix. PR217 remains open; no merge performed.

Integration check at b59c79b94: all 171 tests across the 30 selected Guardian/beast/baked/authored-recovery/worker-recovery test files pass (zero skipped). Production build passes in 9.47 s; existing chunk-size and mixed import warnings remain. Exact file selection and command are recorded in phase2/vfx-scalar-review/integration-checks-current.json. This is not a full repository-suite pass, a browser performance result, or closure of the outstanding visual matrix.

Latest integration at 8c8898489: refreshed origin/main and verified zero commits behind. All 172 selected Guardian/beast/baked/authored-recovery/worker-recovery tests pass, zero skipped; production build passes in 10.18 s with existing warnings. Exact revision and file list: phase2/vfx-scalar-review/integration-checks-latest.json. Registered buffalo dorsal mask and reduced vortex ribbon passes are included. Recent ABBA runs still show worse frame tails with summons; no performance acceptance. Mixed hyena/rhino fall and recovery diagnostics show no sampled collider penetration, while falling mesh AABB overlaps remain geometrically inconclusive. Continuous voiced tutorial capture remains unresolved.

Integration at 99533cb4a: origin/main remains fully incorporated (zero behind). All 174 tests in the 30 selected Guardian/beast/baked/authored-recovery/worker-recovery files pass without skips; production build passes in 8.40 s with existing warnings. Receipt: phase2/vfx-scalar-review/integration-checks-99533.json. This includes the rhinoceros contact-hold fix, expanded placement regression and subsequent directional runtime recordings. Real moving-campaign runs preserve identical outcomes with presentation enabled/disabled, but both remain slow and do not establish performance acceptance. The full objective remains active.

## Integration checkpoint at 3451a5fe8

199 tests pass in 33 selected Guardian/beast/baked/authored-recovery/worker-recovery/spell-card test files, with no failures or skips. Production build succeeds in 8.54 seconds with existing warnings. Exact file list and scope: phase2/integration-checks-3451.json. Main-game Attack now has a continuous silent canvas recording through normal HUD controls, including fall and recovery; see phase2/attack-main-gameplay-recording.md. Full objective remains active: voiced tutorial recording, broader visual/audio matrix and added-cost performance acceptance are still incomplete.


## Terrain recovery and audio checkpoint at 1990136cf

World Guardian presence/launch audio now uses two replaceable voice slots; day/night recordings admit all requested cues without increasing mixer budgets. A captured repeated-hit hyena roll failure was reproduced deterministically and corrected with Rapier internal terrain-edge handling. Heavy bodies receive only a bounded progress-dependent recovery grace. Tests cover all five shipped rigs and retain a failing negative control for the old unstable terrain. See phase2/roll-timeout and day-spells-audio-review.md.

Actual corrected night run reports no roll failures; buffalo daytime automatic/lateral recordings also complete authored recovery and release physics. The latter inspected support samples and contact sheets are in phase2/roll-timeout/buffalo. These are scoped graphical checks, not acceptance of every terrain/contact combination or a performance benchmark. Full phase and continuous voiced tutorial recording remain incomplete.


## Guardian presentation buffer optimization (362e7019f)

Component isolation attributes the controlled static-scene regression to discharge rendering, not the body, aura or vortex. Marking the continuously rewritten beam matrices DynamicDrawUsage improves Guardian p95 from approximately 66.5 ms to 49.9 ms. Static reversal reproduces 66.5 ms; restored dynamic reproduces 49.9 ms. Evidence: phase2/performance-components. No visual content or baseline renderer changed. Moving-incursion comparison remains required; this supersedes the old static-fixture performance result only within its measured scope.

## Sustained native raid comparison (a71189724)

The moving comparison requested after the buffer optimization is now recorded in phase2/performance-components/fresh-raid-comparison.json. Both runs use the real night planner, 16 initial beasts, normal costs/cooldowns and five attacks over 60 simulation seconds. Commands and recorded final gameplay outcomes match exactly; no errors, roll failures or lingering physical simulations; at most one Guardian. Reference/Guardian mean FPS are 8.923/8.935 and p99 frame times 183.060/182.880 ms. Both contain a severe initial frame spike (10.509/10.759 seconds). This sequential pair shows no observable added regression in these measurements, but does not establish globally fluid gameplay or attribute the shared spike. Baseline performance remains assigned to the other agent. The static reversal evidence and all broader acceptance limits remain applicable.

## Active summon disposal

Disposing during an active summon now clears guide/effect state and diagnostic counters before releasing GPU resources. Repeated disposal returns without releasing the same resources twice. A regression test fails on the old active counter and verifies zero scene children, zero active/retained counts and exactly one disposal event per owned geometry/echo material. All 19 singleton, retained-projectile and tutorial-lifecycle tests pass; production build passes in 10.04 seconds with the existing mixed-import/chunk-size warnings. This is lifecycle validation, not new graphical acceptance.

Recovery peer update: ordered physical recovery contacts are enabled (24452b259). Four-hyena and daylight hyena/three-rhino runs finish all recoveries with no sampled strict surface crossings; recordings and frame/phase telemetry are in phase2/skin-crossings. This is bounded evidence, not all-species/obstacle acceptance. Manager-only telemetry does not yet cover release-to-navigation continuity.
