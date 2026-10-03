# Permisos de murallas y atajos nativos

QA-084 sigue **parcial**: esta revisión prueba los comandos reales y el control
de interfaz con dobles de DOM; queda pendiente el recorrido de la partida
completa en navegador durante noche e incursión, incluido un trazado abierto.

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

QA-084 permanece parcial: falta el trazado visible preparado de día y su
confirmación durante noche/ataque, y el recorrido UI durante incursión diurna.
Las pruebas del motor de ambos casos ya pasan, pero no sustituyen ese recorrido.
