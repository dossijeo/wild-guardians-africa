# Canyon rock actual-mesh support diagnosis

Source5d6a25fa3. Corrected world-coordinate probe from prior report, six unchanged native-renderer captures, seed712,medium1280x720, populated fixture at144m excursion sector. Visible prop instance transforms and original highest-detail geometry inspected. Deduplicate actual position vertices and retain bottom12% of model height; transform by instance yaw/nonuniform scale/translation, then compare against field.surface at each XZ. Center checks still include downward raycast against rendered terrain. This samples actual mesh vertices, not full continuous contact triangles or an occlusion proof.

## Evidence changes the diagnosis

spatial:3:-5:33,slot10:151 bottom-band vertices. Gap range -6.861m to+4.558m,median-.987m;43.7% >.1m. Model height1.778m. Central base agrees with actual terrain to3.15e-8m. The instance is partly buried and partly protrudes from the steep cliff: it is **not entirely unsupported/floating**. Closing its maximum gap through downward translation would exceed its whole height and bury it. Other flagged rocks also mix substantial burial and positive gaps; see mesh-support-summary.json. These are approximate vertical gaps against the height field, not Euclidean distance to the cliff face.

Decision: reject blanket lowering, ring-min placement and automatic removal. No visual transform or logical instance changed. The observed silhouette may still read awkwardly, but current data do not justify treating every protruding rock as a height bug. Keep this as an artistic outcrop review issue; any future bounded orientation/composition experiment must preserve source meshes, visibility/interaction and scene equivalence. Do not change Wild Engine/Nav to force an aesthetic result.

The active generator deliberately exempts rock type3 from Canyon slope rejection, and attaches center at surface; this is consistent with outcrops. Comparing actual support avoids introducing a new regression from the prior screenshot-only impression. This report supersedes wording that implied the rocks were wholly floating, not the observation that some silhouettes look unconvincing.

Reproduce: node tools/experiments/capture-canyon-rock-mesh-support-20261023.mjs with Vite5190. All six captures completed without recorded JS/shader/GL errors. Full mesh support points and original transforms in captures.json. No new performance claim; probe is QA-only and expensive per sampled frame. Main and all production/simulation files unchanged.
