# Worker stand-up candidates

Four offline transfers of the user-provided Stand_Up1 source, generated with tools/guardian/retarget_stand_up.mjs using each active worker-actions manifest GLB. Each maps 28 bones and samples 497 poses. Source/target hashes are embedded per JSON. These are review candidates, not installed gameplay recovery.

Review in tests/browser/workers.html > Levantarse (candidato), using the time field. Observed all four workers at 0 s (supine), 4 s (seated) and 8.26 s (standing). The screenshots in docs/guardian/phase2/worker-recovery show seated and standing poses. This does not prove continuous contact or absence of penetrations throughout the animation. Female skirts lift around thighs in the seated pose and need closer inspection. Candidate duration is the donor's approximately 8.27 seconds, not yet the desired gameplay recovery duration.

Outstanding: compare the original Fall endpoint to the candidate start, blend orientation/position without teleportation; ground contact on slopes; hide work tools during recovery; suspend navigation/actions while recovering (including second-hit incapacitation); return to existing retreat logic; handle repeat hits/save-load/reset; inspect continuous playback and actual animal encounters. Do not treat the current offline transfer as the completed user request.

## Fall-to-rise transition candidates

build_worker_recovery_transition.mjs generates *-transition.json: 0.4-second blend from each native Fall endpoint, then 2.8-second playback of the transferred stand-up. The incoming local position/quaternion boundary is asserted (normalized rotations, tolerance 1e-6). Horizontal pelvis alignment is preserved at the join. Tools are hidden. Offline sampled contact adjusts carrier height, with maximum corrections 0.0225/0.0670/0.0299/0.0376 m for youngMale/olderMale/olderFemale/youngFemale.

Initial implementation incorrectly aliased the target quaternion in slerpQuaternions, preserving the fallen rotation while raising the hip. Visual inspection rejected it; using target.slerp(fallen,1-mix) fixes the alias and reduces the previously excessive ground adjustment. Revised seated pose at 1.6 s is saved in transition-seated.png. The preview offers Transición de caída (candidato).

IMPORTANT: final horizontal logical-root reconciliation is still pending; these clips deliberately retain displacement instead of sliding the actor back. Do not install without reconciling the final position, blending into locomotion, and suspending worker logic during the whole sequence. Ground checks use sampled skin vertices, not exhaustive terrain collision. AI/state changes are not yet implemented.

## Packed bank and exit boundary

The last 0.25 s now blend to native Idle at time zero, translated by finalOffset. Metadata records this displacement for future simulation reconciliation. Four tests in worker-recovery-boundaries.test.js load actual rigs and compare all bone world positions/quaternions against native Fall at the start and translated Idle at the end (2e-5 tolerance). All pass. This checks endpoints, not collisions or continuous visual quality.

pack_worker_recovery.mjs writes a 1,987,128-byte shared-float bank using the existing recovery decoder schema, plus content/manifests/worker-recovery.json with duration, target hash and finalOffset. No runtime fetch or simulation integration yet. Must use those offsets with collision-aware logical reconciliation; do not merely play the clip and snap back to the old position.

## Runtime lifecycle integration (graphical acceptance pending)

Worker recovery is now loaded by WorldScene and selected by workerPose after fallRemaining. advanceWorkerRecovery suspends movement through the rise, retains downHeading, plans the final offset using walkable plus swept workerMotionClear, and commits position once. Blocked offsets are reduced and the rendered carrier compensates progressively. Second-hit incapacitation no longer cancels an existing fall/recovery. Three state tests cover incapacitation, blocked displacement and serialization determinism; 37 existing expression/action/encounter/boundary tests pass.

Not yet visually accepted in a real raid; slopes, dynamic obstacles changing during the 3.2-second recovery, native planner interactions and the final transition to running require review. The current offset plan is sampled at recovery start, so a newly placed obstacle during recovery is not yet rechecked.

User-reported original Fall neck/chest distortion is an explicit remaining correction. Baseline Kofi at 3.3 s inspected; initial angle audit against bind pose: Neck 6/10/14/17/21 degrees and Head 31/17/17/34/24 degrees at 1.5/2/2.5/3/3.5 s. These values alone do not establish a cause. Inspect side chest/neck geometry and skin weights before applying arbitrary joint clamps. Any change to Fall endpoint must regenerate transition bank and rerun boundary tests.
