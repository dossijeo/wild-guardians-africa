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

### Whole-loop comparison

render_mantle_cycle.py rendered original and candidate with the exact same fixed camera and lighting, Idle + Float + Mantle_Breeze, frames 1–289 at step 4 (73 frames, six samples per second). weight-comparison.mp4 shows original on the left and candidate on the right, without audio. It is offline Blender output, not gameplay. Both contact sheets were inspected at one-second intervals across the loop: the candidate shows broader hem travel, with no evident open tear in these sampled views. The thick edge remains visible. The previous single-pose fold does not justify immediate rejection, but these sparse views do not rule out transient intersections or establish natural real-time movement. Retain candidate for a separate Three.js preview; do not install it based only on these renders. No runtime files were changed.

### Three.js candidate preview

export_mantle_trial.py exports the isolated Blend to test-results/guardian-mantle-weights.glb, unmutes all NLA tracks and runs the existing channel-isolation/face-batching finalizer against that explicit candidate path. It does not touch the installed GLB or its metrics. Final candidate SHA-256: 48ec4840a95ed2397dadd22e308ab6ef4c166dcc046e75218fadc37365251bc3. weight-export.json records 3,529,736 bytes, 37 bones, 13 clips and four primitives, matching the installed resource counts.

The existing browser lab supports `guardian-3d.html?mantleTrial=1`. Executed its checks on the candidate: all assertions passed (weight-browser-checks.json), including facial controls, layered animation, 54 audio duration checks and real ES_01/EN_01 clock/paused-seek checks. These do not establish perceptual synchronization of all dialogue. Its isolated-scene timing is not a before/after gameplay benchmark.

After checks finished, recorded a separate twelve-second silent Idle cycle, three-quarter view, vortex hidden. weight-browser.webm is that capture; weight-browser.jpg was inspected at one-second intervals. The hem, floating wood and feathers visibly vary, with no obvious detached cloth or open tear in those sampled views. An earlier recording overlapped the automated checks and was discarded. This preview uses Guardian3D, not WorldScene's spell material: actual spell-layer/short-summon validation remains required before installation.

### WorldScene validation and installation

Added a QA-only `mantleTrial` asset override to guardian-combat.js. Ran its day and night recordings with `?mantleTrial=1&castClose=1`, sound enabled. weight-world-day/night.webm and JSON preserve the results. Day runs six Grow/Multiply commands including a 300 ms replacement; night exercises Attack, Shield, hyena/rhino, camera rotation and distance changes. Both report zero errors and maximum one visible Guardian; night finishes with zero active/baked physics and zero roll failures. These are controlled fixture recordings with reset spell restrictions, not a balance or performance benchmark.

Inspected the first daytime cast at 5 fps and the nighttime sequence at 1 fps using the adjacent JPGs. The wider hem remains visible with materialization and spell effects; no evident cloth opening is visible in these sampled views. This supports adopting the local weight improvement, not blanket certification of every pose, camera or collision.

Installed the exact tested candidate in art/guardian/guardian.blend and public/content/guardian/guardian.glb. Runtime SHA remains 48ec4840a95ed2397dadd22e308ab6ef4c166dcc046e75218fadc37365251bc3. Source SHA is 80276fe5ebfe9b02f23812a27e5be907ef02c38b484482aef492aafc3da15424. Twenty-two model, singleton and face tests pass on the installed asset. JSON metadata is identical to the prior GLB; changed binary views are body JOINTS_0/WEIGHTS_0 and regenerated tangents (maximum component difference .000100002). All other binary views, including animation and image data, compare unchanged. Resource counts/size are unchanged; no new gameplay performance measurement is claimed.

Earlier candidate-only paragraphs describe the preceding stages. The weight generator now accepts --source and verifies the original SHA to prevent recursively applying the transfer to the installed source. To reproduce, extract art/guardian/guardian.blend from commit 39d03dcb9, pass that file to study_mantle_weights.py, then run export_mantle_trial.py. Broad artistic acceptance of wind and the full phase-2 goal remain open.
