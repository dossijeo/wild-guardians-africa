# Kofi joven: inspección inicial

Original intacto a748ca0c…; sin canales faciales. Renders frontales y laterales guardados. La separación entre labios es visible en el original y se usa como referencia, distinta de la barbilla. mouth-landmarks.json registra raycasts de comisuras y línea labial; calibración inicial pendiente de contraste lateral antes del corte. Ojos grandes permiten párpados de la misma piel; no se han creado todavía. Conservar los clips y la identidad del modelo. La boca solo debe activarse durante huida o golpe, no durante trabajo normal.

## Primeros párpados: todavía no aceptados

La herramienta permite ahora seleccionar Mesh0 mediante el perfil, manteniendo Mesh_0 por defecto para las bestias. Lids-v1 dejaba blanco visible en los bordes; v2 amplía el contorno y lo cubre, pero visualmente sigue pareciendo una superficie superpuesta, sin pliegue de cierre humano convincente. No instalar ni replicar este resultado en los otros trabajadores. Próximo ajuste: volumen y línea de cierre, continuidad de piel y revisión de perfil. La auditoría de 28 huesos / 4 clips / 164 poses pasa con error máximo de posición 2.80e-6 y angular 3.94e-6 rad; no demuestra aceptación visual. Fuente provisional C:/tmp/guardian-faces/youngMale-lids-v2.blend.

## Párpados v3

Se añade closureCrease opcional: relieve de hasta 3 mm y línea suave de cierre mediante color de vértices multiplicado por el atlas; no afecta a perfiles anteriores. Revisión frontal completa y media apertura: el cierre se reconoce mejor, no se ve blanco al cerrar, pero el borde superior sigue pareciendo superpuesto y requiere integración. La media apertura cubre la pupila sin sustituirla. No instalado, no aceptación final. Fuente C:/tmp/guardian-faces/youngMale-lids-v3.blend. Pendiente comprobar que el material compuesto exporta el color esperado en Three.js y suavizar la unión a la piel.

## Validación Three.js v4

Fixture actor-expression acepta actor=youngMale, localiza mixamorigHead y usa el controlador worker (huida/golpe). Capturas runtime-v4: cierre y apertura parcial reales. Se elimina la franja negra superior llevando el contorno a piel y ajustando la mezcla de superficie. Queda aspecto abultado en el cierre; pendiente afinar. El exportador emite un aviso sobre el color activo, pero inspeccionar el GLB confirma COLOR_0 y COLOR_1 en los párpados. El aviso no demuestra pérdida de ClosureFold; falta verificar los valores y qué canal consume Three.js antes de atribuir diferencias al sombreado. Fuente provisional youngMale-lids-v4.blend; no instalado.

## Corrección del color exportado v5

Inspección binaria v4: COLOR_0 era blanco uniforme (255), mientras COLOR_1 tenía el pliegue (31877–65535). Se establece ClosureFold como color activo y se exporta ACTIVE, sin canales auxiliares, solo para perfiles closureCrease. El exportador verifica ahora que COLOR_0 conserve variación suficiente; ejecutado con éxito en youngMale-lids-v5-checked.glb. Captura Three.js runtime-v5/closed.png confirma el resultado. La forma todavía necesita revisión de volumen y movimiento, no está instalada.

## Lid envelope v6: not accepted

The quadratic envelope previously shifted globally by 6.145 mm (left) and 4.634 mm (right), then added up to 3 mm of crease bulge. New optional profile controls reduce the shift to 25% and bulge to 1 mm for Kofi only; other actor defaults remain unchanged. Rebuilt GLB and inspected full-closure front/side Cycles renders in lids-v6. Eye coverage is retained in these two views, but the border remains visibly raised and the broad skin patch is still artificial. This is NOT an approved or installed worker asset. Next refine the perimeter attachment and texture transition, then inspect partial closure and animated skinning. Do not claim the reduced offset alone resolves visual integration.

## Lid attachment v8

Reduced triangle clearance to 0.3 mm for Kofi only and recessed the upper/lower attachment by 1.5 mm across an 8% band. V7 recessed lateral edges too; frontal inspection exposed a white sliver at the inner eye corner, so that variant was rejected. V8 keeps lateral edges supported and removes that sliver in the inspected full-closure frontal render. Front/side renders are saved in lids-v8; skin color and surface shape still read as a separate patch, so this is not final visual acceptance. Partial blink and moving attachment still need review. Original four animation clips and 28 bones pass comparison across 164 samples (maximum positional delta 2.797e-6, angular delta 3.936e-6). Other actor profiles retain the previous clearance defaults. No worker catalog asset changed.

## Boundary skin color v10

Kofi now optionally uses vertex colors interpolated from the unlit atlas immediately above/below each reviewed contour, with a 5x5 median to suppress isolated texels. V9 incorrectly treated PNG pixel values as linear and looked pale; rejected. V10 explicitly converts sRGB to linear before writing COLOR_0. Reimported exported GLB renders inspected: closed front and half closure front/side. Color integration is visibly improved over the forehead patch; half closure retains a clean visible eye without the earlier inner-corner sliver. A thin upper contour and some surface faceting remain visible at close range. Next inspect neutral and native animation in Three.js before proceeding to the mouth. No worker asset installed; no claim of complete visual acceptance.

## Three.js v10 and mouth close-up calibration

Loaded v10 through the actual actor-expression controller: eight eyelid bindings, two draw calls, no reported errors. Inspected neutral front, closed eyes with Running at 0.4 s, and half closure side at 0.6 s (clip duration 0.7083 s). Eyelid coverage/attachment holds in these sampled poses; a thin upper boundary remains visible. Screenshots/status in runtime-v10. This is not a continuous all-clip validation or mouth functionality.

Rendered the preserved original with a 0.38-unit mouth frame and inspected front, quarter and side. New mouth-closeup-landmarks.json raycasts eight points on the actual dark lip seam and commissure; center z=1.22258, commissures about z=1.243-1.244. Side/front mid-lip picks differ by about 4 mm in height and must be reconciled before incision; do not average blindly or extend the cut into the chin. Original patchy cheek/nose texture is visible in these untouched source renders and is not caused by facial edits. No mouth cut yet.

## Worker jaw and oral cavity candidates

prototype_worker_jaw.py incises the five frontal lip-seam landmarks, whose center agrees with the earlier frame within 0.5 mm. Side calibration remains a cross-check, not an averaged replacement. The local lower jaw moves 79 vertices with a 0.30-radian morph and fading commissure/chin weights; source skinning is retained. Jaw-only front/quarter inspected: incision follows the lower lip, cavity absent. add_worker_oral_cavity.py adds recessed palate/floor, tongue and walls with barycentric source binding. V1 had a lateral see-through opening and dark protruding rim; rejected. V2 adds curved cheek tissue and recesses the rim. Inspected side/quarter: lateral gap largely closed, but cheek leading edge remains too prominent from three quarters and a small lower-front gap is visible from the side. Continue refinement, teeth, neutral/half-opening and animated validation before installation. Source candidates C:/tmp/guardian-faces/youngMale-jaw-v1.blend and youngMale-oral-v2.blend. V1 oral animation audit passes 28 bones/four clips/164 samples; this does not approve V2 visually.

## Recessed dentition v4

Added low-poly upper/lower dental rows bound to nearby lip weights; lower teeth share the jaw morph. V3 protruded through the lower lip and overly recessed cheek tissue reopened the lateral gap; rejected. V4 reduces to six teeth per row, recesses them 18 mm from the seam and reduces cheek recession. Inspected exported GLB full-open quarter/side and neutral front: the protruding tooth is removed and teeth/interior stay hidden when closed. Still not accepted: side shows a small lower-front gap and the cheek leading surface remains visually prominent in quarter view. Must refine the actual cheek-to-floor junction rather than hiding this with a flat dark plug. Partial V3 renders were generated but not accepted as V4 evidence; V4 half-opening and animation still pending.

## Rejected continuous buccal-strip experiments

V5 matched the palate/floor entrance anchors exactly, with inward curvature, but retained the lateral see-through gap. V6 extended the strip toward the front and reduced its bow: side coverage improved, but the quarter view became a curtain across the mouth, violating the open-cavity requirement. Both rejected after rendered inspection; the production authoring script remains V4 rather than silently retaining V6. Experimental code and representative images are preserved in oral-rejected-continuous for reproducibility. Next action must change topology to a continuous recessed oral volume with connected upper/lower/side surfaces, not further widen these front-facing strips. The current worker asset remains uninstalled.

## Continuous oral shell v9

Replaced separate palate/floor/cheek strips with one perimeter swept into a recessed chamber, retaining tongue and dental rows. V7 full/half quarter renders inspected: no cheek curtain; pure side still shows background near the anterior opening. V8 flared the chamber anteriorly and visibly protruded through the lips, so rejected. V9 restores V7 geometry and adds a topology gate: exactly 52 boundary edges, all at the intended front aperture, zero unexpected boundary or nonmanifold edges. Audit passes four clips/28 bones/164 poses. This gate proves shell connectivity only, NOT fit against exterior lips or absence of self-intersection. Next diagnose the side-view rays against both exterior and interior before asserting that the visible background is legitimate or accepting it. Source C:/tmp/guardian-faces/youngMale-oral-v9.blend; no worker installation.

## Side-ray diagnosis and runtime mouth validation

diagnose_worker_oral_rays.py evaluates the posed Blend and a diagnostic triangulation of the curved lip aperture. Three background rays in the reviewed side view cross that aperture twice; two exterior control rays hit Mesh0 and cross no aperture. This supports line-of-sight through the mouth entrance at those samples, not a missing side-wall seam. It is not an exhaustive geometric intersection proof. Do not fill the opening with a sheet to hide this view. Neutral exported GLB render inspected: teeth/interior concealed.

Loaded oral-v9 in Three.js: ten morph bindings, three draw calls, no errors. Running at 0.4 s with both eyes shut and mouth 0.85 inspected in quarter view: exterior jaw, interior and lids stay attached in this sample. Evidence in oral-shell/runtime. Screenshot predates correction of the obsolete mouth-pending label. Remaining: all native clips/neutral in runtime, actual flee/hit events and game integration/packaging.

## Portable source and compressed candidate

Packaged editable Blend and GLB in content/source/actors/youngMale. Compression 27,562,880 → 5,304,836 bytes; 2,545,310 geometry/animation bytes exactly preserved, minimum texture PSNR 39.60, zero glTF validator errors. Fixture now loads this versioned file, not a scratch path. Compressed GLB inspected with combined pain expression in Alert 0.3 s, Shot_and_Fall_Backward 0.3 s and Skip_Forward 0.5 s. No reported errors, three draws; sampled facial attachment remains coherent. These are sampled poses, not full continuous animation validation. Catalog integration and actual worker flee/hit events remain pending.

## User-requested face seam repair

Unlit and normal-disabled comparison isolates the polygonal cheek/chin patches to the original normal map. A head-only material removes that map and fixes roughness at 0.82; body material unchanged. Area-weighted split normals across coincident UV vertices eliminate the residual nose lighting discontinuity without welding geometry, altering positions, skinning or morph values. Source albedo retained. Updated portable Blend and compressed GLB; compression verification passes (2,549,734 exact geometry/animation bytes, PSNR 39.60, zero validation errors); 164 animation samples pass. Neutral and pain in Three.js inspected, no errors. Four draws instead of three because head material is separate; no claim of measured frame-time impact. Face correction is implemented in the candidate; catalog integration remains pending.

## Gameplay library integration preparation

Authoritative scene.js uses worker-actions.json for the worker model itself, not just its animations. Its youngMale asset is 25e4ab98..., with twelve actions and watering can/crate/sack/hoe nodes. Do NOT replace that library with the four-clip reference candidate. merge_worker_facial_library.py imports the gameplay library and grafts only the three edited facial/body meshes, preserving the gameplay rig/tools. A validated rest-frame transform aligns all 28 bones; the source and gameplay object matrices differ. Original twelve animation channels restored after export. Candidate C:/tmp/guardian-faces/youngMale-gameplay-v1.blend/.glb passes 492 sampled poses: zero position delta, angular maximum 5.961e-8. Graphical tool attachment/full-library validation and watering-emitter provenance update required before catalog installation.

Fixed audit_face_coverage.mjs to inspect runtime worker library URLs rather than reference models. Runtime report still correctly lists four workers missing facial channels. Previous reference-only worker audit was insufficient integration evidence.

### Full gameplay-library candidate (follow-up validation)

`content/source/actors/youngMale/gameplay-candidate.glb` retains the twelve gameplay actions and original tool nodes. Reproduce from the original worker library using `merge_worker_facial_library.py` with the full-resolution material-repaired face blend, then `compress_web_assets.mjs --candidate` and `verify_web_assets.mjs --candidate`. Compression: 28,812,068 to 6,525,096 bytes; 3,495,056 geometry/animation bytes unchanged, minimum texture PSNR 39.60 dB, zero validator errors.

Open `tests/browser/actor-expression.html?actor=youngMale&gameplayCandidate`. The saved Water (0.4 s) and Hit (0.3 s, manual eyes closed/mouth 0.85) screenshots use the uncompressed graft. They show the watering can retained in the hand and face following the hit pose. All twelve clip names load, but these captures do not validate every animation or actual game AI. The original and grafted watering-nozzle paths match exactly at all 205 intervals sampled at 60 Hz (rounded to six decimals by the existing baker). Runtime manifests remain unchanged pending further graphical validation of the compressed candidate and gameplay installation.
