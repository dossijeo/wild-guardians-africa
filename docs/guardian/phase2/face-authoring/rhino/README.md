# Rhino facial authoring baseline

Active original: public/assets/e77e4a48a6d072d58420575e0e58b3545e8f4eb5d8ea54f4a7f38819e93f1cff.glb. No source geometry, weights or runtime catalog have been changed in this inspection.

The initial Head-weight-based frame (`original`) cuts off the lower face; the explicit `head` and `mouth` views supersede it. Front and side head views and the enlarged side muzzle were inspected. The horn and heavy upper muzzle obscure the mouth frontally. No exposed dental row was observed in these views. The dark lower contour needs distinguishing from a chin/skin fold before incision.

Read-only topology inventory: Mesh_0 has 41,638 imported split vertices; a disposable weld has 7,763 vertices in 174 components. RearCloth is separate, with 828 imported / 210 disposable welded vertices in 18 components. Do not apply whole-component or previous-species jaw assumptions. The original feet and rear-cloth repairs must be retained.

The explicit weight boxes show muzzle mean Neck 0.525 / Head 0.474; all 172 vertices in the lower-lip candidate box are Neck-dominant (mean 0.644 Neck / 0.354 Head). The eye box includes surrounding anatomy and mixed weights; its averages do not authorize assigning an entire eye rigidly. New surfaces should inherit local binding unless a separately validated correction is required.

`mouth-landmarks.json` raycasts provisional side-view landmarks and a nostril reference. They are NOT an approved incision profile: several lower candidates have strongly downward-facing normals and may lie on the chin. Reconcile the actual crease/commissure in the opposite side and three-quarter views, then inspect local topology before cutting. The field names intentionally retain `candidate` to avoid silently treating uncertain landmarks as anatomical truth.

Next: review eye envelopes and asymmetry, confirm the mouth seam, author species-specific lids and jaw/interior, and test skinning across native clips before packaging or installation. This baseline does not complete rhino expressions.

## Subnasal candidate, 2026-10-28

Added neutral clay and lower camera views; inspection metadata now carries exact camera directions for reproducible raycasts. The source has a continuous lower muzzle rather than an exposed dental seam. Lower-view picks distinguish the subnasal surface from the chin silhouette; the named chin-center ray actually reaches the recessed underside/neck and must not define the lip.

`prototype_rhino_jaw.py` creates a local curved subnasal incision and a 0.24-radian opening, retaining interpolated source skinning and original animation channels. 94 vertices move. Side and lower-front renders were inspected: the aperture is below the nostrils and the lower muzzle moves as a jaw; the neck and horn remain outside the moving region. This is an uninstalled candidate, not acceptance: side view sees through the opening because the oral interior is not yet built, and lip rims are still sharp. Next construct recessed palate/floor/sidewalls and soften local rim transitions, then audit all native poses and author eyelids. Candidate files are in C:/tmp/guardian-faces/rhino-jaw-v1.blend and .glb; the committed script and reports reproduce them from the preserved source.
