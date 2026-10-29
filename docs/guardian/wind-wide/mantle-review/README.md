# Lower mantle edge inspection

Rendered the current editable source with Idle, Float and Mantle_Breeze enabled at frame 13. The camera targets the evaluated midpoint of vertices 98 and 10610, the maximum sampled Idle edge in ../current-edge-details.json. Source SHA-256: 19c20eca661bbab8c605557a151e9cf4d70d9c6c5e06d5c400379ddf303225df.

Inspected front.png, side.png and back.png individually. This region is the lower hem, not the torso attachment. No visible opening or torn surface appears in these three views at this pose. The thick, rounded hem remains visually prominent; this inspection does not establish that it reads as light cloth in motion. The measured 27.14-to-41.89 mm edge extension is real, but these images do not justify a blind weight smoothing change. No production model, weights or animation changed.

Reproduce from the repository root with Blender in background mode and tools/guardian/render_guardian_mantle_review.py. It opens the source independently for each camera and renders without saving it. These are offline close-ups, not browser validation, an intersection audit or continuous-motion acceptance. Review the moving silhouette and cloth phase offsets in the installed model before deciding whether to modify hem geometry or animation.

## Rejected terminal-pivot trial

study_mantle_pivots.py creates an isolated Blend at C:/tmp/guardian-mantle-pivots.blend. It translates each of the four terminal cloth rest bones 40% toward its parent's head (48 mm upward), preserving bone axes, animation channels and mesh weights. Source hash and exact positions are in pivot-trial.json. It does not overwrite the source.

check_deformation.py sampled Idle, Spell_Grow and Spell_Attack on this copy (pivot-deformation.json). Compared with the same source/frame sampling in ../current-edge-details.json, Idle maximum displacement rises from .075995 to .090498 model units, while maximum edge ratio worsens from 1.543695 to 1.768405. Idle p99 worsens slightly, 1.060616 to 1.062905. Attack maximum stays 2.786791 (the separate wrist edge), with p99 rising from 1.202822 to 1.208685. No original Grow receipt was generated, so no Grow before/after conclusion is made.

render_mantle_pivot_trial.py generated three views at frame 13 with the same camera-relative recipe. Front and side were inspected; their visible difference does not justify the added distortion. Back was rendered but not inspected in this trial. Reject the pivot-only edit; production remains unchanged. A wider moving-cloth result needs a coordinated skin-weight/pivot solution, not promotion of this marginal displacement increase. This is an offline experiment, not a browser acceptance pass.

## Isolated cloth-weight candidate

study_mantle_weights.py starts again from the original source, retaining the original pivots. For vertices influenced exclusively by Torso and Mantle groups, it transfers residual torso influence proportionally to the existing cloth groups. A smooth height envelope ramps from z=-.04 to -.16; another smooth envelope ramps with original total mantle influence from .02 to .60. The latter is essential: an initial hard .1 eligibility threshold produced a severe discontinuity and was replaced before rendering. No topology, UV, texture, action or ornament group is edited. The final per-vertex changes are in weight-trial.json; candidate is C:/tmp/guardian-mantle-weights.blend.

Final weight-deformation.json gives Idle maximum displacement .100752 versus original .075995; maximum edge ratio 1.868151 versus 1.543695, p99 1.071827 versus 1.060616. Attack's separate wrist maximum stays 2.786791, p99 rises to 1.223746. These are the same sparse frame/edge samples, not an intersection proof.

Inspected weight-front.png and weight-side.png at frame 13. The hem silhouette changes more visibly and the frontal lower edge develops a sharper fold. Back was rendered but not inspected. Keep this candidate isolated pending moving-pose comparison and local fold assessment; it is neither accepted nor installed. render_mantle_weight_trial.py reproduces these close-ups. The source GLB/Blend and gameplay are unchanged.
