# Calidad en vivo y resolución del mundo

El menú de ajustes ya persistía los cuatro perfiles fuera de la partida,
pero forzaba `syncChunks(true)` al cambiarlos. Eso retiraba y volvía a crear
todos los chunks, aunque su terreno y población siguieran siendo los mismos.
Ahora conserva el rectángulo común y cambia únicamente los materiales de
suelo cuando cruza el perfil muy bajo; la selección LOD se recalcula como antes.
Alta conserva su anillo adicional de chunks. Volver a media retira solo ese
anillo. Las operaciones de construcción y supresión mantienen su recarga
explícita: esta revisión cambia únicamente la transición de calidad.

Los horizontes de Cañones y Desierto conservan geometría y agua si el
rectángulo residente no cambia; solo sustituyen el material de terreno cuando
corresponde, conservando los límites de recorte y el shader cel. Cambiar el
rectángulo o la configuración del mundo sigue regenerando el horizonte.

La resolución ejecuta la receta `resize()` del Bioma Lab V4.0 para modo
terreno: DPR máximo 1 en eco, 1,5 normal y 2 alta, con reducción proporcional
al alcanzar 2,6 millones de píxeles y redondeo de dimensiones al entero más
próximo. Muy baja comparte el límite de eco. La cámara utiliza el aspecto
del buffer redondeado, como la proyección original. El renderer de Three
trabaja a DPR interno 1 con esas dimensiones físicas; el canvas conserva su
tamaño CSS. Raycast y controles siguen tomando coordenadas CSS normalizadas.
Cada fotograma detecta cambios de DPR o tamaño, evitando volver a asignar
un drawing buffer que ya tiene las dimensiones correctas. El diorama del
menú conserva su renderer original independiente.

Cinco pruebas nuevas comprueban el método original de resize en móvil
vertical/horizontal, escritorio, 4K, DPR diversos y dimensiones ocultas;
transiciones de materiales con recursos compartidos; metadatos del cel y
recorte; conservación de estado lógico y objetos de chunk; reutilización
estática del buffer y cambio de DPR; y conservación de geometría/agua del
horizonte. La regresión completa previa a los ajustes finales pasa 569/569,
sin omisiones, en 256,965 s. Los ajustes finales de resize por fotograma,
aspecto redondeado y horizonte añaden dos casos y pasan la ejecución dirigida
18/18 en 5,249 s. Build final pasa en 5,10 s; paquete web valida 547 archivos
/ 379382623 bytes, 791 enlaces relativos y 20 GLB de runtime, sin duplicados.
La regresión completa de la fuente final queda a cargo de GitHub Actions.

La QA GPU recorre los seis biomas con Mapungubwe y calidades mixtas. Sabana
ejercita las cuatro calidades en la misma escena: conserva 25/25 chunks y
no libera geometría de suelo entre media, muy baja y baja; al entrar en alta
conserva esos 25 y añade el anillo; al salir conserva 25/49 y libera los 24
terrenos exteriores. Los registros finales comparan el JSON de la partida
antes y después del cambio/dibujo y conservan igualdad. Los primeros
registros de Sabana preceden al ajuste final que extiende esa comparación
al dibujo; son evidencia del cambio de calidad, no de ese ajuste posterior.
Gran Río incluye daño DEST; Manglares, agua; Volcanes y Desierto, noche;
Cañones cambia a muy baja y vuelve a media. No se registran errores ni avisos.

En vistas CSS de 3840×2160, Sabana y la fuente final en Desierto producen
canvas real de 2150×1209, confirmado mediante los atributos DOM del canvas,
no solo el contador calculado. Los tamaños de prueba se restauran y las
pestañas temporales se cierran. Artefactos en `test-results/quality-*`.
Los contadores de sombras conservan la última pasada real al desactivarlas;
una cifra antigua en el diagnóstico no significa que se haya dibujado una
pasada nueva en calidad baja.

Esto no acredita FPS, memoria GPU residente ni la matriz completa de
dispositivos/culturas/calidades del Plan Maestro. El suelo muy bajo usa
MeshBasic y conserva el tratamiento cel; los materiales de actores y otros
sistemas mantienen sus contratos actuales. La política global de detalle,
iluminación y efectos de cada perfil todavía requiere la auditoría completa
de calidad y legibilidad de noche/Escudo. Origen flotante, worker, filtrado
y caché nativos de sombras siguen pendientes. El objetivo completo continúa.
