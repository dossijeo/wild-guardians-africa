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
