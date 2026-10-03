# Audio: salida de escena y recuperación

Implementación `e26deed`. [22 pruebas dirigidas](qa/audio-lifecycle/directed.txt),
cero fallos, cancelaciones u omisiones, 3092,0556 ms. Incluyen la auditoría de rutas
y golpes/entrega reales anterior, más nueve comprobaciones de cargas y recuperación.

## Cambios

- menu captura la generación antes de unlock y después de su propio stop. Si se
  abandona la escena durante unlock o JSON, no puede detener la escena siguiente
  ni decodificar/iniciar música del menú antiguo.
- Una carga antigua del pack A no puede iniciar sus stems ni detener un B posterior,
  incluso cuando A falla después de que B esté reproduciéndose.
- Los fallos de red y decodeAudioData se retiran de la caché solo si la entrada
  sigue perteneciendo a esa petición. Los buffers válidos continúan compartidos.
- El catálogo SFX comparte una única carga pendiente entre peticiones simultáneas;
  un rechazo libera esa petición y permite reintentar.
- Un pack fallido deja de figurar como activo. Un fallo al arrancar parte de sus
  stems limpia fuentes y ganancias iniciadas; se puede reintentar el mismo día.
- Si la decodificación termina con el contexto suspendido, no se marca un pack
  inaudible como reproduciéndose. El siguiente intento con contexto running arranca.
- El listener de gesto de la aplicación atiende también gestos posteriores. Una
  denegación inicial de resume no consume para siempre la posibilidad de desbloquear.
  La prueba de rechazo de resume es controlada mediante un doble de AudioContext;
  no se afirma haber provocado una denegación real de permisos del navegador.

Se mantienen los límites y prioridades anteriores y playbackRate=1. No se introduce
una nueva política de secciones o mezcla de A/B; QA-156 sigue pendiente.

## Pruebas de lifecycle

Los dobles verifican desbloqueo/JSON tardío, A tardío exitoso o rechazado tras B,
red fallida compartida entre diez peticiones, decodificación fallida y reintento,
catálogo fallido compartido, fallo parcial de arranque de stems, suspensión durante
decode y veinte ciclos de entrada/salida. Los veinte ciclos terminan sin fuentes
ni gain nodes de voces pendientes, y sus fuentes constan paradas/desconectadas.
Los buses persistentes de la aplicación se reutilizan; no se pretende cerrarlos
al volver al menú. Estas pruebas no auditan WebGL, DOM listeners o timers.

## WebAudio real

El visor tests/browser/audio-recovery.html usa AudioSystem de producción,
AudioContext y decodeAudioData nativos, con salida silenciada y adaptador de
recursos para inyectar el fallo y retrasar únicamente el JSON del menú.
La primera petición a un recurso deliberadamente inexistente devuelve HTTP 404,
con Accept: audio/mpeg para evitar el fallback HTML del servidor Vite.
[Datos finales](qa/audio-lifecycle/native-recovery.json):

- Tras el 404: cero fuentes, sin promesa fallida cacheada, contexto running.
- Segundo intento del mismo clip: aceptado, una fuente, playbackRate=1, dos peticiones.
- Tras liberar el JSON de menú después de stop: cero fuentes y voces; no hace
  una tercera petición de audio.
- La excepción HTTP esperada se muestra como controlada; cero errores no controlados.

[Captura](qa/audio-lifecycle/native-recovery.png) y
[consola capturada](qa/audio-lifecycle/console.json).
La primera versión del visor solicitaba la ruta sin restringir Accept; Vite devolvió
su fallback y el decodificador rechazó datos no musicales. Ese intento también
recuperó el clip: [observación conservada](qa/audio-lifecycle/native-decoder-recovery.json).
No se describe esa primera observación como un HTTP 404 comprobado.

## Alcance y validación

QA-150 y QA-151 pasan a **parciales**: se verifica audio, no todavía la liberación
completa de renderer, listeners y timers en ciclos integrados, ni los fallos de
modelos, shaders, terreno u otros assets durante entrada en mundo. La fixture no
modifica archivos originales, no guarda partidas y no acredita evaluación auditiva.

[Build](qa/audio-lifecycle/build.txt) correcto en 4,03 s, con aviso conocido de
bundle de 500 kB. [Paquete web](qa/audio-lifecycle/package.txt): 555 archivos,
379761907 bytes, 794 enlaces relativos y 20 GLB runtime sin duplicados originales.
La CI de `362829c` aprobó; la CI de esta corrección se dispara al push.
