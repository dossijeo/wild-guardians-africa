# Victoria y continuación pacífica

Implementación/evidencia sobre `0871e0e`. QA-135 y QA-136 se comprueban mediante
el reloj de producción, la persistencia real y la interfaz nativa. No se ha cambiado
el comportamiento de victoria o incursiones para hacer pasar estos ensayos.

## QA-135: liberación y misma partida

La fixture tests/browser/village-game.html?victory=1 prepara explícitamente el
último instante de la noche 100 (99 noches completadas, time=599.9), con Sabana,
Mapungubwe, semilla 712, poblado nativo, centro y mijo pagados y saldo de QA de
200000. Se guarda únicamente qa-victory-ui en el origen local de pruebas 5180.
No acredita jugar las 99 noches anteriores: esa condición se prepara para observar
la transición; la supervivencia prolongada tiene ensayos de campaña independientes.

Desde Continuar del santuario se carga esa ranura. El reloj real alcanza amanecer,
el HUD marca día 101 y 100/100 noches, y el Espíritu presenta la
[narración de liberación](qa/postgame/liberation.png). Tras cerrar la lectura,
las [opciones reales](qa/postgame/victory-options.png) permiten volver al menú o
Seguir en este mundo. Esta última abre la [contratación del día 101](qa/postgame/postgame-hiring.png)
con saldo restante exacto 200000 y coste cero seleccionado. Al confirmar,
[Construir permite fundar poblados](qa/postgame/postgame-building.png).

Guardar y volver al menú conserva dos ranuras: qa-village-ui del ensayo anterior
y qa-victory-ui ahora día 101, sin crear una tercera. Se elige explícitamente esta
última y [vuelve a cargar postgame](qa/postgame/reloaded-postgame.png), con 200K,
100/100 y reloj en marcha, sin relanzar la liberación ni el resultado de victoria.
La persistencia íntegra de edificios, plantas, ledger, poblado, semilla y slot al
continuar se contrasta además con JSON en las cinco culturas del ensayo de dominio.
[Consola de este ensayo](qa/postgame/console.json): cero errores/advertencias.
Una espera de observación agotó sus 3 s durante carga; la siguiente inspección
mostró la misma carga terminada. No se reinició el juego por ese timeout.

## QA-136: 300 noches completas en cada cultura

[Cinco casos aprobados](qa/postgame/directed.txt), cero fallos/cancelaciones/omisiones,
227250,4085 ms. Cada caso usa Navigation, edificios/polígonos nativos y
SaveRepository reales, sobre suelo plano y sin props controlados. Se paga un centro
por 800 y 42 semillas de plátano por 150 cada una; desde un saldo explícito de QA
200000 quedan 192900 monedas y 10080 de atracción. No se falsea la propiedad alive
ni el resultado del plan de incursiones.

El día/noche 100 se prepara como condición inicial y Game.tick resuelve su cierre
hasta victory. TutorialController presenta campaign.liberation y se reconoce su
lectura; Game.continuePostgame mantiene las posesiones y la ranura, abre contratación
y una segunda llamada no duplica PostgameStarted. Las lecturas mecánicas anteriores
se preparan como recordadas; la liberación sigue siendo local a la partida.

Se ejecutan desde el día 101 hasta el 401, noches completadas 100 → 400, con
contratación de cero trabajadores confirmada una vez cada día. Los ticks se
procesan en bloques de 30 s, que internamente ejecutan los pasos de 0,1 s reales.
Se comprueba ausencia de incursión y derrota en cada bloque. En cada cultura:

- 300 planificaciones diurnas llegan a su instante y quedan done.
- 300 planes nocturnos conservan grupo vacío e instante válido 300–600.
- 300 NightStarted y 300 Dawn recogidos mientras se producen.
- Cero RaidSpawned, RaidEnded, StructureHit, GameOver y lectura mechanic.first-raid.
- CampaignWon y PostgameStarted ocurren exactamente una vez.
- 300 guardados nocturnos y carga de comprobación, 12 recargas al contratar;
  la contratación pausada no avanza con tick de 10 s.
- Balance final 192900, centro intacto y las 42 plantas vivas en las cinco culturas.
- world.expansion reconocido una vez y ninguna vuelta al tutorial básico.

Son 1500 noches postgame entre cinco culturas. El ensayo mantiene cultivos vivos
sin contratar: verifica paz, reloj, tutorial y persistencia con atracción alta;
no mide producción de cosechas, rendimiento de renderizado ni una campaña natural
con esa plantilla. Tampoco se presenta como auditoría de todos los biomas.

## Validación y procedencia

La primera ejecución llegó a completar los 300 ciclos de cada cultura pero su
aserción final contó el historial acotado de 200 eventos como si fuera ilimitado:
[contraejemplo conservado](qa/postgame/bounded-history-first-run.txt). Se corrigió
el recolector de la prueba para acumular identificadores al avanzar, sin tocar
emit ni ampliar el historial del juego. La evidencia final es directed.txt.

[36 casos de límites económicos y tutorial](qa/postgame/boundaries.txt): cero
fallos/omisiones, 8588,0842 ms, incluidos los órdenes de derrota/victoria existentes.
[Build](qa/postgame/build.txt) correcto, 6,90 s, con aviso conocido de bundle mayor
de 500 kB. [Paquete web](qa/postgame/package.txt): 554 archivos, 379694348 bytes,
794 enlaces relativos y 20 GLB runtime sin duplicados originales.

La CI de `1b37528` y sus correcciones anteriores aprobó; la nueva se ejecuta tras
publicar. La matriz del plan conserva los demás casos pendientes/parciales.
