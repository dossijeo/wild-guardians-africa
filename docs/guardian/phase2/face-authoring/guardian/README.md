# Guardian eyelid review — work in progress

Installed close-up review confirms a flat turquoise curtain with a straight lower edge. The generation source is face_geometry.py: two 33x7 surfaces (462 vertices), collapsed vertically at rest; the full blink extends every column to the same lower height. The body blink also retracts the eye region by up to 45 mm, including parts of the surrounding carved rim.

v1 tested a curved lower boundary and a convex shell with UV sampling from the existing face atlas. Rejected: unwanted wood stripes, vertical texture stretching and upper gaps. All meshes with blink keys were activated for the saved render evidence, not merely GuardianFace.

v2 (study_guardian_lids.py) preserves the original painted turquoise material, anchors the upper shell depth to its neutral position and removes body-rim retraction in the isolated study. It reduces the rectangular silhouette and excavation but still has upper slits, lower corner openings and an overly inflated appearance. **Not accepted and not installed.** Production Blend, GLB and animation channels remain unchanged.

Next: calibrate each eye contour independently against the existing mask, fit the shell to the actual globe/rim rather than a generic ellipse, and add an integrated upper/lower closure seam. Full/partial closure, reopening and extreme eye orientations must pass both profile and frontal runtime views before export. The current study is a Blender geometry experiment, not a gameplay validation. Preserve the wood identity, decorations and eye control hierarchy.

Reproduce current v2: Blender --background --python-exit-code 1 --python tools/guardian/study_guardian_lids.py -- --output test-results/guardian-lids-v2. The script writes only an isolated Blend and renders. Its saved Blend mutes NLA tracks for inspection and must not replace production wholesale.


## Independent contour calibration (v5, still rejected)

Traced each eye independently from the 640px orthographic neutral reference and ray-projected the lid to the original mask/globe. v3/v4 revealed a reference-space error: muting NLA does not clear the saved head pose. The reference image includes a small Head transform. v5 projects through that transform and converts the authored vertices back into head rest space. This substantially aligns the closed shells with the actual openings instead of shifting them toward the nose.

The 33x7 surface still leaves corner openings and uneven folds where ray projection samples the carved rim. Full closure is closer, but **not accepted**; partial interpolation also needs proper surface-conforming corrective shapes rather than a straight interpolation through the globe. Next rebuild the shell with independent upper/lower contours, denser rows and explicit rim attachment, maintaining the production blink channel interface. Production assets remain unchanged. Current script reproduces v5; previous v2 command above identifies its historical revision.

## v7: upper/lower shells and intermediate poses

Replaced the isolated study's 33x7 curtains with separate 65x17 upper and lower surfaces per eye. Monotone cubic contours eliminate traced polygon corners; a quadratic depth fit avoids abrupt original-rim samples. Quarter/half/three-quarter/full shapes follow that fitted surface. A narrow vertex-color edge defines the closed seam while retaining turquoise painted wood. v7-blink images show neutral, half and full Blender poses.

The optional Guardian3D modelUrl and guardian-3d.html?lidsTrial load content/source/guardian/eyelids-candidate.glb without modifying the production model. The lab now includes a close-eye view. GuardianFace blends adjacent corrective samples only when all three intermediate keys exist; legacy meshes retain their old behavior. Six facial tests pass, including closure amplitude, neighboring weights, return to neutral and legacy compatibility. The exporter finalizer accepts isolated output/metrics paths, keeping production files untouched.

Runtime full closure and oblique extreme gaze were actually executed. The latter reveals exposed eye near the upper/side rim (v7-oblique-extreme.png). **Still not accepted for production.** Next add an anatomically fitted perimeter attachment/coverage and inspect profile/intermediate gaze. The candidate adds a fourth primitive and about 4,420 vertices before further optimization. It still contains collapsed obsolete curtain vertices; remove these before final packaging. Do not install the study Blend: its NLA tracks are muted for inspection. Source animations remain in the exported candidate; final parity and full tutorial/spell tests remain pending.
