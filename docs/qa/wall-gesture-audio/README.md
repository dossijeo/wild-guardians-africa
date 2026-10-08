# SFX 094/095 — gesto visual de muralla

SFX original 094 `spirit_drag`: una solicitud al superar el umbral existente de
8 px y tener al menos dos muestras, sin disparos por cada movimiento. SFX 095
`spirit_drop`: una solicitud al soltar un trazo, antes de resolver sus bloques;
describe soltar la previsualización, no cobrar ni confirmar una construcción.
El error 107 y el sonido de construcción conservan sus condiciones independientes.

El arrastre audible se detiene al soltar, cancelar, pasar a dos dedos, desactivar
el modo, cambiar de escena o desechar el controlador. Las solicitudes pendientes
caducan a los 500 ms y quedan invalidadas por el siguiente gesto o reset. Un tap
es silencioso. Los fallos de audio no impiden entregar la curva. Durante el trazo
se añade solo una comprobación constante de umbral, sin consultas de terreno,
colisiones, saldo ni tareas nuevas; estas siguen resolviéndose al soltar.

101 pruebas dirigidas pasan: gestos, audio de UI, lifecycle/buses, routing/Opus,
feedback de release y construcción. Incluyen 300 movimientos con un único
arrastre, cancelación/multitouch/desactivación/disposal, cargas tardías y fallo
de dispositivo, preservando la curva completa y el momento de las consultas.
Los 126 originales conservan sus bytes; la matriz vigente pasa a 99 asignados y
27 reservas. Routing original y Opus se regeneraron con el pipeline existente y
`verify_sfx_runtime` valida hashes, muestras y decisiones equivalentes.

Prueba nativa en IAB (`tests/browser/wall-gesture-audio.html`): AudioSystem/Opus,
UiAudio y WallDrawing reales, contexto `running`; gesto de ratón 100,300→560,340
con nueve muestras crea exactamente 094/095, aceptados, bus UI y playbackRate 1.
El tap posterior no crea otra solicitud; cero voces residuales y cero errores.
Evidencia `native-report.json` y `native.png`. La fixture no ejecuta Game ni
WebGL: no demuestra gameplay completo, escucha física móvil ni frametime.

Build y verificación del paquete se registran en `receipt.json`. No se cambia
geometría, reglas, navegación, guardado ni activación de FrontSide.
