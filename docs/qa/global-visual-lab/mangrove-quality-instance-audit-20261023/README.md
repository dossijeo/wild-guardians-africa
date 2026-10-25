# Instance content across quality restoration

Integrated fixed512, medium/day, same paused fixture. Added FNV-1a fingerprints of active instance attribute prefixes for fern near/far buffers and merged color/shadow groups. Hash equality is supporting evidence, not mathematical byte-equality proof; counts also recorded. Main scene mesh snapshots remain available.

First medium capture: 1,181 near + 700 far ferns. Restored medium: 1,202 near + 679 far, still 1,881 total. Thus this example does not lose coverage population; 21 instances change detailed/impostor LOD assignment. Source inspection: configureQuality clears tile objects, while screen LOD history is a WeakMap keyed by those per-tile instance arrays. Rebuilding loses prior hysteresis state. This is consistent with allocation changes after a prior camera move, not proof of lost density or a necessary artistic correction. Do not change the approved LOD thresholds merely for pixel identity.

Merged shadow groups show matching counts and active matrix/visibility fingerprints. Merged color group 2:1 changes count 2→0; previous mesh audit records two obstruction-blend meshes becoming visible. Remaining next target is the source visibility transition of those instances, not water shading or wholesale ground material failure. The color-group change is not yet fully causally attributed.

Probe uses the real quality calls, no density/mask/renderer modifications. No browser errors. Standard reproduction: WG_FIXED_QUALITY_PROBE=1, fixednative/day/media, normal static camera, cadence10/warmup30 and a new WG_REVIEW_OUT using the existing harness. No performance claim; CPU hashing and mesh introspection are diagnostic overhead.
