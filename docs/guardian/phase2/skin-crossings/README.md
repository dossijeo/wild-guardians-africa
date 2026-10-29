# Skin surface crossing diagnostic

Added opt-in `peerTriangles=1` alongside `peerContacts=1&peerFalls=1` in guardian-combat.html. The QA-only helper deforms actual mesh vertices, restricts triangle BVHs to the overlapping bounds and finds strict transverse edge/triangle crossings. Up to eight crossing points per pair are retained. Tangencies, coplanar overlap and complete containment are excluded: zero findings do not prove separation. Five tests cover overlap, disjoint/contact-only boxes, containment limitations, morph deformation and bounded/unbounded evidence equivalence.

The initial complete-BVH probe was expensive and browser report extraction timed out. The cycle itself confirmed a saved video. Restricting triangles to the overlap region and exporting the full report through a download link avoids repeatedly displaying the entire trace. Earlier incomplete extractions are not acceptance evidence. No production renderer/physics changes were made.

## Confirmed finding on installed models (233df382e)

Run the four-impact recorder with hyena selected. `exported-run.json` and `exported-run.webm` are the final exported run: completedSimulation=true, finalDownCount=0, errors=[], maximum one Guardian. Of 35 overlapping mesh-pair samples examined, eight contain strict surface crossings. All eight concern qa-beast-0 / qa-beast-2, both physical actors in the recovering phase, at simulation offsets 4.194–5.226 s (trace wall offsets 7.883–10.446 s). The saved 8–12 s video contact sheet was inspected; overlapping silhouettes are visible, while the geometric witness points establish actual surface crossing. This is a defect, not a passed collision check.

Code inspection identifies the next investigation: physical authored recovery switches bodies to kinematic and creates BakedSolidContacts with its default peers=false. Baked actors already opt into peer avoidance. Merely enabling peers for physical actors would currently include self in the peer list and could also introduce abrupt root shifts, so that is not applied blindly. Next establish deterministic peer ownership and validate separation plus movement continuity with this regression. Which specific skin parts cross still needs witness classification. Do not infer clearance, performance or collision quality from final lifecycle completion.


## Priority separation trial (not enabled for physical recovery)

Tested deterministic admission-order peer selection: physical actors yield only to earlier physical entries; baked actors yield to all physical entries and earlier baked entries. Self is excluded, including after removal/re-admission. Three peer tests and five baked solid/contact tests pass. The ordering helper is retained for the existing baked contact path.

For priority-run.json/webm only, enabled peers:true at physical AuthoredBeastRecovery construction. Four-hyena real WorldScene run completes 16.08004 simulated seconds with finalDownCount=0 and errors empty. No sampled strict triangle crossings were reported. This is not a controlled identical-trajectory comparison: frame timing changes physical/baked admission and collision trajectories. The diagnostic also excludes coplanar intersections and containment.

Reviewed priority-window.jpg (video 6s onward at 3fps). Separation is visible, but telemetry includes a 0.400m hip displacement between recovery samples and accumulated baked correction beyond 2m earlier in the sequence. These samples are too sparse to establish continuous motion or attribute that displacement exclusively to the new physical contact path. Do not accept this trial as a smooth recovery fix. Physical peers:true was reverted pending a finer-grained continuity test and a less conservative contact response. To reproduce the trial, add {peers:true} to BakedSolidContacts.forAnimal(this.world,a,e.binding) in beast-combat-physics.js, then record four impacts with peerContacts=1&peerFalls=1&peerTriangles=1.


## Render-frame follow-up and enabled physical peer priority

Added lightweight hip/correction samples after each rendered frame while the peer diagnostic runs, plus audit_recovery_steps.py. Corrected telemetry to read active recovery.horizontalCorrection before stale fall.solidContacts.shift. Earlier physical correction=null means unavailable, not zero; the analyzer preserves that distinction. Four peer/telemetry tests pass.

frame-baseline: 374 rendered frames, 414 consecutive recovery pairs, largest hip step .099447m over .049865s; ten strict triangle-crossing samples. frame-priority: 365 frames, 398 recovery pairs, largest step .103420m over .05s; zero strict crossing samples. Largest observed correction delta .072786m over .03318s. Both finish all four recoveries with no reported errors. Neither run is deterministic or a performance comparison; the per-frame trace excludes phase boundaries from its ranked recovery steps.

Reviewed frame-priority-window.jpg (6s onward at 3fps): four animals rise and resume movement, without an obvious large separation jump in these sampled frames. This finer evidence does not reproduce the earlier concern as an unusually large per-frame recovery displacement. Enabled ordered peers for physical authored recovery in the working branch, superseding the reverted trial above. Other species, recovery-entry boundaries, crowd/obstacle traps and temporal-refinement continuity remain to validate. Zero sampled transverse crossings does not establish all-mesh separation at every frame. The broad-phase envelope remains conservative and can produce unnecessary displacement.


## Mixed-size daylight cycle

mixed-rhino.json/webm: base hyena plus three rhinos, recoveryOverview=1, recoveryDay=1, all peer diagnostics enabled; three physical and one baked actor peak. All four recover, completedSimulation=true, finalDownCount=0, errors empty, no sampled strict crossings. Reviewed mixed-rhino-window.jpg at 2fps from video 5s: falls, supine poses, rises and return to motion are visible. This wider view cannot establish subtle foot/skin quality.

Extended step audit with phase-boundary records. Observed rolling-to-recovery hip steps: .00084 to .04223m at roughly 50ms. Largest within-recovery step .22279m / .049745s on baked rhino, with correctionDelta=0; a physical rhino reaches .21635m / .05s, also correctionDelta=0. These peaks belong to the sampled pose motion, not a changing horizontal separation offset. This does not prove the get-up timing is artistically optimal or every frame is continuous. Release-to-navigation is outside the manager-only trace.

Validation after enabling ordered physical recovery: node --test tests/beast-combat-physics.test.js tests/authored-recovery-solids.test.js passes 24/24, including repeated-hit pose retention, shared physical ownership, baked overflow, navigation offset commit and hyena/lion wall/corner recovery. Mixed-size obstacle entrapment and broader graphical matrix remain pending.


## Navigation release diagnostic

Extended sampleRecoveryPositions to follow rendered Hips through world.mixers after the physics entry disappears, also recording logical x/z. This is QA-only; five peer/telemetry tests pass. navigation-release.json/webm repeats the mixed daylight cycle and ends with all four actors navigating, no errors. Reviewed navigation-release-window.jpg (video 7s onward, 2fps): all four return to upright locomotion.

The newly visible recovering-to-walking boundaries have hip displacement .193918m/.03326s (rhino), .331914m/.05s (hyena), .119709m/.05s (baked rhino), .162642m/.05s (physical rhino). These are not automatically teleports: logical movement, pending horizontal correction commit, native animation phase, root heading and ground fitting all contribute. For the hyena, hip delta [-.2982,.0356,-.1412] vs logical delta [-.0682,-.1761] shows substantial pose/root-orientation change in addition to translation. A physical rhino releases with prior lift .38514m and hip delta y=-.1664m.

Current authored recovery exits to its captured standing pose, while native animation and path heading resume immediately. This is the next concrete continuity concern; the broad overview contact sheet is insufficient to approve the exact release frames. A pose transition must preserve the world-space recovered pose while blending to current navigation and terrain support, including baked actors and interrupted transitions. No production transition change was made in this diagnostic revision.


## World-space release blend

Added BeastRecoveryExit, a .3s visual transition shared by physical and baked authored/procedural recoveries. Capture the final recovered pose before restoring animation and committing navigation offset. Blend local bone poses while converting hip position/orientation through world space, so immediate root turning does not snap the visible hip. Restore the last native pose before every normal animation sample; delete the transition at completion or after a new fall captures its visible pose. No physics remains active merely for this blend; navigation stays authoritative.

23 tests pass (beast-recovery-exit and beast-combat-physics), including world-space entry under translated/turned roots, native pose restoration, five species, both fall modes, repeated recovery hits and navigation-offset commit. The new test does not yet cover an impact specifically during the .3s release blend.

navigation-blend.json/webm repeats the daylight hyena/three-rhino fixture. All finish with finalDownCount=0 and no errors. Release hip steps now .004469, .002062, .001993 and .002645m (roughly 50ms frames), compared with .1197�.3319m in the prior run. Runs are not identical deterministic trajectories. Reviewed navigation-blend-window.jpg at 2fps from 7s: return to upright locomotion is present without an obvious release snap in these samples. Close-view support/terrain acceptance, impact during release, and collision clearance throughout the blend remain open; interpolated skin poses alone do not guarantee those properties.
