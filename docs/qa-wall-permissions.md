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
