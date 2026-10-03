# Permisos de murallas y atajos nativos

QA-084 **verificado**: pruebas de comandos y navegación, controles del HUD y
partida completa en navegador durante noche, incursión nocturna y diurna,
incluido un trazado preparado de día cuya confirmación se bloquea de noche.

El HUD original `Wild_Guardians_HUD_Lab_Contratacion_Diaria.html` define
1/2/3/4 como hogar/construir/cultivar/magia, H para enfocar el poblado y P para
abrir el menú. Estos atajos faltaban en la integración. Ahora pasan por el
`click()` del botón existente: usan su estado disabled, su handler y los
permisos del motor, sin emitir compras directamente. No funcionan dentro de
campos editables, diálogos bloqueantes, elementos inert, repeticiones o
combinaciones con Ctrl/Alt/Meta. Escape conserva su ruta existente. E/T del lab
son acciones de demostración y no se incorporan como comandos de campaña.

Los botones de construcción de un panel abierto se revisan en `updateUI`:
centro, murallas y materiales observan el mismo `permission()` que el motor;
los materiales también observan el saldo. La confirmación de un trazado ya
revalidaba los permisos y el trazado antes de cobrar, y continúa haciéndolo.
La cámara y la apertura de secciones del HUD siguen disponibles durante una
incursión; abrir una sección no autoriza construir.

Pasan **31/31 pruebas**, sin fallos, cancelaciones u omisiones, 10.387,6429 ms.
[Salida completa](qa/wall-permissions-directed.txt). Selección:

- `hud-shortcuts`, `build-permissions`, `wall-layout`, `wall-drawing`, `walls-native`.
- Noche, ataque diurno y ataque nocturno: muralla, puerta, preview y confirmación
  de un preview preparado de día se rechazan sin alterar el estado completo.
- Una ruta abierta de navegación se mantiene idéntica tras cada rechazo;
  no se añaden obstáculos que bloqueen el corredor del animal.
- Un panel abierto deshabilita los controles al cambiar hora, ataque o pausa,
  y los recupera cuando regresan los permisos; los costes se revisan de nuevo.
- Se conservan geometrías originales, cancelación de gestos, colapsos y reparaciones.

Los animales del ensayo de comandos son estados mínimos de prueba: no se
presentan como una incursión completa renderizada. Vite build pasa (5,59 s);
conserva el aviso de tamaño del bundle, que requiere una evaluación independiente.


El verificador del paquete web pasa: 559 archivos, 379.783.517 bytes, 796 enlaces
relativos y 20 GLB de runtime; sin duplicados originales.

## Integración completa en navegador sobre `086dd7a`

`tests/browser/wall-permissions.html` prepara únicamente slots QA en el origen
local 5180, con terreno/poblado Sabana/Mapungubwe original, semilla 712, crédito
QA explícito de 10000 monedas, centro (800), mijo (5) y mujer mayor (100)
pagados mediante comandos reales. Marca los mensajes de tutorial reconocidos
para aislar los permisos. El escenario de ataque llama a `spawnRaid` nativo;
no introduce un objeto animal mínimo. No modifica los slots de la campaña del usuario.

Se carga cada guardado desde Continuar en el menú original y se usa el HUD
de la partida completa con WorldScene, chunks, edificios y modelos nativos:

- «2» abre Construir de día (18:51), con centro y murallas habilitados. El
  mismo panel, sin cerrarlo, los deshabilita de noche (21:21). El guardado
  posterior conserva 9095 monedas y un centro, sin murallas.
  [DOM](qa/wall-permissions/sunset-panel.txt), [imagen](qa/wall-permissions/sunset.png),
  [snapshot](qa/wall-permissions/saved-sunset.json).
- La incursión nativa guardada a tiempo 310 se carga con facóquero activo.
  «2» abre Construir, con centro y murallas deshabilitados y aviso de incursión.
  «H» enfoca el poblado y «P» abre pausa. Tras salir guardando, el tiempo es
  331,4708 y el ataque sigue activo: ledger, commandIds y suppressed coinciden
  exactamente con la preparación; no existe ninguna muralla.
  [DOM](qa/wall-permissions/raid-panel.txt), [imagen](qa/wall-permissions/raid.png),
  [comparación](qa/wall-permissions/comparison.json), snapshots
  [inicial](qa/wall-permissions/prepared-raid.json) y [final](qa/wall-permissions/saved-raid.json).
- En una segunda entrada, se abre Defensas a las 18:54. El intento de escoger
  Zarzas al pasar la noche es rechazado por el botón ya deshabilitado. La captura
  posterior se tomó al amanecer, con contratación bloqueante; se identifica
  como tal y no se usa como imagen de noche:
  [DOM de amanecer](qa/wall-permissions/dawn-materials.txt).

[Consola](qa/wall-permissions/console.json): sin warnings/errors. El primer
intento de enviar la tecla al canvas no pudo enfocarlo; se envió desde el botón
Construir del HUD. El snapshot válido de la incursión se obtuvo después de
salir guardando; una lectura anterior todavía correspondía al guardado inicial
y no se utiliza para acreditar la persistencia de la partida avanzada.

En esa revisión QA-084 permanecía parcial: faltaba el trazado visible preparado de día y su
confirmación durante noche/ataque, y el recorrido UI durante incursión diurna.
Las pruebas del motor de ambos casos ya pasan, pero no sustituyen ese recorrido.

## Cierre: trazado pendiente e incursión diurna

La preparación del escenario sunset pasa a tiempo 200 para permitir el gesto
sin prisas. En la partida completa se elige Zarzas y se arrastra el terreno
visible de (240,650) a (460,650), mediante entrada real de puntero. El preview
contiene tres módulos por 30 monedas. A las 16:07 la confirmación está habilitada;
a las 21:57, manteniendo el mismo trazado, está deshabilitada. Un click con
`force:true` sobre el botón disabled no construye: no se modifica el DOM ni el
atributo disabled desde la automatización. El siguiente estado muestra 06:38
de la misma noche y el botón sigue bloqueado. Tras pausa y salida guardando,
el tiempo es 589,6255: ledger, commandIds, suppressed y structures coinciden
exactamente con el snapshot preparado. Ningún módulo de preview se convierte
en obstáculo lógico o compra.

[Día](qa/wall-permissions/stale-day.txt), [noche](qa/wall-permissions/stale-night.txt),
[imagen de noche](qa/wall-permissions/stale-night.png),
[comparación](qa/wall-permissions/stale-comparison.json), snapshots
[preparado](qa/wall-permissions/prepared-stale.json) y [guardado](qa/wall-permissions/saved-stale.json).

Para el ataque diurno se plantan 42 plátanos mediante Game.plant sobre terreno
nativo legal; se pagan 6300 monedas adicionales. La atracción es 10089 y el
saldo 2795. Se llama a spawnRaid con `daytime=true` hasta obtener un escenario
QA aceptado: nueve intentos, dos facóqueros y un búfalo. Esta selección deliberada
no es una medición de la probabilidad ni una campaña recorrida naturalmente.
El guardado válido se carga desde el menú original. A las 15:33, «2» abre
Construir con centro y murallas deshabilitados y aviso de incursión. Se pausa
y sale guardando a tiempo 222,5299, todavía de día y con incursión activa:
ledger, commandIds y suppressed no cambian, y no existe ninguna muralla.

[DOM diurno](qa/wall-permissions/day-raid-panel.txt),
[validación de preparación](qa/wall-permissions/prepared-day-check.json),
[comparación final](qa/wall-permissions/day-comparison.json), snapshots
[preparado](qa/wall-permissions/prepared-day-raid.json) y [guardado](qa/wall-permissions/saved-day-raid.json).
La imagen diurna se tomó antes de terminar de pintar el marco del panel;
el DOM registra los controles y sus permisos. Las imágenes de día/noche del
trazado muestran el panel completamente pintado. [Consola final](qa/wall-permissions/console-complete.json): vacía.

El primer ensayo del trazado se descartó al recargar Vite por una edición del
HTML preparador. La evidencia final se obtiene después de terminar las ediciones,
con un segundo trazado completo que cruza la noche sin recargar el juego.
La apariencia oscura del preview se registra para revisión visual: el texto lo
denomina verde, pero esta aceptación acredita los permisos y las compras,
no la fidelidad cromática de esa previsualización.

La prueba de comando cubre el mismo trazado obsoleto ante ataque diurno/nocturno;
las pruebas de gesto acreditan que desactivar el dibujo cancela la cadena sin
enviarla. Junto con los recorridos completos anteriores, esto satisface el rechazo
común y la conservación de la navegación exigidos por QA-084.
