# Variacion amplia de color del suelo: no integrada

Hipotesis: variar la paleta a escala amplia permite separar zonas del tapiz conservando las fibras y los normales existentes. Piloto QA en Sabana, Gran Rio y Gran Canon: dos ruidos espaciales estables respecto al origen, frecuencias 0,045 y 0,12 por metro, mezclados 75/25. Matiz seco/verdoso en Sabana y Rio, arena/ocre en Canon. La pendiente atenúa el tinte; paredes, geometria y simulacion permanecen sin cambios. No se crean texturas ni geometria.

## Resultado

**Descartado.** Se aprecia cambio de tono, pero no una mejora clara del volumen. Sabana conserva fibras pero adquiere un matiz mas amarillo/verdoso; Rio cambia de cromatismo sin resolver la lectura de masas. En Canon el efecto sobre el suelo es pequeno y no mejora la pared. No confundir variacion cromatica con relieve. No se extiende a los otros tres biomas ni se combina con los pilotos descartados de normales o desenfoque.

24 capturas de campana real, semilla 712, calidad media, vegetacion lejana desactivada, dia 1, horas 150/350. Dos vistas elevadas con objetivo +50/+30 m respecto a la aldea. Reloj de materiales fijo y simulacion pausada. `comparison-audit.json` confirma 12 parejas con camara, objetivo, hora, calidad, estructuras y plantas identicos, sin errores de captura.

- [Sabana antes](sabana-base-settlement-day.png) / [despues](sabana-candidate-settlement-day.png).
- [Rio antes](gran-rio-base-settlement-day.png) / [despues](gran-rio-candidate-settlement-day.png).
- [Canon antes](gran-canon-base-overview-day.png) / [despues](gran-canon-candidate-overview-day.png).
- [Canon nocturno antes](gran-canon-base-overview-night.png) / [despues](gran-canon-candidate-overview-night.png).

## Medicion y limites

`paired.json`: fixture del renderer real, casos 1/6/21, ABBA por fase, 30 frames de calentamiento y 180 muestras por bloque. La alternancia incluye terreno y horizonte. La primera ejecucion se interrumpio al detectar que el selector del benchmark omitía el horizonte; `interrupted-unmatched-horizon.json` se conserva solo como registro invalido, no se usa para conclusiones. La ronda final se inicia tras cerrar ese navegador y corregir el selector.

El primer caso registra un 404 generico sin URL en la salida de consola; no se atribuye por suposicion. Las capturas de campana no registran errores. Los contadores de ultimo pase no son una medida completa de tiempo ni de todos los pases. Las diferencias temporales del fixture no aprueban presupuesto global, movimiento ni streaming. Los valores por bloque se conservan para no ocultar deriva.

Reproducir con `capture-campaign-grass.mjs`, WG_GRASS_STUDY=ground-palette-patches, WG_GRASS_BIOMES=sabana,gran-rio,gran-canon, WG_GRASS_VIEWS=settlement,overview, WG_CAMPAIGN_TARGET_OFFSET=50,30 y WG_GRASS_OUTPUT apuntando a este directorio. `benchmark-material-study.mjs` usa WG_MATERIAL_STUDY=ground-palette-patches y WG_PAIR_CASES=1,6,21. Auditar con `audit-campaign-material.py` y resumir con `summarize-material-benchmark.py`, ambos reciben el directorio como argumento.

Siguiente paso: evaluar conjuntamente las matas 3D arqueadas ya conservadas y la iluminacion global existente, con recorrido real y presupuesto de campana, antes de promoverlas al modo experimental. No seguir acumulando ajustes de material sin una ganancia perceptible. Mantener el perfil de Manglares fuera de esa promocion mientras no resuelva su coste/aporte. La calidad global de los seis mockups sigue pendiente.

| Bioma | Fase | GPU base / piloto (ms) | Diferencia |
|---|---|---:|---:|
| Sabana | day | 18.041 / 17.911 | -0.131 |
| Sabana | night | 18.789 / 19.698 | +0.908 |
| Gran Rio | day | 14.668 / 13.955 | -0.713 |
| Gran Rio | night | 15.224 / 14.694 | -0.530 |
| Gran Canon | day | 12.541 / 12.642 | +0.101 |
| Gran Canon | night | 13.866 / 13.795 | -0.071 |

Los valores negativos no demuestran aceleracion: hay deriva relevante entre bloques. Las 24 mediciones finales verifican camara estable y simulacion inalterada, sin errores internos del renderer. La decision de descarte es visual y no depende de interpretar esos valores como un ahorro.
