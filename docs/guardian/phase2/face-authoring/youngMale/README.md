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
