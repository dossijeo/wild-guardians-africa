# Actividad física durante intervalos históricos

El lector de actividad de la autoridad consultaba `manager.baked.size`, aunque
las caídas precocinadas activas están en `manager.baked.entries`. Si solo había
una caída de ese tipo, podía comunicar erróneamente que el intervalo no tenía
física. Ahora comprueba tanto las entradas físicas como las precocinadas. Si el
registro no tiene la estructura esperada, la muestra queda incompleta y no se
certifica la reproducción autónoma.

Las pruebas usan el contenedor real de caídas y comprueban una caída que empieza
y termina dentro de un lote, además de datos incompletos. También pasan las
pruebas de captura y regresión de autoridad y recepción. Esto refuerza una
barrera de seguridad; no implementa aún reproducción temporal parcial durante
física activa ni demuestra una mejora de rendimiento o fluidez.
