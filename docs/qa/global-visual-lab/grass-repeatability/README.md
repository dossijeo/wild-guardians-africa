# Repetibilidad del coste de matas

Control A/A seguido de comparacion A/B en Gran Canon, paisaje +50/+30 m, semilla 712, calidad media, dia 150/noche 350, misma pagina por bioma. A/A conserva presupuesto 192 en ambas etiquetas; A/B compara 192 contra 128. Cada grupo usa ABBA BAAB, 30 frames de calentamiento y 180 muestras por bloque, un segundo de espera tras seleccionar presupuesto. 32 bloques y 5.760 muestras GPU. No se modifica el juego ni se generan nuevas imagenes de una variante visual.

En A/A se verifican camara, objetivo, hora, cantidad, calls, triangulos, texturas y SHA256 de todas las matrices activas identicos. La etiqueta A/B del control no modifica el estado grafico. Todas las mediciones tienen camara estable, cantidades acotadas y cero errores registrados. Assets y seleccion permanecen residentes. Estos invariantes no controlan la carga externa del ordenador, temperatura o frecuencia GPU; no se atribuye la variacion a una causa concreta.

| Fase | Grupo | GPU A / B (ms) | B - A | Rango entre bloques |
|---|---|---:|---:|---:|
| day | AA | 15.651 / 15.824 | +0.172 | 2.135 |
| day | AB | 15.288 / 15.117 | -0.171 | 0.951 |
| night | AA | 16.001 / 15.919 | -0.082 | 1.209 |
| night | AB | 15.755 / 16.304 | +0.548 | 1.667 |

`summary.json` conserva medias individuales y diferencias por ciclo; `repeatability.json` mantiene muestras crudas. El rango es descriptivo, no un intervalo de confianza ni un umbral estadistico universal.

## Consecuencia para el experimento

El control identico presenta variacion material. La repeticion de 128 frente a 192 cambia la direccion del resultado diurno respecto al pase anterior. Por tanto, aquel pase no establece que 128 sea intrinsecamente mas lento; tampoco esta ronda prueba un ahorro estable. Mantener ambos como opciones QA, sin promover la reduccion como optimizacion. No descartar una mejora visual solo por una diferencia pequena de un unico ABBA ni aprobar rendimiento a partir del numero de triangulos.

En el siguiente ensayo se conservaran cantidad, camara y modelo y se aislara la recepcion de sombras del material de las matas, con A/A y orden inverso. La forma/distribucion arqueada sigue siendo candidata; falta cerrar su integracion y los restantes biomas. No hay calidad global conseguida ni presupuesto acumulado aprobado.

Reproduccion: servidor 5190, WG_CAMPAIGN_TARGET_OFFSET=50,30 y `node tools/experiments/measure-grass-repeatability.mjs`. WG_GRASS_BIOMES y WG_GRASS_OUTPUT permiten seleccionar otra campaña/destino. Comparacion visual previa: [128 frente a 192](../grass-budget128/README.md); recorrido real: [grass traversal](../grass-traversal/README.md).
