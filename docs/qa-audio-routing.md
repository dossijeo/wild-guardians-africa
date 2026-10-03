# SFX: rutas, identidad y voces concurrentes

Implementación `bf6b3c8`, visor WebAudio `362829c`.
[13 pruebas dirigidas](qa/audio-routing/directed.txt): cero fallos/omisiones,
3246,7622 ms. No se presenta una prueba de nodos silenciados como evaluación
perceptiva de la mezcla ni como medición de rendimiento en una finca grande.

## QA-152: 126 destinos o reservas explícitos

public/content/sfx-routing.json registra los 126 IDs, números, filenames y hashes:
20 clips conectados mediante eventSound (21 tipos de evento, dos comparten build_place)
y 106 reservas explícitas conservadas para la Biblioteca. Cada reserva dice que
su emisor dedicado de gameplay todavía no está conectado y mantiene el disparador
propuesto del plan. No se borran tomas ni se afirman 126 disparadores en partida.
La prueba coteja cada ruta con el banco runtime y el catálogo original del plan,
y lee todos los MP3: tamaño y SHA-256 byte por byte coinciden.

Las asignaciones finales aprobadas se conservan literalmente:

| Número | ID / filename | SHA-256 |
| --- | --- | --- |
| 021 | farm_watering_can / 021_farm_watering_can.mp3 | 932df6a774847cf39bc2de324f6b8db4abea41eedfcf575a4caa5ddb91bf1290 |
| 022 | farm_water_soil / 022_farm_water_soil.mp3 | 5c554b7ec30d174fec8becafcfa44472d1c6e65f0522a90dc643a876d4896381 |

Se compara contra el catálogo final, no se intenta corregir nombres usando el
orden de un ZIP anterior. [Verificador de assets](qa/audio-routing/assets.txt):
23 fuentes, 484 recursos y 126 SFX exactos; también conserva los 48 clips de trabajo.

## QA-153: un evento, un clip seleccionado

El opening real con olderMale produce una cosecha pagada, recogida y entregada.
Procesar dos veces su historial elige eco_crop_sold una sola vez, no todos los
sonidos genéricos/específicos de economía. serialize completo antes/después no
cambia: incluye saldo, ledger, RNG y estado de la cosecha.

Cinco ensayos adicionales generan una incursión real, con Navigation, centro
pagado y cada especie (facóquero, hiena, búfalo, león, rinoceronte). Se avanza
hasta el primer StructureHit físico, se comprueba HP inferior a 600 y un solo
evento de golpe. Procesar su historial dos veces reproduce beast_hit_structure
una vez y conserva el serialize completo. Las vocalizaciones específicas no se
superponen indiscriminadamente; sus rutas dedicadas siguen reservadas.
La prueba usa dobles de WebAudio para registrar fuentes, sobre eventos reales del
dominio. No acredita diferencias perceptivas entre vocalizaciones reservadas.

## Límites de reproducción y prioridades

La comprobación antigua active.length<20 ocurría antes de await decode; muchas
peticiones simultáneas podían comprobar el mismo contador y arrancar después.
Ahora la admisión ocurre justo antes de crear/iniciar la fuente. Hay un límite
técnico de 20 SFX y cuatro por ID de clip. Un aviso de ataque/incapacitación tiene
prioridad 3 y victoria/derrota 4; cues del Espíritu y fin de ataque 2; rutina 1.
Al saturar, solo una voz de prioridad mayor reemplaza la de menor prioridad más
antigua. Los stems musicales mantienen su reloj compartido, no consumen esos
cupos SFX y se desconectan junto con sus gain nodes al parar. La finalización
natural y stop comparten liberación idempotente.

Estos valores son configuración de presentación, no balance de gameplay ni
resultado de una escucha comparativa. La limitación por emisor independiente,
mezcla auditiva integrada y concurrencia de partículas siguen pendientes de QA-155.

El visor tests/browser/audio-voices.html usa AudioContext y decodeAudioData reales,
con volumen cero explícito. [Datos observados](qa/audio-routing/web-audio.json):
100 solicitudes del mismo clip admiten 4; 100 solicitudes de familias distintas
admiten 20. Ataque y victoria entran al saturar sin superar 20, reemplazando rutina;
todos los playbackRate permanecen 1. stop termina con cero fuentes registradas.
[Captura](qa/audio-routing/web-audio.png) y [consola](qa/audio-routing/console.json):
sin errores/advertencias registrados. No prueba la percepción del tono ni la
cadencia de campaña a ×1/×5: QA-154 conserva su estado pendiente.

## Validación y trabajo pendiente

[Build](qa/audio-routing/build.txt) correcto en 4,08 s, conserva aviso de bundle
mayor de 500 kB. [Paquete web](qa/audio-routing/package.txt): 555 archivos,
379761096 bytes, 794 enlaces relativos y 20 GLB runtime. Solo se añadió el
manifiesto de rutas; no se duplicaron audios originales.

QA-152/153 quedan verificados en el alcance descrito; QA-155 queda parcial.
QA-154 (comparación real ×1/×5) y QA-156 (política musical nativa A/B) siguen
pendientes. El cambio comparte limpieza de nodos musicales, pero no introduce
ni acredita las rutas por secciones, saltos o alternancia del lab musical.
La CI de postgame `5905049` aprobó; las nuevas CI de audio se ejecutan tras el push.
