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

## Oral cavity iterations

`add_rhino_oral_cavity.py` builds 910 skinned vertices for a recessed palate, floor, tongue, rear closure and commissure walls. V1 was rendered and rejected: lateral rays still pass through the cavity. V2 adds posterior buccal walls; side and quarter renders show improved closure but an abrupt vertical leading edge, so this is also not accepted or installed. Next round and blend the buccal leading edge behind the lip and inspect intermediate openings, then validate deforming poses. Do not replace the open entrance with a flat dark surface.

V1 original animation audit: 76 bones, six clips, 246 samples, zero position delta and maximum quaternion angle 6.67e-8 rad. This proves retained channels only, not oral skinning quality. Working candidates remain in C:/tmp/guardian-faces/rhino-oral-v1 and rhino-oral-v2 (.blend/.glb).

## Curved cheek refinement

V3 replaces the straight cheek edge with a tessellated surface, but its forward-bowed edge looked like an extra tongue in the inspected quarter view; rejected. V4 reverses that curvature, recessing the middle of the edge while retaining upper/lower attachments. Full and half-open quarter views were inspected and show a continuous curved interior rather than the vertical plate. The front entrance remains open; full lateral closure, lip thickness, native-pose deformation and in-game shading still require acceptance. V4 is the current working oral candidate, not an installed asset. Its .blend/.glb are in C:/tmp/guardian-faces/rhino-oral-v4.

## Lip thickness and eye framing

V5 adds separate upper/lower rolled rims connecting the exact authored seam to the recessed mucosa (three strips per lip). The quarter view was inspected; the opening remains unobstructed. Native-channel audit again passes for 76 bones and 246 sampled poses. This is not yet visual acceptance in movement.

`eye-calibration/front.png` reveals that a frontal eyelid profile would mostly sample the overhanging brows rather than the laterally facing eyes. Do not reuse buffalo frontal contours. Next use independent side-view camera calibration for each eye, with local surface skinning and texture projection; extend the reusable eyelid authoring tool to support those camera frames. Current working mouth source: C:/tmp/guardian-faces/rhino-oral-v5.blend/.glb.

## Independent lateral lids

The reusable eyelid authoring tool now accepts cameraDirection and lidObject; defaults preserve existing actor profiles. Rhino profiles use opposite side cameras, separate source-texture atlases and local barycentric skinning. Both fully closed side renders were inspected. Eight progressive blink morphs exist across the two lid meshes. Partial closure, neutral visibility and moving skin still require validation. The right closed lid looks somewhat raised and its texture softer than surrounding skin; assess at game scale and refine if needed.

Editing from a Blend file resampled the original rear-cloth tracks (initial audit failed). Restoring the source channels fixes the audit: 76 bones, six clips, 246 poses, zero position delta. The tool now offers --source-glb for this case. Use the original e77e4a48... source for both eyelid passes. Current candidate: C:/tmp/guardian-faces/rhino-lids-v1.blend and .glb; still uninstalled.


## Corrección anatómica solicitada: boca inferior (28 octubre)

El usuario rechaza la abertura subnasal anterior y proporciona una línea roja sobre el labio inferior. Los candidatos oral-v1 a oral-v5 y lids-v1 NO son candidatos de integración mientras conserven ese corte. Se vuelve al GLB original intacto. corrected-mouth-requests.json transfiere provisionalmente la referencia a la vista lateral ortográfica; corrected-mouth-landmarks.json registra los impactos sobre la superficie real. jaw-v2 contiene renders del nuevo corte sin interior. Inspección lateral: abertura ahora inferior, pero borde mandibular todavía angular; faltan cavidad, refinamiento, vistas comparadas y pruebas con animación. No se ha instalado en el catálogo. La cavidad anterior no debe reutilizarse con sus coordenadas antiguas.

### Interior adaptado al corte inferior

La iteración oral-v8 reconstruye paladar, suelo, lengua y paredes bucales a partir del nuevo perfil; no conserva las alturas de la abertura subnasal rechazada. Se suaviza solamente el contorno del corte antes de separarlo, manteniendo coincidentes los labios en neutral. oral-v7 mostró un hueco lateral excesivo: oral-v8 extiende la pared bucal hacia delante sin cubrir la entrada frontal. Revisadas visualmente la vista lateral a apertura completa y tres cuartos a media apertura. La auditoría conserva los 76 huesos y seis clips en 246 poses (posición: 0; error angular máximo 6.664e-8 rad). Esto NO verifica todavía la deformación facial durante todos los clips ni la integración en el juego. Pendientes: neutral, interior sin pliegues/intersecciones, recomponer párpados, inspección runtime y empaquetado. Fuente de trabajo: C:/tmp/guardian-faces/rhino-oral-v8.blend; reproducible mediante los scripts y los informes guardados.
