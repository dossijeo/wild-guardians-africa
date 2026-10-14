# Primer intento: fallo técnico de residencia

El intento original completó las ocho campañas de entrenamiento y el primer
brazo de reserva en Manglares/123. Se detuvo en el primer día del candidato de
Desierto/909 con `SpatialChunkUnavailable`. El reporte
`100a96af92e9-cae8cec8c9a3e8af-desierto-909-3.json` conserva el estado
serializado y los recibos parciales. Ninguna derrota de juego se imputó.

Una reproducción aislada de un día con la misma semilla y genes situó el error
en `native-campaign-plots.mjs → valid()`: el bot comprobaba el camino de ida
desde el centro hasta una posible parcela. Ambos extremos estaban residentes
(`startRegions.unknown=false`, `endRegions.unknown=false`), pero la ruta nativa
seguía siendo inconclusa (`routeReason=native-graph`, `missing=[]`). El punto
intentado era `(93,-3)` desde `(87.955,0)`.

El explorador de parcelas ahora trata esa ruta como **incierta**, descarta la
parcela y continúa buscando otra ruta certificada por el motor. No planta en
posiciones inconclusas, no modifica navegación física ni reglas de economía.
Una prueba nativa de Desierto/909 verifica que completa una jornada y concilia
el ledger. La cohorte completa se recalculó en
[`../multi-biome-magic-3day-v2`](../multi-biome-magic-3day-v2) con hashes nuevos;
los reportes de ambos intentos se conservan separados.
