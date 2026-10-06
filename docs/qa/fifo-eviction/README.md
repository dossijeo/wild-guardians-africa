# Expulsión FIFO con un iterador reutilizado

Referencia congelada: e95cc5e. Las cachés de altura (12000 entradas) y vecinos de navegación (4096) expulsaban la primera entrada mediante un iterador nuevo de Map en cada inserción. En flujos largos, un iterador nuevo vuelve a recorrer prefijos eliminados.

El cambio mantiene un cursor por Map en un WeakMap y lo avanza al expulsar. Conserva exactamente el orden FIFO, los valores, los límites y las invalidaciones existentes. Si el cursor se agota, se crea otro. No añade una cola auxiliar de claves ni conserva mapas antiguos mediante una colección fuerte. Actualizaciones, eliminaciones, clear y reinserciones conservan el comportamiento de Map.

Solo se aplica a las dos cachés citadas. No se incorpora la caché experimental de muestras de terreno: no demostró una mejora convincente. Las consultas de terreno, colisiones y tiempos de simulación permanecen iguales.

## Verificación

- 22 pruebas dirigidas, incluido un test de 25000 operaciones variadas y flujos de 30000 expulsiones con límites 256/4096/12000. Comparan cada clave expulsada y el orden de las entradas con la operación original; cubren mapas vacíos, clear y cursor agotado.
- 319 pruebas ampliadas aprobadas: geometría de terreno, comparación con el lab nativo, biomas, agua, lava, poblados, actores y navegación.
- Doce escenarios nativos: seis jornadas iniciales pagadas (2000 pasos por bioma) y seis incursiones de fincas pobladas (600 pasos por bioma). Estado completo idéntico en cada paso frente a la referencia. Los primeros usan Mapungubwe; los snapshots nocturnos tienen trabajadores en casa. No acreditan las treinta combinaciones ni una campaña completa.
- Streaming de nueve chunks por bioma, 54 en total: 228150 muestras Float64 de superficie idénticas; todas las instancias procedurales de vegetación coinciden. Se producen entre 9318 y 22500 expulsiones reales por bioma, con el mismo orden final de caché después de cada chunk. No modifica alturas, placement, densidad ni IDs de vegetación.
- Escenario integrado de estrés: 1630 pasos, 146 búsquedas y trayectoria serializada idéntica `9ea59d5816db79085aafff2ec796d4322ab680afde6209555befa8d0baf0fd54`. Su máximo tick sigue cerca de medio segundo; no se declara resuelto ese bloqueo.
- Benchmark aislado de expulsión e inserción: 30000 operaciones por muestra, diez muestras tras dos calentamientos y orden alternado. Medianas: límite 4096, 95.87→5.81 ms; 8192, 142.85→4.78 ms; 12000, 302.34→5.07 ms. El límite 8192 se incluye solo como diagnóstico, no corresponde a una nueva caché del juego. No es una medición de FPS, GPU o móvil.
- Build y paquete web aprobados: 586 archivos, 388057503 bytes, 859 enlaces relativos y veinte GLB de runtime.

## Reproducción y límites

`node tools/benchmark_fifo_eviction.mjs`; `node tools/check_fifo_terrain_stream.mjs <referencia-congelada>`; `node tools/check_navigation_query_reuse.mjs <referencia-congelada>`. La referencia contiene src, content y public/content de e95cc5e; sus 259 archivos fueron comprobados byte a byte contra los blobs Git. Incluye package.json con type module y las herramientas de apertura/carga integrada cuando se ejecutan esas comprobaciones.

El CI completo de la referencia e95cc5e terminó correctamente y se conserva su log comprimido con SHA-256. Esa ejecución es evidencia del baseline, no del cambio nuevo. Debe verificarse CI tras publicar el candidato.

Quedan pendientes las búsquedas únicas síncronas caras, la campaña intensiva de 100 noches, el rendimiento físico en móvil y la aceptación global del plan.
