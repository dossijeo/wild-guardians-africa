# Coste GPU por pases de una finca avanzada

Diagnóstico nativo sobre base `2c2190b`, con instrumentación QA adicional. Se continúa el mismo guardado histórico de Manglares/Saheliana, se pagan 18 trabajadoras mayores y se ejecutan 350 pasos de 100 ms: 150 de calentamiento y 200 medidos. Calidad media, framebuffer 1600×900, shader analítico original, herramientas ocultas descartadas y cámara general de la finca. No se activa el candidato de descarte de cultivos ni ruido de textura.

| Segmento | Mediana GPU (ms) | Mediana llamadas | Mediana triángulos |
| --- | ---: | ---: | ---: |
| Profundidad de mundo para VFX | 16,3301 | 208 | 1.731.480 |
| Cielo | 0,9853 | 1 | 1 |
| Sombras automáticas del mundo | 8,3135 | 170 | 1.672.445 |
| Dibujo final del mundo | 37,6186 | 256 | 1.731.763,5 |

Se interceptan únicamente `renderer.render` y `renderer.shadowMap.render`, conservando receptor, argumentos, retorno y comportamiento. Las queries `TIME_ELAPSED_EXT` se segmentan antes/durante/después de la llamada automática de sombras: nunca se anidan. Las llamadas vacías de sombras en profundidad/cielo se conservan y miden separadamente, con cero envíos; no son pases efectivos de shadow map. Las queries se leen cuando están disponibles y se restauran ambos hooks en `finally`. Ningún material, visibilidad, calidad ni regla lógica cambia.

**1.800 queries completas**, sin eventos disjoint, pérdida de contexto, descartes, desbordamientos, queries ajenas o resultados pendientes. Los contadores de los segmentos reconcilian exactamente llamadas/triángulos del render completo en cada uno de los 200 frames. Las medianas por segmento no se suman como si fueran una mediana global; `proof.json` calcula también las sumas por frame. Las limpiezas/comandos fuera de `renderer.render`, actualizaciones CPU, composición del navegador y presentación no están cubiertas por esa suma.

La mediana observada del render completo es 637 llamadas y 5.135.701 triángulos con todos los pases sumados. El estado final conserva el hash `c6cd4533687b41c35d494e322c8f82ab0e613544819fe0f8d7c1ded224300fdd`, igual a las continuaciones anteriores: 35 s, saldo 841, 18 trabajadores y 186 plantas vivas. Sin errores de escena/WebGL ni avisos/errores en consola al terminar.

La instrumentación añade queries y perturba el tiempo. Es una atribución de coste en esta escena/cámara, **no** un ensayo A/B de una optimización, mejora de FPS ni aceptación general/móvil/RAM/audio/HUD/autosaves/incursiones. Tampoco atribuye todo el coste del dibujo final al shader ni demuestra que se puedan eliminar los 16 ms de profundidad: habría que conservar siluetas alpha, clipping, crecimiento, morph, skinning y destrucción. La siguiente prioridad es localizar las categorías/materiales de esas dos pasadas conservando su imagen. La caché de sombras ya existente sigue activa; el movimiento y viento pueden invalidarla.

[Informe nativo completo](native.json.gz), [captura contextual](farm.png), [hashes y reconciliación](proof.json). El JSON se almacena con gzip mtime cero y se conservan hashes de bytes originales/comprimidos. Pasa la batería dirigida de **13 pruebas**: timer disjoint y separación/restauración de pases, incluyendo fallos y queries no disponibles/ajenas. Los cambios son exclusivamente QA; no se modifica el renderer de producción.
