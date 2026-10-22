# Far-transition alpha trial — QA only

Two routes changed in memory: impostor coverage discard becomes smooth alpha; standby 3D materials clone the existing shaded material, use front faces only, alpha from nativeVisibility and no depth writes. Existing resident smooth-obstruction path unchanged. No production adoption.

Real full-background Sabana captures, seed 712, medium, three poses day/night. Third pose matches calls/triangles; other poses have differing geometry between reloads, including visible changes of near-tree representation. Thus this is not an equal-work performance benchmark nor conclusive all-pose visual validation. Keep the candidate rather than rejecting it on cost; move the comparison to one loaded world and verify material preparation/readiness and transitions under camera movement. No GPU timing claimed.

Alpha blending retains known ordering/overdraw concerns with instanced batches. Front-face culling prevents the back surface of a closed model contributing, but does not guarantee one visible polygon layer for complex foliage. Do not claim it removes all transparency artifacts.

## Correction after harness audit

The old before arm inherited an unrelated natural-water shader override from the depth trial, including on Sabana. Therefore this earlier comparison does NOT isolate tree transparency. Retain only as historical diagnostic, not acceptance evidence. The replacement single-world harness removes all unrelated water/worldbank routes and toggles only the two far-tree material paths.
