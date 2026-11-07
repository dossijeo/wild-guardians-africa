# Hyena floating abdominal geometry — reproduced

Reported by the user in attack videos. Reproduced in the saved expressive GLB with Weapon_Combo at 0.6 s, and also visible in rest pose. The front body camera reveals a pale elongated piece joined visually to a brown triangular piece in front of the abdomen/pelvis. It is model geometry, not an Attack VFX.

Read-only inventory of the active 239008... GLB locates two detached Mesh_0 components (disposable welded component indices 15 and 17): 88 + 85 vertices. Their combined Blender-space bounds are approximately X -0.183..0.192, Y -0.599..-0.488, Z 0.903..1.051 m. The editable Blender source contains these same 173 vertices at those positions. All are rigidly weighted to Neck and have identical Basis/mouthOpen positions. Thus facial interpolation is not creating the displacement: the pieces are already detached at rest and follow Neck during attacks.

The separate OralCavity is located at world height 1.363..1.471 m and is not the floating abdominal piece. Exact source provenance and intended attachment remain to be determined by original UV/face correspondence. Do not remove these components or guess a new location before that comparison. `vertices.json` records original editable indices, positions, weights and shape-key coordinates; `topology.json` records the read-only GLB inventory. No model has been modified for this diagnosis.

Added front/side/back full-body controls to the expression fixture because close facial framing concealed this defect. `before-combo.png/json` records the defect.

## Original provenance and repair

The original artist GLB also displays the same detached abdominal pieces (see artist-original/front.png). UV-face correspondence aligns all 173 vertices with the original, maximum difference 1.366e-7 m. These are inherited disconnected debris, not new mouth geometry or displacement introduced by the collar restoration. Removed exactly these two complete islands; the script rejects any selection crossing a connected face and preserves all shape-key names. Original files remain retained.

The repaired combo screenshot repeats Weapon_Combo at 0.6 s and shows the abdomen clear. The 246-pose audit preserves six clips and 21 bones, 4,880 lower-body vertices retain exact positions/weights (excluding Neck-bound collar/debris), and 1,011 core muzzle vertices retain rigid head-relative motion. Active source is 022436860982f39f1bac2989423fcbc9d2be99f6433809ba1f60a664d6be307f.glb; the editable source and compressed candidate are updated. Actions, footsteps and physical fallback clips were regenerated. Web verification passes byte-exact 2,145,467 geometry/animation bytes and zero validator errors.


## Collider calibration and installed runtime follow-up

Removing 173 disconnected vertices changed the alternate-vertex support sample and caused three physics checks to fail. Full sampling fixes the repaired hyena but changes rhino settling; it is now explicitly scoped to hyena through the prepared model species (or binding species option for offline baking). Other species keep stride 2. Support caches are separated by sampling stride. Runtime prewarming and offline fallback baking use the same calibration.

35 focused ragdoll, recovery, baked-contact and expression tests passed. All 40 fallback clips regenerated. Installed-model browser cycle (no candidate override) completed 12.106 simulated seconds: falling, rolling, authored get-up, walking; final down count 0, no errors, peak articulated actors 1. See installed-cycle.json. This is a diagnostic run, not a paired performance comparison: physics p95 3.01 ms, p99 4.52 ms, maximum 21.00 ms; first collider fit 6.29 ms. No global fluency claim.
