# Hyena floating abdominal geometry — reproduced

Reported by the user in attack videos. Reproduced in the saved expressive GLB with Weapon_Combo at 0.6 s, and also visible in rest pose. The front body camera reveals a pale elongated piece joined visually to a brown triangular piece in front of the abdomen/pelvis. It is model geometry, not an Attack VFX.

Read-only inventory of the active 239008... GLB locates two detached Mesh_0 components (disposable welded component indices 15 and 17): 88 + 85 vertices. Their combined Blender-space bounds are approximately X -0.183..0.192, Y -0.599..-0.488, Z 0.903..1.051 m. The editable Blender source contains these same 173 vertices at those positions. All are rigidly weighted to Neck and have identical Basis/mouthOpen positions. Thus facial interpolation is not creating the displacement: the pieces are already detached at rest and follow Neck during attacks.

The separate OralCavity is located at world height 1.363..1.471 m and is not the floating abdominal piece. Exact source provenance and intended attachment remain to be determined by original UV/face correspondence. Do not remove these components or guess a new location before that comparison. `vertices.json` records original editable indices, positions, weights and shape-key coordinates; `topology.json` records the read-only GLB inventory. No model has been modified for this diagnosis.

Added front/side/back full-body controls to the expression fixture because close facial framing concealed this defect. `before-combo.png/json` records the defect.
