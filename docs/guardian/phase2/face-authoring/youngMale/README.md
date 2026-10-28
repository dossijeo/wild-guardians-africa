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
