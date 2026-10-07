# Revisión de radio durante actualización asíncrona del horizonte

Comparación del syncChunks real de main y de la rama de impostores, con el sistema lejano desactivado. NativeHorizon.update conserva la región anterior mientras su worker genera la nueva. La reproducción simula ese resultado pendiente, conserva el resto de las operaciones originales de syncChunks y observa el conjunto solicitado al chunkStream.

Alta → media: main conserva 49 chunks y límites ±168; la rama solicita 25 pero mantiene esos límites ±168. Media → alta: main conserva 25 chunks y límites ±120; la rama solicita 49 con esos mismos límites ±120. Por tanto, la región de chunks deja de corresponder al hueco/apron del horizonte adoptado. Puede producir terreno ausente o solapamiento, pero esta prueba no dibuja ni acredita esos artefactos visuales: prueba el desajuste lógico de planificación.

Causa localizada: se extrae cx/cz de visibleRegion devuelta por el horizonte pero range de requested en vez de la región adoptada. Debe preservarse la adopción conjunta cuando no hay compactación visual; distinguir también la configuración que conserva terreno y las variantes visuales/propias.

sources.json registra heads y hashes antes/después de la reproducción; result.json contiene las dos comparaciones. reproduction.txt.gz conserva el script ejecutado con sus rutas locales de importación (adaptarlas para otra máquina). El caso fue enviado al subagente para corregirlo y probar ambas direcciones antes de su PR. Esta evidencia conserva el fallo previo, sin certificar la corrección ni modificar el runtime de main.
