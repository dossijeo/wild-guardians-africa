# Relleno restringido a sombra proyectada

Iteración QA del 19 de octubre de 2026 sobre 27f08903. No activada en runtime.

La variante mezcla el relleno existente con la paleta de sombra del bioma únicamente según la oclusión solar ya calculada. Usa transición suave, sin otra consulta al mapa. Mantiene iluminación directa, normales, albedo y siluetas. Volcanes y Desierto son controles sin parche.

## Evidencia

48 PNG: seis biomas, dos variantes, cámara de fixture y baja, día (150) y noche (350), semilla 712, 1280×720, calidad media. `captures.json` contiene cámaras y recursos; `pixel-comparison.json` comprueba los 24 pares. Todas las cámaras y horas coinciden, recursos iguales y sin errores registrados tras la carga. El script de captura todavía no registra errores anteriores a la carga inicial: no interpretar esto como auditoría exhaustiva de arranque.

- Sabana: sombras amplias más legibles bajo árboles y muros; conserva el amarillo del suelo soleado. 12,33 % de píxeles cambia más de 3/255 en cámara de fixture diurna.
- Gran Río: mejor agrupación bajo las copas, aunque el tapiz sigue siendo demasiado uniforme y algunas plantas pequeñas se confunden con la sombra. 15,30 % cambia.
- Manglares: profundidad local algo mayor, sin resolver integración de bases ni costas. 5,59 % cambia.
- Cañón: objetos mejor apoyados (3,88 % cambia); NO corrige la ausencia de sombra proyectada por la pared del terreno. La vista amplia no basta para validar jugabilidad.
- Volcanes y Desierto: controles sin cambio perceptible. Volcanes en cámara baja difiere en un único canal hasta 2/255; no reclamar identidad binaria en esos pares.
- Las doce vistas nocturnas no tienen cambios superiores a 3/255; las ocho de los biomas modificados son exactamente iguales por píxel.

## Decisión provisional

Conservar como candidato de iluminación, pendiente del ABBA y de cámara normal transitable/streaming. No representa la calidad global de los mockups. No se añaden mapas, geometría ni draws en estas capturas; eso no prueba coste GPU nulo. Medición completada en `abba.json`; resultados y límite de aprobación abajo.

Siguiente experimento: incorporar terreno residente al pass solar existente para evaluar las sombras del relieve; medir fallos de caché con movimiento, no solo fixture estática. No mezclar esa prueba con el ABBA del relleno.

## ABBA completado

180 muestras por fase, dos repeticiones por variante. Medias de repeticiones (ms):

| Caso | Fase | GPU base → candidata | CPU envío base → candidata |
|---|---|---:|---:|
| 1 | day | 17.882 → 19.624 | 5.991 → 6.625 |
| 1 | night | 20.099 → 19.649 | 5.651 → 5.900 |
| 6 | day | 15.292 → 15.424 | 7.305 → 7.705 |
| 6 | night | 15.729 → 16.077 | 7.028 → 7.167 |
| 21 | day | 13.849 → 13.080 | 6.641 → 6.348 |
| 21 | night | 13.563 → 13.669 | 6.009 → 5.839 |

Sabana diurna supera el presupuesto de +0,5 ms en esta ronda, con una repetición candidata anormalmente lenta (21,53 frente a 17,72 ms). No se elimina esa muestra ni se aprueba rendimiento: repetir en un contexto más estable o con alternancia dentro de la misma página. Gran Río y Cañón no justifican extrapolar a los seis biomas. Mantener solo como candidato QA hasta resolver esta incertidumbre.
