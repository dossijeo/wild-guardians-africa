# Generación de paisaje experimental fuera del hilo principal

La consulta de acacias y el relieve/paleta del visor procedural de Sabana se calculan en un worker de módulo. Un TerrainField compartido genera ambos; los tres buffers se transfieren, sin copia adicional de sus arrays. Una petición regional fija por carga; el worker se termina tanto al responder como al fallar/cancelar. No queda activo durante los frames del visor. Sigue fuera de gameplay y del bundle del juego.

El loader rechaza AbortSignal previo sin crear worker, cancela el activo y elimina listeners/handlers; respuestas tardías no se adjuntan. El visor registra su limpieza antes de empezar las esperas, incluyendo pagehide y terminación de worker. No se afirma cobertura completa de cancelación de las cargas previas de GLB/atlas; ese comportamiento existente queda pendiente.

## Evidencia

Nueve tests correctos, 1.772,85 ms: worker real de Node devuelve datos profundamente idénticos a la generación directa para la región completa del visor (112 árboles / 28.800 triángulos) y acredita buffers separados/detached con byteLength cero en el emisor. Pruebas del cliente con dobles cubren éxito único, abort previo/activo, respuesta tardía y fallos de construcción/envío/mensaje. Las pruebas de cancelación del cliente son unitarias; no se presentan como cancelación durante cálculo en navegador físico. Se mantienen tests de alturas/paleta/anclaje/distribución.

Dos cargas nativas, 1280×720: cálculo worker 456,8 / 450,5 ms, duración total de petición 495,3 / 509,6 ms. Durante la espera se entregan 31 / 32 callbacks RAF; mayor intervalo 23,9 / 17 ms. Preparación de malla + consulta de diferencias verticales en el hilo principal 5,6 / 7,5 ms. Misma población, geometría y error máximo de apoyo 0,070554. GL cero y consola vacía, captura native.png. La segunda muestra recoge el código final con limpieza registrada antes de esperar.

La duración total de carga no se ha reducido frente a la prueba síncrona anterior y estas cifras no son un benchmark controlado de throughput: se ha trasladado cálculo mientras el navegador sigue atendiendo frames. No acreditan FPS de gameplay, RAM, móvil, primera subida GPU o eliminación de todos los tirones. RAF durante espera no incluye la creación posterior de materiales ni el primer render. Los procesos de campañas largas 20608/43068 seguían vivos.

Build correcto, 208 módulos / 9,81 s, con mismo bundle del juego; aviso habitual >500 kB. Fuentes congeladas/hashes y resultados incluidos. Pendientes colas/streaming acotado, regiones móviles con cancelación y epochs, chunks reales/preparación 3D, bruma/iluminación/agua y validación visual y de rendimiento completa antes de integrar.
