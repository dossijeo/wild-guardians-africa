# Paleta cálida: streaming y retirada reversible

Fuente del color: 1fc6bc3e6. Adaptador QA nuevo, no instalado por el arranque normal. Envuelve `AfricanToon.material` para los materiales del terreno del Cañón; preserva y restaura callbacks/cache keys. Añade un uniform de activación compartido. El horizonte y los materiales nuevos reciben el mismo parche. Los materiales dispuestos salen del registro mediante su evento dispose; no se recorre toda la escena cada frame.

## Recorrido real

Campaña, semilla712, calidad media, 1280×720, día150, tiempo visual congelado. Desplazamientos relativos Z 0/+144/−144/0; el tramo entre extremos es 288 m. Cambian las claves de chunks y al regresar se recupera el mismo conjunto (no su orden de inserción).

En cada posición: 25 materiales residentes y un material de horizonte, todos enlazados; registro estable en 26 bindings. Contador de callbacks compilados 7/14/21/27. Instalación idempotente comprobada. Cero errores de consola/página/HTTP registrados y glError=0. Tras retirar: método original restaurado, callbacks de materiales vivos restaurados por el adaptador y cero bindings. No se afirma ausencia de fugas en sesiones indefinidas.

[Auditoría](audit.json) · [Salida +144 m](step-1.webp) · [Salida −144 m](step-2.webp) · [Regreso activo](enabled.webp) · [Restaurado](restored.webp).

## Control de retorno

Desactivación por uniform frente a retirada del parche: tres píxeles difieren un nivel de canal. Antes del recorrido frente a después de retirarlo: 5.521 píxeles, delta máximo20. Se ejecutó otro recorrido sin instalar el adaptador: 5.522 píxeles, máximo20. Las imágenes finales de ambas ejecuciones difieren en tres píxeles. La diferencia mayor también aparece en el control y no puede asignarse al parche; no se aisló su causa exacta dentro de streaming/rasterización. No es igualdad exacta.

[Comparación de píxeles](pixel-comparison.json) · [Control de recorrido](roundtrip-control.json) · [Auditoría sin parche](control/audit.json) · [Imagen final de control](control/restored.webp).

## Alcance y decisión

Conservar el adaptador reversible para la revisión artística. Verifica binding y retirada de esta semilla/calidad/recorrido; no garantiza todos los chunks, perfiles, noches o construcciones. El color nocturno se evaluó en el ensayo anterior, no en este recorrido diurno. No añade texturas o geometría. No se ejecuta benchmark temporal nuevo dada la variabilidad previamente documentada; no se aprueba coste CPU/GPU ni se activa en producción. La mejora es cromática y el objetivo global de volumen/vegetación sigue abierto.

Reproducir: `node tools/experiments/check-canyon-warm-floor-streaming.mjs` y `node tools/experiments/check-canyon-warm-floor-control.mjs`, servidor5190. Imágenes publicadas convertidas sin pérdida. La primera versión del adaptador intentó iterar el registro interno no iterable de AfricanToon; se corrigió para recorrer las mallas residentes y la prueba completa se ejecutó desde una página nueva.
