# Caché de altura del terreno para cultivos

Los cultivos mantienen su altura absoluta mientras pertenecen al mismo TerrainField
inmutable y conservan x/z. El lote recibe explícitamente esa identidad desde WorldScene;
los proveedores genéricos sin identidad siguen evaluándose cada actualización. Cambiar
terreno, coordenadas, objeto lógico cargado, especie o identificador reconstruye la entrada.
El origen gráfico, orden de slots, crecimiento y reloj no alteran la altura del terreno.
La caché es WeakMap de presentación y no escribe en el estado del juego.

## Regresión

21/21 pruebas pasan: subidas parciales, viento por uniforme, matrices, recarga de los
40 originales y 32 bridges nativos de ocho especies, navegación y supresiones. Las
pruebas nuevas comparan todos los buffers Float32 entre rutas cacheada/dinámica,
con crecimiento, cambios de especie/id, movimiento, reordenación y origen desplazado;
comprueban el cambio de campo, recarga y proveedores dinámicos. Compilación y paquete
web pasan (586 archivos, 839 enlaces relativos y 20 GLB de ejecución).

## CPU aislada

[Datos ABBA](cpu-abba.json): cuatro procesos secuenciales, 60 actualizaciones de
calentamiento y 600 medidas por cohorte/proceso, 600 cultivos. La geometría de cultivos
es sintética; la altura procede del TerrainField nativo Sabana/Mapungubwe, semilla 712.
Ambas variantes utilizan la misma implementación y caché de metadatos; la comparación
activa/desactiva únicamente la caché de alturas. Los hashes de presentación coinciden
exactamente en las cuatro series de cada cohorte.

| Cohorte | CPU dinámica media (ms) | CPU cacheada media (ms) |
| --- | ---: | ---: |
| Madura | 0,520 | 0,201 |
| Morph pausado | 0,381 | 0,144 |
| Creciendo | 0,484 | 0,240 |
| Crecimiento mixto | 0,777 | 0,347 |

Cada serie dinámica hace 360000 consultas durante las 600 muestras; las cacheadas
hacen cero después del calentamiento. Esto mide CPU del actualizador, no GPU, tiempo
de fotograma completo ni FPS móviles. La carga paralela de campañas puede influir en
los tiempos del equipo; los órdenes se intercalan para reducir ese sesgo.


## Escena completa de navegador

[Medidas nativas ABBA](native-large-farm-abba.json),
[captura](native-large-farm.png): Sabana/Mapungubwe, semilla 712, 600 cultivos originales
(75 por especie), 26 construcciones, 25 chunks, calidad media con sombras, viewport
1280×720 y framebuffer 1600×900. Crédito y checkpoint postcampaña QA explícitos;
las construcciones/semillas se pagan y el estado botánico se prepara con los métodos
nativos. No se presenta como economía de una campaña jugada.

La escena usa la misma implementación en las cuatro variantes y solo cambia la
identidad opcional de terreno recibida por el lote. Cada variante crea un lote nuevo,
calienta 30 fotogramas y mide 60. El tiempo CPU síncrono de world.render es:

| Serie | CPU render media (ms) | Consultas de suelo, incluidos 30 frames de calentamiento |
| --- | ---: | ---: |
| Dinámica A1 | 10,960 | 54000 |
| Cacheada B1 | 9,765 | 600 |
| Cacheada B2 | 9,840 | 600 |
| Dinámica A2 | 10,903 | 54000 |

La media de ambas órdenes pasa de 10,932 a 9,803 ms (~1,13 ms menos CPU). Las
600 instancias, sus posiciones (error máximo 0,000001619 unidades), ruta al poblado,
colisiones y snapshot se conservan. Todas las muestras registran 60 llamadas y
2429832 triángulos, 128 geometrías, 54 texturas y 18 programas. No hay errores de
fixture. Los intervalos de fotograma están registrados en bruto y dependen de
planificación/GPU (incluyen una muestra inicial corta en B1); no se interpreta la
reducción CPU como mejora proporcional de FPS ni como tiempo GPU medido.


[Recarga completa corregida](native-reload.json), [captura](native-reload.png):
las 600 instancias vuelven con el mismo error de posición, snapshot exacto y ruta
idéntica usando Navigation y WorldScene nuevos. La primera tentativa detectó un
defecto del fixture: creaba el segundo renderer en el canvas cuyo contexto había
sido perdido deliberadamente por dispose. Ahora reemplaza ese canvas antes de
reconstruir el mundo, como hace la pantalla de juego. El ensayo posterior termina
con errors=[]; la corrección no modifica la gestión de contexto de producción.

## Publicación

Cambio de ejecución y evidencia en main. No se publica una versión nueva en itch.io.
La CI anterior (ae49d28) terminó antes de ejecutar pasos porque GitHub no asignó
un runner hosted tras varios intentos; las comprobaciones locales arriba sí se
han ejecutado. Esto no se presenta como una aprobación de CI remota.
