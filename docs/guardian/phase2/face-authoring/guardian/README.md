# Guardian eyelid review — work in progress

Installed close-up review confirms a flat turquoise curtain with a straight lower edge. The generation source is face_geometry.py: two 33x7 surfaces (462 vertices), collapsed vertically at rest; the full blink extends every column to the same lower height. The body blink also retracts the eye region by up to 45 mm, including parts of the surrounding carved rim.

v1 tested a curved lower boundary and a convex shell with UV sampling from the existing face atlas. Rejected: unwanted wood stripes, vertical texture stretching and upper gaps. All meshes with blink keys were activated for the saved render evidence, not merely GuardianFace.

v2 (study_guardian_lids.py) preserves the original painted turquoise material, anchors the upper shell depth to its neutral position and removes body-rim retraction in the isolated study. It reduces the rectangular silhouette and excavation but still has upper slits, lower corner openings and an overly inflated appearance. **Not accepted and not installed.** Production Blend, GLB and animation channels remain unchanged.

Next: calibrate each eye contour independently against the existing mask, fit the shell to the actual globe/rim rather than a generic ellipse, and add an integrated upper/lower closure seam. Full/partial closure, reopening and extreme eye orientations must pass both profile and frontal runtime views before export. The current study is a Blender geometry experiment, not a gameplay validation. Preserve the wood identity, decorations and eye control hierarchy.

Reproduce current v2: Blender --background --python-exit-code 1 --python tools/guardian/study_guardian_lids.py -- --output test-results/guardian-lids-v2. The script writes only an isolated Blend and renders. Its saved Blend mutes NLA tracks for inspection and must not replace production wholesale.
