# Confirmación de obra e impacto contra trabajador

Los dos originales previstos en A.4/A.6 que faltaban se conectan a hechos
ya existentes; no se añaden cobros, daño, fases de obra ni nuevos encuentros:

| Original | Hechos de dominio |
| --- | --- |
| `build_complete` | `PlacementCommitted`, `WallChainBuilt`, `VillageFounded` |
| `beast_hit_character` | `WorkerHit`, `WorkerIncapacitated` |

La colocación conserva `build_place` y añade una confirmación de terminación
por **comando completo**, no por cada segmento o puerta automática. Fundar un
poblado tiene una sola confirmación. Son contacto y confirmación distintos;
ninguna reproducción realiza una segunda transacción.

La agresión conserva la respuesta existente `npc_hit` o `npc_fall` del
trabajador y añade un único contacto de bestia. La primera agresión y la que
incapacita emiten hechos distintos, cada uno con un contacto. El emisor de la
vocalización es el trabajador; el del contacto es la bestia. La familia común
`beast-worker-contact` conserva cuatro voces máximas y prioridad 2, dentro de
los límites de dos SFX por emisor y veinte globales. La confirmación usa la
familia `construction-complete`. Ambos originales permanecen en el bus mundo
y con velocidad 1.

Los hechos de construcción incluyen su ID real y posición capturada. Los de
agresión incluyen la posición del trabajador **antes** del empujón. Así, una
reproducción diferida no consulta una estructura nueva para un comando viejo,
ni sitúa el contacto en el final del desplazamiento forzado. Son metadatos de
presentación serializables; no cambian selección de objetivos, cuotas, dinero,
recuperación ni RNG. Guardados antiguos siguen siendo legibles y `remember`
omite sus sonidos históricos.

## Evidencia

La regresión dirigida ampliada pasa **318/318** pruebas en 221.877,36 ms,
incluyendo audio/SFX/música/Guardian, encuentros y expansión de poblados. Las
27 pruebas nuevas cubren centros pagados de las cinco culturas, una cadena
real de varios segmentos con navegación real, rechazo sin cobro, restauración
y los veinte pares de especie/perfil con huellas calibradas originales.
Las cinco expansiones de poblado existentes incorporan comprobación de una
sola confirmación, posición, emisor, cobro y estado inalterado por el audio.
Después de normalizar siete finales de línea del inventario se repiten **60/60**
pruebas de rutas/bytes, contactos y buses sobre el archivo final: pasan en
1.416,41 ms. No cambia ningún MP3 ni el contenido lógico del inventario.

[`committed-event-native.json`](committed-event-native.json) registra veinte
casos WebAudio con los cuatro perfiles contratados de verdad y las cinco
especies creadas mediante `spawnRaid`. Las construcciones se pagan desde
1500 monedas. Se aceptan **160 fuentes originales**, incluyendo cuarenta
confirmaciones de centro/tramo y cuarenta contactos; hay una vocalización de
golpe y una de incapacitación por trabajador. Las cinco culturas y materiales
de muralla están presentes. Se comprueba que las dos agresiones consumen
exactamente dos golpes de la cuota original, sin doble daño ni doble cobro.
Los cinco originales se decodifican en estéreo a 48 kHz del contexto,
playbackRate 1. Cada caso termina sin voces, el contexto final está cerrado y
no hay errores.

El primer intento del arnés nativo falló por no implementar `wallPlacement`
en su doble de navegación. Se añadió el método y la ejecución final completa
pasó; el fallo no se presenta como una prueba aprobada ni requirió un cambio
del navegador o de la navegación de producción.

Compilación final Vite correcta en 5,22 s. El paquete final pasa con 578
archivos, 816 enlaces relativos y veinte GLB de ejecución; su tamaño exacto se
registra en `committed-event-validation.json`. El commit anterior del Espíritu
es verde en CI37186373616 con 1426/1426 pruebas completas. Esa ejecución no se
atribuye a esta modificación; el nuevo commit tendrá su propio CI completo.

## Límites

El arnés precarga los MP3, silencia la salida y prepara explícitamente dos
fronteras de colisión física. Usa navegación sin obstáculos y no dibuja mundo
3D. Prueba emisión/admisión original y comportamiento de dominio en esos
contactos, no una incursión completa, pathfinding entre edificios, escucha,
latencia de red fría o rendimiento móvil. La navegación y fundación reales
tienen sus pruebas dirigidas independientes. El viejo fixture mixto sigue sin
resultado verificable; este ensayo no lo sustituye.

El inventario queda en **77 rutas conectadas / 49 reservadas**. Siguen abiertas
cinco filas previstas: viento fuerte, barro, madera, azada y desbloqueo. La
azada ya tiene una excepción documentada porque Plant/Water originales
ocultan la herramienta; no se inventa un trabajo Dig adicional. Las demás
filas aún necesitan integración o una excepción acreditada según el plan.
