# Worker stand-up candidates

Four offline transfers of the user-provided Stand_Up1 source, generated with tools/guardian/retarget_stand_up.mjs using each active worker-actions manifest GLB. Each maps 28 bones and samples 497 poses. Source/target hashes are embedded per JSON. These are review candidates, not installed gameplay recovery.

Review in tests/browser/workers.html > Levantarse (candidato), using the time field. Observed all four workers at 0 s (supine), 4 s (seated) and 8.26 s (standing). The screenshots in docs/guardian/phase2/worker-recovery show seated and standing poses. This does not prove continuous contact or absence of penetrations throughout the animation. Female skirts lift around thighs in the seated pose and need closer inspection. Candidate duration is the donor's approximately 8.27 seconds, not yet the desired gameplay recovery duration.

Outstanding: compare the original Fall endpoint to the candidate start, blend orientation/position without teleportation; ground contact on slopes; hide work tools during recovery; suspend navigation/actions while recovering (including second-hit incapacitation); return to existing retreat logic; handle repeat hits/save-load/reset; inspect continuous playback and actual animal encounters. Do not treat the current offline transfer as the completed user request.

## Fall-to-rise transition candidates

build_worker_recovery_transition.mjs generates *-transition.json: 0.4-second blend from each native Fall endpoint, then 2.8-second playback of the transferred stand-up. The incoming local position/quaternion boundary is asserted (normalized rotations, tolerance 1e-6). Horizontal pelvis alignment is preserved at the join. Tools are hidden. Offline sampled contact adjusts carrier height, with maximum corrections 0.0225/0.0670/0.0299/0.0376 m for youngMale/olderMale/olderFemale/youngFemale.

Initial implementation incorrectly aliased the target quaternion in slerpQuaternions, preserving the fallen rotation while raising the hip. Visual inspection rejected it; using target.slerp(fallen,1-mix) fixes the alias and reduces the previously excessive ground adjustment. Revised seated pose at 1.6 s is saved in transition-seated.png. The preview offers Transición de caída (candidato).

IMPORTANT: final horizontal logical-root reconciliation is still pending; these clips deliberately retain displacement instead of sliding the actor back. Do not install without reconciling the final position, blending into locomotion, and suspending worker logic during the whole sequence. Ground checks use sampled skin vertices, not exhaustive terrain collision. AI/state changes are not yet implemented.
