# Voces originales de trabajadores

Los cuatro MP3 del catálogo original se integran mediante `WorkerAudio`, un
observador de estados de la simulación sin nuevos comandos, hechos de dominio,
pagos ni llamadas al RNG:

| Original | Condición observada |
| --- | --- |
| `npc_acknowledge` | Nueva tarea asignada realmente al trabajador, en camino o empezando a actuar |
| `npc_work_effort` | Trabajo activo durante al menos 0,7 s observados; una toma por tarea y separación mínima de 12 s por trabajador |
| `npc_danger_react` | Transición a huida durante una incursión activa |
| `npc_flee_shout` | Huida que continúa 1,5 s después, con desplazamiento real y sin espera ante una puerta |

Las cadencias son decisiones técnicas de mezcla, no nuevas reglas de gameplay.
La rutina admite como máximo una petición de voz cada 2 s; las reacciones al
peligro, una cada segundo. Son ventanas compartidas entre trabajadores, además
de la familia común `worker-voice` limitada a cuatro voces, dos fuentes por
emisor y veinte SFX globales. Las oportunidades omitidas no forman una cola de
voces tardías. Las contrataciones, llegadas y paseos inactivos no provocan un
coro de acuses. Las tomas conservan los archivos aprobados y reproducción a 1.

Se utiliza el bus del mundo, distancia cuadrática y un alcance máximo de 36 m
respecto al punto de escucha. Ganancia de rutina 0,25 y reacción 0,45 antes de
atenuación. No se aplican las antiguas ganancias de escucha de los labs.

Una carga inicial, restauración, retroceso o salto de observación superior a
0,25 s inicializa silenciosamente el estado. No se reconstruyen reacciones
pasadas. Pausa, derrota/victoria, caída, incapacidad, desaparición, pérdida de
tarea, fin de huida, suspensión del contexto o salida invalidan las fuentes y
las decodificaciones pendientes. Estas últimas caducan tras 0,25 s del reloj
real de AudioContext. Las cadencias de actividad usan tiempo simulado.

## Validación y alcance

Las **227 pruebas dirigidas de audio, SFX y música** pasan sin fallos ni
omisiones (3.226,59 ms). Incluyen 22 pruebas del observador y dos pruebas nuevas
de integración: familia compartida entre las cuatro tomas, reproducción/bus
originales y suspensión durante decodificación. Las pruebas cubren el límite de
multitud, distancia, inmovilidad, puertas, cadencias, restauración, cambios de
estado, fallos de audio, todas las rutas y hashes byte a byte del banco original.

Cuatro pruebas con `Game.tick`, centro/semilla/trabajador pagados desde 1500
monedas y una incursión real de facóquero recorren asignación, trabajo y huida.
Comprueban explícitamente que el perfil contratado coincide con el solicitado
y que serializar antes/después del observador produce exactamente el mismo
estado de dominio.

[`worker-native.json`](worker-native.json) registra la ejecución en el navegador
de esa secuencia con los cuatro perfiles reales: **16 fuentes originales
aceptadas**, estéreo a 48 kHz de contexto, playbackRate 1, familia y emisor
correctos, cero voces al salir, contexto cerrado y cero errores. Los buffers
son los cuatro MP3 originales decodificados por WebAudio; el muestreo del
contexto no supone que se hayan convertido los archivos de producción.

Compilación Vite correcta en 6,26 s. Paquete web correcto: 578 archivos,
406.696.402 bytes, 816 enlaces relativos y 20 GLB de ejecución.
La ejecución completa local de 1374 pruebas pertenece a la revisión agrícola;
el CI independiente de `3983f68` también termina correctamente antes de esta
modificación. No se atribuyen esas ejecuciones a las voces nuevas. El CI del
nuevo commit ejecutará la suite completa, verificadores y paquete itch.

La prueba nativa precarga los cuatro clips, silencia la salida y utiliza
navegación dirigida sin obstáculos. No acredita escucha subjetiva, latencia de
red fría, mezcla en mundo 3D, colas reales con edificios ni rendimiento en un
teléfono. El fixture mixto se actualiza para llamar al observador y precargar
estos originales; el viejo tab 207 sigue sin resultado verificable y no se
reinterpreta como evidencia de esta versión.

Inventario actual: **73 rutas conectadas / 53 reservadas** de 126 originales.
El contador sigue siendo trazabilidad y no sustituye la auditoría de todos los
usos compatibles, alternativas justificadas y excepciones reales del Plan.
