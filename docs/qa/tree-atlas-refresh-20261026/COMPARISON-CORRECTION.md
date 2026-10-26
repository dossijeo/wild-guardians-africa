# Retraction of the previous 3D comparison

The user correctly challenged the three-column comparison. Source inspection
confirmed a sign/weight error in qa-force-far-trees-3d.mjs.

The vertex shader computes vMix = 1 - ready * distanceWeight * angularFactor.
The helper replaced angularFactor with zero. This makes vMix equal to one,
leaving the impostor fully active instead of suppressing it. CPU standby
selection could simultaneously request 3D. The resulting column is not a valid
3D-only reference. Previous claims identifying it as all-3D are withdrawn.

The impostor-3d-matched performance comparison also used this helper and must
not support a decision about pure 3D versus impostor cost until rerun with
verified rendered representations. Existing raw evidence is retained.

A second QA issue: multiple Playwright routes for attach-native-far-world.js
can eclipse each other because route.fetch does not chain transformations.
The persistent hide guard must share the same transformation as density matching.

Replacement acceptance: camera at ground height, identical seed/camera/time,
individual native-resolution PNGs, no DOF, actual canvas dimensions recorded,
and draw instrumentation proving zero impostor draws in the 3D reference.
Do not accept missing trees as a successful suppression: standby readiness and
instance coverage must also be checked. Raster/imagegen preserve the normal
near-3D/far-card policy. Imagegen remains a one-species Manglares pilot.
