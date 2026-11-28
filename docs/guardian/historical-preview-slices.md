# Subintervalos históricos observados

`sliceHistoricalPreview(preview,start,end)` devuelve una copia de la observación o `null`. Exige extremos coincidentes con muestras de todos los actores, segmentos de trayectoria que no crucen los cortes, muestras de hiena alineadas y clock segments completos. No interpola posiciones ni inventa estados; conserva y recorta los segmentos originales, construye los extremos con las muestras y divide la duración real según la tasa observada.

Rechaza cambios de roster, mundo, terreno, actividad o muestras físicas y cualquier motivo de bloqueo distinto de eventos y presentación todavía sin certificar. Exige evidencia espacial y de separación del intervalo completo; para el corte vuelve a comprobar separación, incluidos solapes iniciales, antes de conservar la evidencia derivada. El resultado no es un certificado y conserva los motivos originales. El pump solo puede levantar la barrera de eventos después de validar los sublímites y sus consecuencias.

La superficie proporciona soporte de terreno para una traza completa o para un slice, con una caché acotada por secuencia, extremos y traza exacta. Cada reutilización verifica el lease `valid()` original del terreno; un certificado clonado con la misma traza conserva identidad del soporte. El cálculo no autoriza reproducción ni suprime las demás comprobaciones de los participantes.

Pruebas: `node --test tests/slice-historical-preview.test.js tests/historical-preview-support.test.js`. La integración del pump y las pruebas con Worker y GPU reales son responsabilidad separada; no se presupone que un corte válido haga reproducible una partida.
