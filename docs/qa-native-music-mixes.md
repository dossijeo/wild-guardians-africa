# Mezclas originales de Gameplay A/B

Implementación `6d056f3`. Importadas las ocho recetas de ganancias de cada lab
original suministrado, conservando el orden s0–s9 y los balances relativos.
[Auditoría de las fuentes](qa/music-mixer/native-policy-audit.json) incluye nombres,
SHA-256, comparación exacta de los 160 valores y controles originales.

## Integración comprobada

- Día, noche y ataque seleccionan sus recetas propias mediante lectura del estado.
  Una incursión tiene prioridad sobre la hora; no modifica economía ni RNG.
- A usa 110 BPM y offset 1,437 s; B usa 108 BPM y offset 1,211 s, tal como aparece
  en su control del lab. B guarda 1,211111 en metadatos de navegación: aquí se
  conserva el control, sin presentar ambos valores como idénticos.
- Las transiciones cambian progresivamente una capa cada compás (mínimo fade+0,15),
  con fade de 2 s y cuantización al compás siguiente. Entran primero apoyos nuevos;
  los anchors s2/s4 quedan al final, como en los motores originales.
- Cambiar de mezcla no reinicia los stems. Diez fuentes usan el mismo reloj y
  playbackRate=1. La ganancia general previa safetyGain×0,45 se mantiene.
- La cola usa currentTime de WebAudio; no escala con el multiplicador de simulación.
  Al cambiar otra vez de escena sustituye las tareas pendientes, conservando las
  curvas ya iniciadas. Al salir limpia el mixer y las fuentes/ganancias de audio.

[26 pruebas dirigidas](qa/music-mixer/directed.txt) aprobadas, cero fallos,
cancelaciones u omisiones, 5608,0404 ms. Incluyen las regresiones de cargas tardías,
reintentos, prioridades de voces y eventos físicos/entrega de cosecha anteriores.
Las cuatro pruebas nuevas verifican rejillas independientes, ganancias, orden,
curvas completas, cambios interrumpidos, contexto suspendido, salida, alternancia
y lectura sin mutación. Los AudioParams de estas pruebas son dobles.

## WebAudio real

El visor tests/browser/music-mixer.html usa AudioSystem y los veinte MP3 nativos,
AudioContext y decodificación real, con salida silenciada. Sus controles públicos
cambian un estado de fixture; no abren ni guardan una partida de campaña.
Los datos de navegador registran A día → noche → ataque, después B ataque → noche,
sin superar diez fuentes activas; todas mantienen rate=1. Se comprueban las
amplitudes finales de las rampas, no solo que exista una programación pendiente.
La parada final deja cero fuentes y cero voces registradas.
Los datos y captura se conservan en qa/music-mixer; no se afirma validación auditiva.

## Trabajo restante de QA-156

QA-156 queda **parcial**, no verificado completamente. Falta importar y probar
el grafo horizontal de secciones, los tres enlaces candidatos registrados de cada
pack, la protección entre saltos, el preroll conjunto y el fundido global fin/inicio.
También faltan evolución automática, arreglos temporales y comparación auditiva.
Los labs califican sus enlaces como candidate_not_listening_validated; una prueba
de código no convierte esa condición en validación musical.

La selección A en días impares y B en pares permanece como decisión técnica
anterior de integración; los labs independientes no fijan una alternancia de campaña.
El bucle simple anterior también permanece hasta importar los decks/secciones.
Por ello no se afirma que este cambio reproduzca todavía todo el motor musical.

[Build](qa/music-mixer/build.txt) correcto en 4,43 s, aviso conocido de bundle grande.
[Paquete web](qa/music-mixer/package.txt): 555 archivos / 379764817 bytes,
794 enlaces relativos y 20 GLB runtime sin duplicados originales.
