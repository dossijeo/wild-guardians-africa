# Horizonte experimental de acacias

Prueba aislada sobre d0d4451, 6 de octubre de 2026. No cambia gameplay ni añade assets al paquete distribuido.

## Qué cambia

El visor `tests/browser/far-vegetation-transition.html` añade mil acacias diagnósticas deterministas (LCG seed 712) a las ocho existentes. Se mantienen en una sola geometría instanciada; orientación cilíndrica y selección angular se calculan en shader. El campo lejano ocupa X ±180 y Z −90…−230 sobre terreno plano. No es todavía la generación procedural del mundo real.

La selección de modelos cercanos reutiliza resultados y matrices cuando cámara X/Z, distancia de transición, disponibilidad y revisión no cambian. Cambiar altura o luz no exige reconstruir esta selección. El índice se conserva; matrices solo se suben cuando cambia el conjunto seleccionado. Cinco pruebas verifican anclaje, orientación, LOD y caché, incluyendo mil árboles excluidos y cambios de disponibilidad/revisión.

## Medición nativa

Abrir el visor en Vite, pulsar **Medir lotes**. Ocho lotes en orden alternado: 8/1008 instancias, mezcla angular activada/desactivada y orden inverso. Cada lote tiene 45 frames de calentamiento y 180 medidos; se esperan las consultas GPU pendientes hasta 60 frames adicionales. El botón fija la cámara y bloquea sus controles durante el ensayo; oculta la pestaña para abortarlo. DPR 1, 1280×720, cámara [0,25,100], día. El cronómetro reutiliza `gpu-timer.js` y consulta `EXT_disjoint_timer_query_webgl2` asíncronamente. Unsupported/disjoint nunca se interpreta como cero.

Los ocho lotes entregaron 180 consultas GPU cada uno, sin disjoint, pérdidas, overflow, pendientes ni errores GL. Se conserva el JSON nativo completo comprimido y las medianas por lote en `summary.json`.

| Población | Mezcla angular | Medianas GPU de ambos lotes (ms) |
|---|---|---|
| 8 | Sí | 0,634 / 0,636 |
| 1008 | Sí | 1,099 / 1,154 |
| 8 | No | 0,635 / 0,636 |
| 1008 | No | 1,057 / 1,224 |

Con mezcla, la diferencia de medianas de lotes es aproximadamente **0,49 ms** al añadir mil árboles. La variabilidad no permite atribuir una penalización consistente a la mezcla angular. La mediana CPU de envío del render fue 0,2 ms en todos; la actualización estaba por debajo de la resolución temporal observable (muestras de 0 ms, no coste físicamente nulo). RAF mediana 16,6 ms con sincronización de pantalla; no inferir mejora de FPS ni capacidad móvil.

Solo dos llamadas de dibujo en ambos tamaños (suelo + impostores), 18 frente a 2018 triángulos. Cámara quieta: selección escaneada una vez al inicio y otra al colocar la cámara del ensayo; cero subidas de matrices en sus ocho lotes. Los dos procesos de campaña de cien noches seguían activos: no es una medición del sistema en reposo ni del juego real. No se midió RAM de proceso ni memoria GPU total; los atributos base/yaw/escala adicionales ocupan 20.000 bytes por mil árboles, pero existen también buffers de capacidad para los modelos cercanos.

## Comprobaciones y límites

`native.json` registra horizonte de 1008, transición con un modelo, acercamiento con cuatro, retención con cero y noche, sin errores GL/console. `horizon.jpg` muestra el campo poblado; `night.jpg` conserva el tintado nocturno de diagnóstico. La iluminación sigue siendo uniforme compartida con MeshBasicMaterial, sin African Toon ni las cuatro fases reales. El modelo equivalente vuelve al estar listo; fog existente integra distancia, pero faltan cobertura de chunks, supresiones, culling, densidad configurable y desaparición final afinada.

No acredita la aceptación de todos los criterios visuales: faltan movimiento continuo/lateral, orientación visual de cada vista, integración del terreno y luces reales, muestras en móvil, RAM y coste dentro del juego. El atlas existente sigue siendo de 255.780 bytes y no se incluye en la build de gameplay. No se amplía a otros biomas todavía.

Revisión final: se amplió el test para invalidar matrices con la misma selección cuando cambian posiciones y revisión. El benchmark usa revisión cero constante, por lo que esa corrección no cambia su recorrido. `summary.json` conserva hashes medidos y finales por separado. Las cinco pruebas finales pasan.
