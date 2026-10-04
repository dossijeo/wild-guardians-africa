# ActualizaciÃ³n CPU de cultivos

Referencia previa: `54ee5e9`. Se elimina la copia completa de cada planta en cada frame usando una pose temporal sÃ­ncrona con los campos de presentaciÃ³n necesarios. Una cachÃ© acotada a ocho muestras reutiliza recetas botÃ¡nicas cuando especie y progreso coinciden exactamente. No retiene plantas ni crece con el historial de cosechas. Las recetas, matrices, alturas, semillas, viento, UV, materiales y subidas parciales conservan su comportamiento.

`node tools/benchmark_crop_uploads.mjs 600 180` ejecuta el actualizador de producciÃ³n con 40 geometrÃ­as sintÃ©ticas de caja y 32 puentes, ocho especies, 600 plantas y capacidad 1024. Calienta 60 actualizaciones y mide 180 por escenario. El cuarto argumento opcional permite importar un mÃ³dulo de referencia local. La comparaciÃ³n previa se ejecutÃ³ con el mÃ³dulo de HEAD exportado a .cache y su import de rules ajustado a la URL del archivo original.

| Escenario | CPU p50 antes, ms | CPU p50 despuÃ©s, ms |
| --- | ---: | ---: |
| Maduras | 6,077 | 0,637 |
| Morph pausado | 5,954 | 0,258 |
| Crecimiento de una cohorte | 7,553 | 0,522 |
| Crecimiento con fases distintas | 7,604 | 0,374 |

Los cuatro hashes de matrices y atributos coinciden exactamente antes/despuÃ©s. Cada escenario mantiene 108000 consultas al suelo. Los casos estables mantienen tambiÃ©n sus versiones de buffers, incluso al cambiar el reloj del viento. Resultados completos en before.jsonl y after.jsonl; 22 pruebas de subida parcial, GLB nativo/restauraciÃ³n y origen grÃ¡fico pasan, ademÃ¡s de build.

El visor crop-native-reload.html mostrÃ³ las ocho especies y sus cuatro puentes al 50 % de morph (32 plantas, 32 lotes, cero errores). Guardar y reconstruir el renderer conservÃ³ el dominio y devolviÃ³ cero pÃ­xeles distintos en su comparaciÃ³n interna. native-restored.png y native-restored-ax.txt registran ese resultado. Es una prueba de restauraciÃ³n con el cÃ³digo optimizado, no una comparaciÃ³n visual entre revisiones ni una escena de finca completa.

Son dos ejecuciones secuenciales en Node con otras tareas activas, no una distribuciÃ³n estadÃ­stica ni una mediciÃ³n GPU. La geometrÃ­a sintÃ©tica aÃ­sla el trabajo CPU del actualizador; no demuestra FPS de finca completa, rendimiento de telÃ©fono fÃ­sico ni una mejora equivalente del frametime total. La medición de finca completa siguiente contrasta ese impacto en una escena nativa estática; sigue pendiente el caso con simulación y personajes activos.


## Comparación nativa de finca completa

`tests/browser/large-farm.html` incorpora Comparar CPU anterior/actual. La referencia QA `crop-batch-reference.js` es el código de `54ee5e9:src/rendering/crop-batch.js`, con solo el import de rules reubicado, un comentario de procedencia y finales de línea normalizados. No se importa en el juego ni se incluye en su build. El botón reemplaza únicamente el lote de cultivos, conserva capacidad, cámara, calidad, terreno, materiales y snapshot, y restaura producción al terminar incluso si hay un error. Ejecuta A1/B1/B2/A2, calentando 30 fotogramas y midiendo 60 por tramo.

La escena usa GLB y terreno reales: Sabana/Mapungubwe, 600 plantas de ocho especies, 26 estructuras, 25 chunks, calidad media, viewport 1280×720 y buffer 1600×900. Se mantienen el crédito y preparación botánica QA explícitos del fixture; no es una campaña ni una medición de trabajadores activos. No se pulsa guardar ni se modifica ninguna partida del usuario.

| Tramo | CPU render p50, ms | Intervalo frame p50, ms | Intervalo frame p95, ms |
| --- | ---: | ---: | ---: |
| Anterior A1 | 11,20 | 51,00 | 54,60 |
| Actual B1 | 11,60 | 50,90 | 55,00 |
| Actual B2 | 11,50 | 51,00 | 56,50 |
| Anterior A2 | 11,80 | 52,00 | 54,90 |

Resultado: **no se acredita mejora apreciable de frametime ni de CPU de render completo en esta escena**. Los ahorros del microbenchmark no justifican una promesa de FPS. Cada tramo conserva 600 plantas representadas, error de posición máximo 0,000001619 m, snapshot y ruta exactos, construcciones con colisión, 60 llamadas y 2429832 triángulos en el contador de la pasada final. Ese contador no suma todas las pasadas de render. Cero errores; muestras y diagnóstico completos en native-large-farm.json, captura en native-large-farm.png.

CPU render mide el tiempo síncrono de world.render, incluido envío/posibles esperas del driver; el intervalo RAF mide cadencia observada. No hay temporizador GPU ni aislamiento de otros procesos (la campaña intensiva continúa en paralelo). El resultado orienta a medir el coste de resolución, sombras y shader, pero no demuestra por sí solo cuál domina. La captura documenta el aspecto del mundo; no es una comparación de píxeles entre A y B.
