# Recovery collider refit trial — not enabled in gameplay

Reusing support vertices selected in the standing pose can underfit a changed
recovery pose. On the recorded native rhino pose, a full refit gains up to
0.13623 m of directional support on RightUpLeg, 0.03822 m on LeftArm, and
0.03161 m on Spine. This is a controlled cache comparison, not a reconstruction
of the exact live colliders that produced the negative contact capture.

`audit-ragdoll-collider-cache.mjs` reproduces the comparison. The binding accepts
an explicit `colliders({refit:true})` diagnostic option, which scans all eligible
samples without overwriting the shared standing-pose cache. A real-model
regression proves equality with a fresh geometry refit and cache preservation.
The 20 selected ragdoll, replay and refit tests pass.

Temporarily enabling refit for attacks during recovery was tested in the native
WorldScene fixture. Both knockdowns finished, no browser errors occurred, and
the minimum sampled full-skin clearance was +0.007618 m. However the physics
step peaked at 167.405 ms, with startMs 165.575 ms. Node refit measurements were
134.8–194.1 ms over twelve calls. This is not acceptable for interactive combat.

The gameplay activation was removed after the experiment. Only the opt-in
diagnostic, comparison and regression remain. No ordinary hit now takes this
full-refit path. Receipts: `rhino-collider-cache.json` and
`rhino-refit-candidate.json` (the latter records the temporary candidate).

Next implementation work: reduce pose-dependent support selection cost before
enabling refit, retaining the fresh-refit output as the correctness oracle.
This one successful contact run neither proves a fix for the earlier entry
penetration nor establishes the full visual acceptance matrix.
