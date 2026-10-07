# Retención de ventanas musicales durante transiciones

Base de producción `ee495d8`. El ensayo nativo de cosecha/colapsos registró
32 fuentes musicales y 74.876.928 bytes de PCM, frente a 16/37.438.464 en
el ensayo anterior. Sus informes no registraban los decks en el instante del
pico: no permiten atribuir retrospectivamente su causa exacta.

Se añaden cuatro sesiones dirigidas de transporte, pool y mixer de producción
con los tamaños y posiciones de los índices Opus actuales. Cada banco se
ejercita con navegación natural y con ramas registradas, alternando día,
noche, ataque y mezcla mínima. La semilla del mixer es 1729 y la de navegación
selecciona explícitamente ramas o continuidad. Se avanza en pasos de 0,1 s.

| Banco / navegación | Tiempo simulado | Pico PCM (bytes) | Fuentes en el pico | Decks en el pico | Wraps / saltos totales |
| --- | ---: | ---: | ---: | ---: | ---: |
| A / natural | 338,56 s | 67.713.408 | 30 | 2 | 3 / 3 |
| A / ramas | 338,56 s | 74.876.928 | 32 | 2 | 2 / 4 |
| B / natural | 399,76 s | 74.221.056 | 32 | 2 | 3 / 3 |
| B / ramas | 399,76 s | 74.876.928 | 32 | 2 | 0 / 4 |

El contador de saltos incluye wraps; una navegación con ramas puede evitar
el final del banco. Los casos naturales sí comprueban múltiples wraps completos.
En ambos casos de ramas, el máximo coincide con un salto registrado, dos
decks, 32 fuentes y 32 ventanas listas. Esto reproduce un pico equivalente
al nativo y demuestra que el transporte puede producirlo sin acumulación.

En cada paso se comprueba correspondencia entre fuentes activas y decks,
ausencia de PCM fuera de la demanda vigente y liberación de referencias tras
ended, incluso cuando stopVoice ya retiró la fuente del registro activo.
La memoria vuelve a bajar al terminar el solapamiento. Cada sesión comprueba
fase compartida y cierre final sin fuentes ni ventanas retenidas. El techo
dirigido deriva de las ventanas actuales/siguientes de dos decks y una posible
precarga de destino, no de un límite arbitrario elegido después del resultado.

`tests.log.gz` conserva 47 pruebas dirigidas correctas, incluidos los casos
existentes de descarga tardía, sincronización, cierre suspendido, mixer y
transportes. `results.json` recoge las cuatro trazas del pico; `provenance.json`
fija hashes de fuentes e índices.

No se cambia el runtime ni se declara ahorro de memoria. El contexto, decoder,
rangos codificados y callbacks nativos se simulan; se omite la reconstrucción
de paquetes Opus en estos cuatro casos. No demuestra reproducción perceptual,
GC/RAM física, comportamiento real de callbacks bajo carga ni la causa exacta
del pico histórico. La siguiente comprobación nativa debe registrar decks y
ventanas al alcanzar el máximo, además de medir RAM total y coste de decodificar.
