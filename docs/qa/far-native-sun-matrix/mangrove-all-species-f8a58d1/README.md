# Manglares: cuatro especies, doce rutas

Fuente `f8a58d1`, runtime equivalente a `5afd8e2`; solo documentación cambió. Semilla 712, Mapungubwe, calidad media, transición 120–160 m y bruma 30–300 m.

12/12 rutas (aproximación diurna, órbita nocturna y barrido lateral por especie) con estado idéntico, errores/WebGL 0 y descensos visibles/desconocidos/del objetivo 0. Se conservan los 1,805 descensos globales fuera del frustum individual y sus firmas en `complete.json.gz`.

`progress.png` captura una órbita en noche completa (`night=1`). La banda gris del suelo/fondo sigue siendo un límite visual abierto, con tramado perceptible a distancia. **No aceptación artística ni ganancia de FPS**: visor instrumentado y campañas CPU de fondo. El archivo de llegada no se conservó por un error de binding del REPL, sin reiniciar el ensayo; exportación terminal y trazas de las doce rutas intactas.

Estimados RGBA+mips del bioma activo: 42,67 MiB atlas + 5,33 MiB backdrop; no son RAM del driver. Pendientes otras calidades/inclinaciones y coste actualizado. OFF en gameplay normal.
