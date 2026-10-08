# Reutilizar índices de tareas entre actualizaciones

Referencia congelada `08db8aa3`; candidato independiente cambia únicamente `findTask` para activar el `reuse:true` ya usado en cultivos/cajas. Producción añade además dos líneas explicando el contrato. No cambia FIFO, rutas, trabajo físico ni guardados.

Auditoría de `src`: encolar añade mediante push; completar, invalidar, destruir, rehacer al amanecer o interrumpir por ataque reemplazan el array. Los IDs son inmutables. La caché WeakMap comprueba identidad y longitud; una carga obtiene objetos independientes. Los campos workerId/blocked se leen del objeto vivo. No cubre renombrar IDs o sustituir un elemento en el mismo array sin cambiar longitud; no es una caché genérica para esas mutaciones.

## Evidencia

Dos recorridos AB/BA alternan por tick cuatro victorias históricas continuadas con contratación pagada y navegación nativa. Cada mundo ejecuta 150 ticks de calentamiento y 200 medidos, dt 0,1. Preparación, eventos, serialización y hash fuera del tiempo de tick. **72 checkpoints completos**, eventos y número de búsquedas coinciden. No acredita cien noches con balance actual ni el estado de la campaña viva de Gran Cañón.

| Finca / trabajadores | Total estable AB ref → candidato | Total estable BA ref → candidato |
| --- | ---: | ---: |
| Manglares / 18 | 479,61 → 447,14 ms | 497,79 → 468,06 ms |
| Gran Río / 47 | 879,55 → 882,63 ms | 839,60 → 838,36 ms |
| Sabana / 46 | 804,27 → 836,04 ms | 916,54 → 892,31 ms |
| Musgum / 112 | 3103,38 → 3022,10 ms | 2891,83 → 2776,51 ms |

Musgum reduce total 2,6/4,0 % y mediana 1,5/5,8 %. Manglares reduce total en ambos; Río/Sabana varían. No se afirma significación estadística, mejora general de FPS, GPU ni reducción del pico frío: el primer tick de Musgum cambia de 1593→1350 ms AB a 1263→1478 ms BA. Las campañas CPU 43808/49032 seguían vivas; suite/build se iniciaron después de medir.

Instrumentación independiente, sin usar sus tiempos como benchmark: cincuenta ticks Musgum, 5600 consultas de tareas por brazo, reconstrucciones **52→17**, entidades indexadas **55712→18229**. Las restantes colecciones conservan contadores; estado final hash idéntico `23999ce5e0dedb4e0b553deeadf3b0398bc6969dd92b1852fdb335cec3f53f26`, 142 búsquedas en ambos. El observador solo añade contadores, no toca RNG ni comandos. Se archiva separado de AB/BA.

75 pruebas dirigidas pasan: reservas, rutas laborales, cajas físicas, reconstrucción/restauración y límites económicos. Nueva regresión comprueba reservas vivas, sustitución de cola de igual longitud, objetos restaurados y altas después de consultar un ID ausente. Build y paquete web pasan (logs archivados): 701 archivos, 859 enlaces relativos y 20 GLBs runtime. La suite completa termina con 3139/3139 aprobadas, cero fallos/canceladas/omitidas (log archivado, sesión46954 exit0). Runtime y tests se comprobaron sin cambios frente a8ef6b9ce; los commits posteriores hasta registrar el resultado añaden evidencia/herramientas QA. No acredita la aceptación completa del proyecto.

## Reproducción

Extraer src/package.json de la referencia en una carpeta del repo, con dependencias compartidas:

```powershell
node tools/experiments/task-index-reuse.mjs <referencia> <nuevo-candidato>
node tools/benchmark_late_farm_terrain_height.mjs <referencia> <candidato> <AB.json>
node tools/benchmark_late_farm_terrain_height.mjs <referencia> <candidato> <BA.json> BA
node tools/experiments/instrument-worker-lookups.mjs <referencia> <nuevo-diagnostico>
node <nuevo-diagnostico>/tools/profile-lookups.mjs <salida.json> intensive-sabana-musgum-e461b550
node docs/qa/task-index-reuse/verify.mjs
```

El runner reutilizado mantiene su nombre histórico de terreno, pero aquí recibe el candidato de índices; no modifica terreno. Repetir los contadores con el candidato en otro destino nuevo. Manifest conserva hashes de 237 fuentes de referencia y las piezas comprimidas; el verificador acredita integridad/coherencia registrada, no vuelve a ejecutar gameplay.
