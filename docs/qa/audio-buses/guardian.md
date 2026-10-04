# Presencia sonora del Espíritu original

`spirit_appear` y `spirit_disappear` son usos de gameplay previstos en A.13 del
Plan. Ahora consumen las fases realmente dibujadas por `NativeGuardian`, con
el retrato, malla, física, poses y tiempos existentes del Guardian V8.
La capa de audio no crea un Espíritu físico dentro del mundo ni modifica
mensajes, pagos, reglas de magia o duración de las transiciones.

La aparición se reproduce una vez al entrar el retrato. Un cambio de texto,
traducción, gesto, tamaño o un nuevo fotograma no vuelve a dispararla. Si la
imagen termina de cargar después de la introducción, su primera presencia
dibujada durante lectura también tiene una entrada. La desaparición se
reproduce al empezar el `outro`, después de la despedida original.

El cierre normal del retrato **no corta los 2,48 s de la desaparición**, incluido
su detalle final aprobado. Una reapertura sustituye la retirada por la nueva
entrada; ocultación inmediata, suspensión del contexto, eliminación del avatar
o salida de partida invalidan las fuentes y decodificaciones anteriores.
Después de suspensión se inicializa silenciosamente la primera fase observada.

Ambas tomas conservan bytes originales, duración y playbackRate 1. Usan el
bus UI, emisor `guardian-avatar` y familia `spirit-presence`, dentro de los
límites compartidos de SFX. No se inventa una posición 3D para el retrato.
Las solicitudes pendientes caducan a los 0,5 s del reloj AudioContext; un fallo
de audio no impide el gesto ni provoca reintentos en cada fotograma.

## Evidencia y límites

Las **261 pruebas dirigidas de audio, SFX, música y Guardian** pasan sin fallos
ni omisiones (2.982,72 ms). Los casos nuevos cubren entrada/salida con los dos
modos de movimiento, cambio de mensajes, carga tardía de imagen, cola completa
tras cierre, reapertura, ocultación inmediata, suspensión, vencimiento,
limpieza, fallo de reproducción y bus/emisor. Las rutas verifican los 126 MP3
contra los hashes originales, incluidos los aprobados 021/022.

[`guardian-native.json`](guardian-native.json) registra una prueba WebAudio con
el `NativeGuardian` real y sus ocho gestos, sin sustituir sus transiciones por
un doble. Se aceptan tres fuentes: aparición completa, desaparición completa
y una reentrada cancelada deliberadamente por ocultación inmediata. Las dos
tomas son estéreo, decodificadas a 48 kHz de contexto, con velocidad 1 y sus
duraciones originales de 1,6 y 2,48 s. El contexto termina cerrado, con cero
fuentes y cero errores.

La desaparición comienza en AudioContext 55,272 s y termina naturalmente en
57,752 s: **2,480 s**. El retrato ya estaba cerrado en 56,192 s, y el diagnóstico
comprueba que su fuente seguía viva en ese instante. La tercera fuente termina
anticipadamente como consecuencia de la ocultación inmediata explícita; no se
presenta ese caso como reproducción natural completa.

La captura [`guardian-entry-native.png`](guardian-entry-native.png) documenta
el retrato original visible. [`guardian-native.png`](guardian-native.png)
documenta el resultado final. La selección de los ocho identificadores prueba
su conservación al cambiar mensajes; no es una nueva comparación visual de
todas sus curvas con el lab, ya auditadas anteriormente y sin cambios aquí.

La compilación pasa en 6,66 s. El paquete web pasa con 578 archivos,
406.697.987 bytes, 816 enlaces relativos y 20 GLB de ejecución.
El CI independiente de las voces de trabajadores `1a55129` termina correctamente;
esa ejecución no se atribuye a esta modificación. El nuevo commit tendrá su
propia suite completa, verificadores y paquete itch en GitHub.

La prueba precarga los MP3 y silencia la salida. No acredita escucha subjetiva,
red fría, mezcla con trabajadores/bestias en el mundo 3D ni rendimiento móvil.
El inventario actual es **75 conectadas / 51 reservadas**. Las alternativas de
selección, arrastre, preparación de magia y otros gestos no se añaden
automáticamente a todas las interacciones; el alcance pendiente de usos
compatibles y mezcla sigue abierto.
