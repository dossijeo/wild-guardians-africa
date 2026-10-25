# Filtro de sombras con nueve muestras en disco

Piloto QA para Sabana, Gran Rio y Gran Canon. Amplia el filtro del receptor del suelo de una rejilla de 1,15 texeles a nueve posiciones irregulares dentro de un radio de 3 texeles. Conserva nueve consultas al mismo mapa, compensacion de profundidad, emisores, geometria, luz y paletas. No cambia edificios ni agua.

## Evidencia visual

24 capturas reales de campana, semilla 712, calidad media, dos camaras y dia/noche. Las doce parejas coinciden en camara, objetivo, hora, dia y poblacion; cero errores de captura. Auditoria en comparison-audit.json. Cero draw calls/triangulos adicionales; variacion de texturas entre cargas 0/-7/-12 no atribuible al piloto, que no crea recursos.

- Sabana: [antes](sabana-base-low-day.png), [despues](sabana-candidate-low-day.png).
- Gran Rio: [antes](gran-rio-base-low-day.png), [despues](gran-rio-candidate-low-day.png).
- Canon: [antes](gran-canon-base-overview-day.png), [despues](gran-canon-candidate-overview-day.png).
- Noche de Canon: [antes](gran-canon-base-overview-night.png), [despues](gran-canon-candidate-overview-night.png).

Los bordes quedan mas suaves, especialmente sobre el claro del poblado. El aporte al volumen general es pequeno: no crea relieve ni resuelve cobertura vegetal o apoyo de plantas. La referencia de Sabana sigue requiriendo masas de hierba y contacto mas convincente.

## Rendimiento

ABBA por bioma y fase en una pagina, 30 cuadros de calentamiento y 180 muestras por bloque: 24 bloques. Incluye programas de terreno y horizonte, sin cambiar cache de sombras. Es una escena QA estatica, no rendimiento de campana en movimiento.

| Caso | Fase | Base GPU ms | Disco GPU ms | Diferencia |
|---|---|---:|---:|---:|
| 1 | day | 16.564 | 16.608 | +0.044 |
| 1 | night | 17.680 | 17.776 | +0.096 |
| 6 | day | 13.226 | 13.787 | +0.561 |
| 6 | night | 14.177 | 14.095 | -0.083 |
| 21 | day | 11.364 | 11.785 | +0.421 |
| 21 | night | 12.433 | 12.679 | +0.246 |

Datos completos en paired.json. Hay deriva entre bloques; diferencias negativas no prueban mejora temporal. La primera pagina registra el 404 de favicon ya identificado en el pase anterior; los informes de rendering no contienen errores.

## Decision

No integrar. La mejora localizada no justifica aprobar un cambio global con esta variacion de coste; Gran Rio diurno excede +0,5 ms en esta ronda. Conservar capturas y codigo como investigacion. Antes de reconsiderar hacen falta recorrido en movimiento y calidad baja/alta: el radio en texeles cambia su tamano en metros con la resolucion y nueve muestras mas separadas pueden exponer patrones. No extrapolar estas capturas a otros biomas ni a todos los receptores.

La prioridad vuelve a vegetacion 3D y contacto local: no repetir simplemente un radio aun mayor. No cambia runtime, simulacion, navegacion, balance ni siluetas. Reproducir con WG_GRASS_STUDY=ground-shadow-disk y capture-campaign-grass.mjs; medir con WG_MATERIAL_STUDY=ground-shadow-disk, WG_PAIR_CASES=1,6,21 y benchmark-material-study.mjs.
