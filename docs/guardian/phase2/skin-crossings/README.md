# Skin surface crossing diagnostic

Added opt-in `peerTriangles=1` alongside `peerContacts=1&peerFalls=1` in guardian-combat.html. The QA-only helper deforms actual mesh vertices, restricts triangle BVHs to the overlapping bounds and finds strict transverse edge/triangle crossings. Up to eight crossing points per pair are retained. Tangencies, coplanar overlap and complete containment are excluded: zero findings do not prove separation. Five tests cover overlap, disjoint/contact-only boxes, containment limitations, morph deformation and bounded/unbounded evidence equivalence.

The initial complete-BVH probe was expensive and browser report extraction timed out. The cycle itself confirmed a saved video. Restricting triangles to the overlap region and exporting the full report through a download link avoids repeatedly displaying the entire trace. Earlier incomplete extractions are not acceptance evidence. No production renderer/physics changes were made.

## Confirmed finding on installed models (233df382e)

Run the four-impact recorder with hyena selected. `exported-run.json` and `exported-run.webm` are the final exported run: completedSimulation=true, finalDownCount=0, errors=[], maximum one Guardian. Of 35 overlapping mesh-pair samples examined, eight contain strict surface crossings. All eight concern qa-beast-0 / qa-beast-2, both physical actors in the recovering phase, at simulation offsets 4.194â€“5.226 s (trace wall offsets 7.883â€“10.446 s). The saved 8â€“12 s video contact sheet was inspected; overlapping silhouettes are visible, while the geometric witness points establish actual surface crossing. This is a defect, not a passed collision check.

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

navigation-blend.json/webm repeats the daylight hyena/three-rhino fixture. All finish with finalDownCount=0 and no errors. Release hip steps now .004469, .002062, .001993 and .002645m (roughly 50ms frames), compared with .1197–.3319m in the prior run. Runs are not identical deterministic trajectories. Reviewed navigation-blend-window.jpg at 2fps from 7s: return to upright locomotion is present without an obvious release snap in these samples. Close-view support/terrain acceptance, impact during release, and collision clearance throughout the blend remain open; interpolated skin poses alone do not guarantee those properties.


## Release interruption validation

Added six focused tests using synthetic articulated beast skin: new physical and baked impacts at release ages 0, .1 and .29s preserve all captured world-space bone positions/orientations within 1e-5, clear the visual release transition and enter falling. All six pass; the other 22 tests in the file were skipped by the focused name filter, not rerun. This verifies capture/cancellation, not full-cycle anatomical acceptance for every runtime mesh.

Added QA releaseHit=1 to schedule the second real Attack near the recovery end and record the actual BeastCombatPhysics.start exitAge. release-hit-early.json/webm completes both impacts, but second contact exitAge=null: it arrived before the intended release interval, so it does not validate release interruption. Scheduling now aims 150ms into the .3s transition, allowing for the 240ms projectile timing. The QA wrapper is restored in finally and never changes the production impact time.

Final release-hit.json/webm confirms the second real projectile starts the physical fall at exitAge=.166235s, inside the .3s blend. The second fall and recovery finish, no errors, videoSaved=true. Inspected release-hit-window.jpg at 3fps from 6s: projectile contact, renewed loss of balance and ground fall are visible; the wide strategic view cannot certify every joint at contact. The recorded telemetry establishes that the intended transition was interrupted, unlike the early run. Runtime graphical coverage here is hyena/physical only; baked interruption is covered by the synthetic tests, not this video.


## Release support audit (unresolved)

Added QA all-skinned-vertex terrain audit during navigation release, excluding only explicit tail contact exemptions. release-ground-before records 24 frames with minimum clearance -.135627m; a rhino penetrates during the blend. Tried reusing sparse recovery contact samples to lift interpolated poses to the lesser endpoint clearance, preserving endpoint continuity. A synthetic supported-endpoint test passed, but release-ground-after still reports -.153275m across 25 frames. Different trajectories prevent a paired regression claim. The sampled/endpoint-aware correction is insufficient, so it and its synthetic test were reverted. No production support change retained. Both recordings end without runtime errors; neither establishes acceptable terrain support. Need identify limiting vertex/bone and native endpoint clearance before choosing an effective correction.


## Foot attribution and post-blend support

audit_release_support.mjs resolves the logged limiting vertex against the installed actor GLB. Both prior rhino worst cases (Mesh_0 index32188) carry RightFoot weight1.0; other rhino minima likewise resolve to RightFoot, not decorative tail. The helper assumes this fixture's qa-beast-N IDs correspond to actorSpecies order; do not use it on arbitrary encounter IDs.

Extended QA support sampling for .5s after the transition is deleted. native-support.json/webm: 24 blend frames plus 40 normal-navigation frames, four completed recoveries, no errors. Rhino qa-beast-2 minimum is -.09752m during blend and -.11207m afterward; qa-beast-1 -.08738m during blend and -.02395m afterward. Hyena native support remains .022m; baked rhino native support also .022m. The defect persists in normal locomotion on the affected terrain, so a transition-only endpoint-preserving correction cannot remove it. Source inspection confirms groundAnimal uses parent-relative horizontal support while scene positions the actor root at the terrain height of its center; no foot-location terrain query is currently applied there. Need terrain-aware normal foot support, then revalidate transition endpoints, slope recovery, integrated-GPU cost and native action compatibility. No production grounding change yet.

Tutorial video remains undelivered: latest native Computer Use attempt stopped because the tool could not determine Chrome's URL reliably enough to enforce policy. Do not bypass that restriction or represent combat captures as tutorial evidence.


## Terrain-aware normal foot support

Added supportAnimalOnTerrain after native animation/recovery-exit rendering when magicDown is absent. Reuses 42–86 sampled foot/toe skin vertices; translates the visual model vertically only when the local terrain requires extra clearance. Existing animation grounding resets model height each frame, preventing accumulated lift. Tails and non-foot decorations do not determine this correction. Navigation and ragdoll ownership are unchanged. Contact indices are built in prepareAnimalModel to avoid the measured 54–150ms cold setup in the first visible frame; geometry-level recovery caches are reused.

Five installed-GLB slope tests pass, checking the sampled contacts plus every foot-weighted vertex (5mm penetration tolerance), repeat-call stability and reset/reapplication. One bind pose and plane per species is not all-animation acceptance.

terrain-support.json/webm mixed daylight cycle finishes all four recoveries without errors. All-skinned-vertex audit excluding tails has minimum .005733m during blend and .005758m after blend, versus negative clearances in prior runs; no sampled penetration in 64 audited frames. Runs have differing trajectories. Reviewed terrain-support-window.jpg at 2fps from 7s; rises and native locomotion remain present. This whole-model lift does not implement per-leg IK or guarantee every foot plants simultaneously on steep terrain.

terrain-support-cost.json reproducible via audit_terrain_support_cost.mjs: Node warm median .0254–.0633ms/actor, p95 .0701–.1423ms on an analytic plane, with isolated maxima up to3.798ms. This excludes actual terrain-query cost, rendered animation and GPU; integrated-game raid performance remains to measure. Cold setup motivated the preparation hook.
