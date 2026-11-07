# Handoff de animación al confirmar una frontera

Estado: cierre de fase animal conectado al commit de frontera; retención global ante abort y la activación nueva siguen pendientes. La ampliación de `Walking` a animales `waiting` con ruta no se activa; la ruta existente conserva su presentación CPU. La existencia de `path` no prueba que haya desplazamiento.

El reloj de presentación puede avanzar dentro de un intervalo ya confirmado, mientras el estado aplicado en el receptor sigue en su frontera inicial. La evidencia de ticks y trayectoria permite reproducir ese intervalo, pero no proporciona un estado completo de simulación aplicable en cualquier instante intermedio.

## Contrato existente y límite

- `createConfirmedHistoricalMotionGroup.start` instala de forma síncrona animales, trabajadores y efectos; si falla otro participante, llama a `cancelHistoricalMotion` de los ya instalados. Este rollback solo es seguro antes de avanzar el reloj.
- `confirmed-historical-clock.cancelAtStart` y `confirmed-gpu-motion.cancelAtStart` rechazan la cancelación después del inicio. `invalidate` detiene el reloj en el instante alcanzado. `abandonForBoundary` exige que el flujo confirme el extremo antes del siguiente dibujo.
- `webgpu-animal-roster.abortHistoricalMotion` marca el tramo inválido y limita la trayectoria GPU con `motion.hold(clock.elapsed)`. La fase sigue dependiendo del reloj detenido. Esto no transfiere su propiedad a un nuevo ciclo ni garantiza su supervivencia a la liberación de la roster, el reloj, la fase o los recursos del bake.
- Cuando el propietario global usa `deferHandoff`, `finishHistoricalMotion` conserva la fase animal hasta `afterCommit`. El pump invoca el callback tras confirmar y verificar la frontera; la reproducción de eventos lo invoca tras cada commit intermedio o final. Un fallo de commit no libera la fase. La liberación global de recursos y la reconciliación de un abort parcial todavía no están cubiertas por este contrato.
- `cancelHistoricalEvents` solo descarta la transacción antes de su primera frontera. Tras una frontera aplicada, falla y cierra el flujo; no ofrece un commit arbitrario intermedio. La invalidación y recuperación son responsabilidad del propietario global, no de una sola roster.

## Interfaz necesaria para una integración segura

El propietario de la transacción debe mantener vivos reloj, fase, trayectoria, rig y recursos del bake mientras exista una presentación retenida. El handoff debe estar coordinado entre todas las rosters y efectos:

1. Preparar el candidato y verificar identidad, clip, muestras y trayectoria sin alterar el rig activo.
2. Instalar fase, trayectoria y rig en una única operación reversible. Si otro participante falla antes de avanzar, restaurar todas las instalaciones al inicio.
3. Durante una pausa o invalidación parcial, congelar conjuntamente pose, fase, trayectoria y reloj; no publicar ese instante como estado lógico. La retención debe sobrevivir hasta la reconciliación o el cierre explícito del propietario.
4. Al finalizar un tramo, mantener la pose final hasta que el receptor haya confirmado la frontera correspondiente. Solo entonces transferir la presentación al estado confirmado o a la siguiente trayectoria certificada. La preparación de una continuación puede fallar: en ese caso el extremo debe seguir visible sin volver a la pose inicial.
5. En una cancelación posterior al avance, conservar la última pose presentada hasta una frontera confirmada o una reconciliación completa de autoridad; no usar `cancelAtStart`. Liberar la retención después de que la nueva presentación sea visible y válida.

Antes de activar la nueva ruta hacen falta pruebas de rollback antes del primer tick; abort a mitad de intervalo; pausa y reanudación; fallo de preparación de la continuación; commit con cambio de clip, objetivo o trayectoria; liberación de recursos; y ausencia de cambios en el estado autoritativo. Se requieren además pruebas visuales en partida para comprobar continuidad.
