# QA-085: colocación inválida sin compra parcial

**Verificado** mediante navegación nativa de los seis biomas y dos recorridos
en la partida completa del navegador, con menú y HUD originales.

`tests/wall-placement-native.test.js` usa perfiles originales, semilla 712,
Mapungubwe, búsqueda real de ubicación inicial y centro pagado (800 monedas)
desde un crédito QA explícito de 10000. No sustituye el terreno, props ni métodos
de navegación por dobles. Busca cadenas con un módulo inicial legal y un módulo
posterior rechazado por el motivo que se está comprobando.

Pasan **10/10 pruebas**, cero fallos, cancelaciones u omisiones, 24.488,3798 ms.
[Salida completa](qa/wall-placement-native-directed.txt):

- Árbol/roca/prop singular grande: Sabana, Gran Río, Manglares, Volcanes,
  Gran Cañón y Desierto. Se prueban preview, compra de cadena y módulo individual.
- Agua/lava/pendiente: límites nativos en Gran Río, Manglares, Volcanes y
  Gran Cañón. Hay módulos legalmente colocables antes del primer rechazo.
- Tras cada preview y compra rechazada, la serialización completa es idéntica;
  no cambian obstáculos de navegación ni su conjunto de supresiones. Los módulos
  válidos de una cadena rechazada no se compran, no reservan IDs y no se colocan.

La selección inicial de un caso de río encontraba una roca antes del agua.
Se corrigió la búsqueda del ensayo para que el primer módulo inválido tenga
el motivo esperado; no se cambió el motor para alterar la prioridad del rechazo.

## Recorridos de partida completa

Se usa el preparador QA `tests/browser/wall-permissions.html` en el origen local
5180. Ahora acepta un bioma por URL y mantiene separados sus slots QA. Ambos
recorridos cargan los GLB, terreno, chunks, materiales y controles de producción.

**Roca en Sabana.** Tras abrir Construir mediante «2», elegir Murallas y Zarzas,
se arrastra de (650,540) a (600,445), cruzando la roca visible. El HUD muestra
«Un árbol o roca grande ocupa este terreno» y no aparece confirmación ni
previsualización parcial. Al pausar y salir guardando a tiempo 237,6093, el
saldo sigue en 9095, con un centro y ninguna muralla. Ledger, commandIds,
suppressed y structures coinciden exactamente con la preparación.

[DOM](qa/wall-placement/rejected-prop.txt), [imagen](qa/wall-placement/rejected-prop.png),
[comparación](qa/wall-placement/prop-comparison.json), snapshots
[preparado](qa/wall-placement/prepared.json) y [guardado](qa/wall-placement/saved.json).

**Agua en Gran Río.** Se desplaza la cámara desde el poblado hasta el cauce.
Durante ese desplazamiento se alcanza el amanecer: se confirma la contratación
recordada de una mujer mayor (100 monedas) y se toma un nuevo baseline después
del cobro. A partir de ese baseline, con saldo 8995 y permisos de día, se abre
Zarzas y se arrastra de (430,420) a (430,285), desde tierra hacia agua visible.
El HUD muestra «Agua, lava o pendiente no edificable» y no hay confirmación ni
cadena parcial. El guardado a tiempo 38,7783 del día 2 conserva exactamente
ledger, commandIds, suppressed y structures respecto del baseline; cero murallas.

[DOM](qa/wall-placement/rejected-terrain.txt), [imagen](qa/wall-placement/rejected-terrain.png),
[comparación](qa/wall-placement/terrain-comparison.json), snapshots
[baseline tras contratar](qa/wall-placement/baseline-river.json) y [guardado](qa/wall-placement/saved-river.json).
La [preparación de Gran Río](qa/wall-placement/prepared-river.json) es anterior
al amanecer y se conserva como contexto, no como baseline económico del intento.

[Consola de Sabana](qa/wall-placement/console.json) y
[consola de Gran Río](qa/wall-placement/console-river.json): vacías.
Las pruebas de navegación de seis biomas no se presentan como seis recorridos
visuales: los recorridos completos renderizados de esta revisión son Sabana y
Gran Río. No se modifica código de producción ni se atribuye rendimiento a
estos ensayos. La tonalidad oscura del preview válido registrada en QA-084
sigue siendo una revisión visual independiente; aquí se acredita que el trazado
rechazado no produce geometría solapada, compra parcial ni supresión de props.
