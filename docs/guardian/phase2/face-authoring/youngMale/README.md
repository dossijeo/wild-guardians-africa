# Kofi joven: inspección inicial

Original intacto a748ca0c…; sin canales faciales. Renders frontales y laterales guardados. La separación entre labios es visible en el original y se usa como referencia, distinta de la barbilla. mouth-landmarks.json registra raycasts de comisuras y línea labial; calibración inicial pendiente de contraste lateral antes del corte. Ojos grandes permiten párpados de la misma piel; no se han creado todavía. Conservar los clips y la identidad del modelo. La boca solo debe activarse durante huida o golpe, no durante trabajo normal.

## Primeros párpados: todavía no aceptados

La herramienta permite ahora seleccionar Mesh0 mediante el perfil, manteniendo Mesh_0 por defecto para las bestias. Lids-v1 dejaba blanco visible en los bordes; v2 amplía el contorno y lo cubre, pero visualmente sigue pareciendo una superficie superpuesta, sin pliegue de cierre humano convincente. No instalar ni replicar este resultado en los otros trabajadores. Próximo ajuste: volumen y línea de cierre, continuidad de piel y revisión de perfil. La auditoría de 28 huesos / 4 clips / 164 poses pasa con error máximo de posición 2.80e-6 y angular 3.94e-6 rad; no demuestra aceptación visual. Fuente provisional C:/tmp/guardian-faces/youngMale-lids-v2.blend.
