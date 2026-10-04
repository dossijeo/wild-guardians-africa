# ActualizaciÃƒÂ³n CPU de cultivos

Referencia previa: `54ee5e9`. Se elimina la copia completa de cada planta en cada frame usando una pose temporal sÃƒÂ­ncrona con los campos de presentaciÃƒÂ³n necesarios. Una cachÃƒÂ© acotada a ocho muestras reutiliza recetas botÃƒÂ¡nicas cuando especie y progreso coinciden exactamente. No retiene plantas ni crece con el historial de cosechas. Las recetas, matrices, alturas, semillas, viento, UV, materiales y subidas parciales conservan su comportamiento.

`node tools/benchmark_crop_uploads.mjs 600 180` ejecuta el actualizador de producciÃƒÂ³n con 40 geometrÃƒÂ­as sintÃƒÂ©ticas de caja y 32 puentes, ocho especies, 600 plantas y capacidad 1024. Calienta 60 actualizaciones y mide 180 por escenario. El cuarto argumento opcional permite importar un mÃƒÂ³dulo de referencia local. La comparaciÃƒÂ³n previa se ejecutÃƒÂ³ con el mÃƒÂ³dulo de HEAD exportado a .cache y su import de rules ajustado a la URL del archivo original.

| Escenario | CPU p50 antes, ms | CPU p50 despuÃƒÂ©s, ms |
| --- | ---: | ---: |
| Maduras | 6,077 | 0,637 |
| Morph pausado | 5,954 | 0,258 |
| Crecimiento de una cohorte | 7,553 | 0,522 |
| Crecimiento con fases distintas | 7,604 | 0,374 |

Los cuatro hashes de matrices y atributos coinciden exactamente antes/despuÃƒÂ©s. Cada escenario mantiene 108000 consultas al suelo. Los casos estables mantienen tambiÃƒÂ©n sus versiones de buffers, incluso al cambiar el reloj del viento. Resultados completos en before.jsonl y after.jsonl; 22 pruebas de subida parcial, GLB nativo/restauraciÃƒÂ³n y origen grÃƒÂ¡fico pasan, ademÃƒÂ¡s de build.

El visor crop-native-reload.html mostrÃƒÂ³ las ocho especies y sus cuatro puentes al 50 % de morph (32 plantas, 32 lotes, cero errores). Guardar y reconstruir el renderer conservÃƒÂ³ el dominio y devolviÃƒÂ³ cero pÃƒÂ­xeles distintos en su comparaciÃƒÂ³n interna. native-restored.png y native-restored-ax.txt registran ese resultado. Es una prueba de restauraciÃƒÂ³n con el cÃƒÂ³digo optimizado, no una comparaciÃƒÂ³n visual entre revisiones ni una escena de finca completa.

Son dos ejecuciones secuenciales en Node con otras tareas activas, no una distribuciÃƒÂ³n estadÃƒÂ­stica ni una mediciÃƒÂ³n GPU. La geometrÃƒÂ­a sintÃƒÂ©tica aÃƒÂ­sla el trabajo CPU del actualizador; no demuestra FPS de finca completa, rendimiento de telÃƒÂ©fono fÃƒÂ­sico ni una mejora equivalente del frametime total. La mediciÃ³n de finca completa siguiente contrasta ese impacto en una escena nativa estÃ¡tica; sigue pendiente el caso con simulaciÃ³n y personajes activos.


## ComparaciÃ³n nativa de finca completa

`tests/browser/large-farm.html` incorpora Comparar CPU anterior/actual. La referencia QA `crop-batch-reference.js` es el cÃ³digo de `54ee5e9:src/rendering/crop-batch.js`, con solo el import de rules reubicado, un comentario de procedencia y finales de lÃ­nea normalizados. No se importa en el juego ni se incluye en su build. El botÃ³n reemplaza Ãºnicamente el lote de cultivos, conserva capacidad, cÃ¡mara, calidad, terreno, materiales y snapshot, y restaura producciÃ³n al terminar incluso si hay un error. Ejecuta A1/B1/B2/A2, calentando 30 fotogramas y midiendo 60 por tramo.

La escena usa GLB y terreno reales: Sabana/Mapungubwe, 600 plantas de ocho especies, 26 estructuras, 25 chunks, calidad media, viewport 1280Ã—720 y buffer 1600Ã—900. Se mantienen el crÃ©dito y preparaciÃ³n botÃ¡nica QA explÃ­citos del fixture; no es una campaÃ±a ni una mediciÃ³n de trabajadores activos. No se pulsa guardar ni se modifica ninguna partida del usuario.

| Tramo | CPU render p50, ms | Intervalo frame p50, ms | Intervalo frame p95, ms |
| --- | ---: | ---: | ---: |
| Anterior A1 | 11,20 | 51,00 | 54,60 |
| Actual B1 | 11,60 | 50,90 | 55,00 |
| Actual B2 | 11,50 | 51,00 | 56,50 |
| Anterior A2 | 11,80 | 52,00 | 54,90 |

Resultado: **no se acredita mejora apreciable de frametime ni de CPU de render completo en esta escena**. Los ahorros del microbenchmark no justifican una promesa de FPS. Cada tramo conserva 600 plantas representadas, error de posiciÃ³n mÃ¡ximo 0,000001619 m, snapshot y ruta exactos, construcciones con colisiÃ³n, 60 llamadas y 2429832 triÃ¡ngulos en el contador de la pasada final. Ese contador no suma todas las pasadas de render. Cero errores; muestras y diagnÃ³stico completos en native-large-farm.json, captura en native-large-farm.png.

CPU render mide el tiempo sÃ­ncrono de world.render, incluido envÃ­o/posibles esperas del driver; el intervalo RAF mide cadencia observada. No hay temporizador GPU ni aislamiento de otros procesos (la campaÃ±a intensiva continÃºa en paralelo). El resultado orienta a medir el coste de resoluciÃ³n, sombras y shader, pero no demuestra por sÃ­ solo cuÃ¡l domina. La captura documenta el aspecto del mundo; no es una comparaciÃ³n de pÃ­xeles entre A y B.


## Sensibilidad a resolución del mundo

El botón Comparar resolución del mundo utiliza `applyWorldResolution`, la misma función de producción que los ajustes del juego, sin cambiar calidad media, sombras, cámara, cultivo, estado ni chunks. Intercala Perfil A1 / DPR 1 B1 / DPR 1 B2 / Perfil A2, con 30 frames de calentamiento y 60 muestras por tramo; restaura el límite anterior al terminar. No guarda ajustes ni partidas.

| Tramo | Buffer | CPU render p50, ms | Intervalo frame p50, ms | Intervalo frame p95, ms |
| --- | --- | ---: | ---: | ---: |
| Perfil A1 | 1600×900 | 12,10 | 51,50 | 54,90 |
| DPR 1 B1 | 1280×720 | 12,20 | 43,30 | 46,40 |
| DPR 1 B2 | 1280×720 | 12,90 | 44,70 | 47,10 |
| Perfil A2 | 1600×900 | 12,30 | 51,40 | 53,80 |

La reducción de 36 % de píxeles del mundo mejora la cadencia observada unos 7–8 ms (13–16 % de la mediana), sin una disminución de CPU render apreciable. Los cuatro tramos mantienen 60 llamadas y 2429832 triángulos de la pasada final, 600 plantas representadas, posiciones, ruta, colisiones, snapshot y 25 chunks idénticos; sombras habilitadas y cero errores. Esto acredita sensibilidad al tamaño de imagen en esta escena, no tiempos GPU aislados ni un objetivo de FPS cumplido. La opción Ahorro existente conserva la nitidez de los elementos HTML y reduce la del mundo: es un intercambio visual, no una optimización con píxeles idénticos.

`native-large-farm-resolution.json` contiene diagnóstico y muestras; `native-large-farm-resolution.png` muestra el perfil restaurado y los controles QA, no la nitidez comparada de ambos modos. Pasan nueve pruebas de resolución/calidad/ajustes. Continúan los límites del caso estático, crédito QA, bioma/cultura únicos y otros procesos activos. No se modifica la resolución predeterminada del juego ni se presenta esta medición de ordenador como rendimiento de teléfono físico.
