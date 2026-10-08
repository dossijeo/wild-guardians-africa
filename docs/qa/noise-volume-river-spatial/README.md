# Ruido fino: revisión espacial de Gran Río

QA nativa sobre main `33a76853`, Gran Río/Mapungubwe, seed 712, calidad media
y sombras. Fixture `/tests/browser/african-toon.html?case=6&noise-volume-single-exit=1`,
servidor Vite 5183. No cambia el shader de producción ni activa el candidato.

Sesenta grupos terminados: veinte vistas en día, transición y noche, cinco
fotogramas A1/A2/B1/B2/A3 por grupo. A y B son las ramas analítica y volumétrica
del mismo shader envuelto para QA. Diecisiete posiciones X=-160…160/Z=-64…64
cruzan origen y coordenadas negativas; las restantes miran centro, actores y
cultivos. Son posiciones discretas, no un recorrido continuo que acredite
ausencia de repetición o popping. El periodo común ponderado de pigmento de
1280 unidades tampoco queda recorrido por completo.

Framebuffer 1600×900. Dentro de cada grupo son iguales la matriz de cámara,
calls y triángulos. Elapsed permanece cero, hay un hash de estado por fase y
el estado lógico se restaura al terminar. Informe sin errores; siete warnings
ANGLE `f_environment4` conservados en `console.json`, sin errores de consola.
No prueban una variable realmente sin inicializar ni la causa de los píxeles
variables. El volumen R8 tiene 262144 bytes fuente; no es memoria GPU medida.

| Comparación | Grupos con diferencias RGB /60 | Máximo píxeles distintos | Máximo MAE local 16×16 | Máximo canal /255 |
| --- | --- | --- | --- | --- |
| A1/A2 | 43 | 49 | 0,005132 | 112 |
| B1/B2 | 41 | 20 | 0,003881 | 47 |
| A2/A3 | 40 | 55 | 0,004866 | 137 |
| A2/B1 | 48 | 104764 | 0,005918 | 80 |

Todas las comparaciones tienen cero diferencias alpha. La variación de controles
persiste en otro bioma: no atribuir todas las diferencias A/B al ruido ni inferir
aceptación por el MAE global. Estos son datos descriptivos, sin umbral de calidad
automático. No se han archivado los framebuffers completos; sí hashes por frame,
bounding boxes, métricas locales y las 300 muestras en `report.json.gz`.

Inspección de tres parejas de viewport 1280×720: terreno negativo de día,
cultivos/murallas al atardecer y cuatro trabajadores/cinco bestias de noche.
Se conservan colores generales y siluetas, sin un patrón nuevo evidente en
estas imágenes. La pareja de terreno es PNG idéntica; las otras tienen pequeñas
diferencias. Esto no demuestra que todos los materiales estén afectados ni
equivalencia visual de todos los encuadres, animaciones, destrucción o distancias.
Los actores de esta fixture conservan escala nativa 1. Las selecciones posteriores
al runner modifican explícitamente cámara/luz y no son nuevas comprobaciones de
igualdad de estado.

Siete tests dirigidos de volumen/métricas pasan. Verificar el archivo:
`node tools/verify_noise_spatial_archive.mjs docs/qa/noise-volume-river-spatial`.
El verificador comprueba integridad, composición de la matriz y datos registrados;
no aprueba imagen ni rendimiento. `receipt.json` vincula fuentes sin cambios
durante la exportación y SHA del main servido. Fuentes iniciales registradas
durante el runner; no se modificó ninguna fuente importada en esta ejecución.

Campañas CPU 20024/49032/41320/41304 confirmadas activas durante esta revisión.
Sin benchmark GPU/CPU ni afirmación de máquina inactiva; el ahorro de la
[finca avanzada anterior](../late-farm-noise-volume/README.md) es otra medición.
Mundo y pestaña 776 cerrados tras exportar. Pendientes causa de controles
variables, revisión continua de periodicidad, restantes biomas/culturas,
poses/daños, medición integrada y móvil físico antes de promover el candidato.
