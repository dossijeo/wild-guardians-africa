# Recorridos con la receta actual: Sabana y Gran Río

2026-10-25. Base Git: 9b46cfdbc; único cambio de esta comprobación en el harness de QA.

Los recorridos anteriores añadían `mountainBase=raised`. La receta de las capturas residentes no lo incluye. Se añade `WG_MOTION_RECIPE_EXACT=1` para omitir ese override, conservando el modo histórico por defecto. Estos recorridos usan los flags nativos de suelo fino de la receta actual, sin sustitución del código mediante respuestas HTTP.

## Evidencia

| Bioma | Frames diurnos / nocturnos | Avance de simulación diurno / nocturno |
|---|---:|---:|
| Sabana | 1036 / 881 | 39.578 / 55.714 s |
| Gran Río | 1142 / 953 | 39.644 / 55.931 s |

Ambos auditores de trayectoria y reproducción terminan correctamente. Cambian los trabajadores y los conjuntos de chunks. El recorrido de Gran Río tiene cero frames desviados y error horizontal máximo de 5.69e-14. La noche continúa el estado diurno: no es una comparación de estados idénticos día/noche.

Inspección visual: las hojas de contacto de Sabana fueron revisadas en el pase anterior. En esta continuación se inspeccionaron directamente day-4.png y night-4.png de Gran Río a 1280x720: cobertura continua, sombras diurnas, vegetación nocturna legible y suelo visible bajo el fondo arbolado. Esta inspección puntual no certifica todos los fotogramas ni elimina posibles defectos durante transiciones.

## Reproducción

Ejecutar capture-horizon-raised-motion-20261023.mjs con WG_CURRENT_REVIEW=1, WG_MOTION_RECIPE_EXACT=1, WG_MOTION_SPARSE_GL=1, WG_COVER_QUALITY=media, WG_FIXTURE_BIOME=sabana o gran-rio y WG_REVIEW_OUT a un directorio nuevo. Auditar cada salida con audit-horizon-raised-motion-20261023.py.

Los JSON, capturas y vídeos están en sabana-exact-recipe-motion y gran-rio-exact-recipe-motion. EXACT-RECIPE-MOTION-PROVENANCE.json registra hashes de los archivos existentes, incluidos vídeos locales.

## Límites

La grabación introduce sobrecoste: no inferir FPS de producción ni mejoras de rendimiento a partir del número de frames. Para costes residentes utilizar current-resident-cost. Hay frames con trabajo pendiente durante el streaming; no se afirma que las colas estén siempre vacías. No se han cambiado materiales, densidad, simulación ni cámara de producción. Los otros cuatro biomas conservan sus recorridos anteriores y sus limitaciones documentadas; no se presentan como nuevas ejecuciones de esta revisión.
