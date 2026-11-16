# Idle inicial pendiente: reloj común, tarea y Home

Continuación de [la declaración y restauración en Game](e-r3-native-initial-idle-game-20261116.md). La espera inicial ya no bloquea globalmente `Game.tick`: su cuerpo permanece retenido y los compañeros admitidos avanzan con el reloj nativo existente. No se ejecutan todavía los ciclos Idle/Alert o el paseo, ni se anuncia una admisión gráfica inicial.

## Referencia y decisión

Se reutilizó la revisión del [código real de DetourCrowd v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L482-L625), realizada antes de diseñar esta conexión: `addAgent` conserva un registro físico activo sin objetivo, mientras `requestMoveTarget` cambia la petición sin fabricar otro agente. Aquí la presencia, petición pendiente y ejecución continúan separadas sobre `ActiveIntent`, el registro de cuerpos, el reloj y la admisión preparados existentes. No se importan su ajuste al NavMesh o corredor local, ni una dependencia nueva.

Se contrastaron las implementaciones reales del reloj/cohorte nativo, la retención Home, la restauración previa al primer cuerpo, `commitTaskProposal`, las guardas de Game y `cancelIdle`. Se amplían esos mecanismos; no se crea un controlador, reloj, mundo o cola alternativos.

## Comportamiento

- La declaración semántica actual se puede consultar antes de vincular el cuerpo. Su tipo `native-initial-idle-declaration-reference` no contiene cuerpo, radio o flags físicos y no puede sustituir una referencia utilizable para preparar ejecución. El getter anterior sigue exigiendo un cuerpo exacto. Ambos leen el mismo registro y búfer nativos.
- Una petición inicial con cuerpo coherente participa en el reloj común como **espera**, conservando pose, fases, presupuesto y RNG. Game verifica su fuente actual y evita ejecutar la política o navegación JS heredadas. La tarea genuina de otro actor sigue avanzando; no se elimina la guarda para otros movimientos o puertas pendientes de migración.
- Antes del primer reloj, la declaración aún sin cuerpo puede permanecer pendiente mientras Game avanza. Con una cohorte causal ya activa se rechaza crear una nueva petición sin cuerpo **antes de cambiar el registro o Game**; admitir nuevos actores durante una partida viva requiere todavía el nacimiento físico preparado por el productor ordinario. Una petición incompleta no puede volver incoherentes a los compañeros ya admitidos.
- El vencimiento diario o el cruce exacto del horario convierte la fuente inicial real en una petición Home nueva sobre el mismo propietario, incluso antes de READY o del primer cuerpo. Conserva pose y presupuesto; `cancelIdle` conserva la semántica original de fin de contrato. No se inventa una tarea, Carry, liquidación ni historial de entrega. El camino Idle posterior a una entrega permanece separado y conserva su prueba histórica.
- La petición Home usa el corredor y transactor existentes. Su primera vinculación física completa la petición con una secuencia nueva. La identidad de la fuente inicial se conserva sólo como dato privado para la idempotencia de la conversión; no se convierte en permiso serializado.
- Una tarea real puede sustituir la declaración aún sin cuerpo mediante `pendingResources`; la ruta no se ejecuta hasta la admisión TaskStart existente. El commit heredado sin preparación sigue rechazado. El marcador, fase local y RNG se cancelan con las mismas reglas originales de asignación de tareas.

## Validación y alcance

Pasan 49/49 casos dirigidos (22.986,7618 ms) y 766/766 de regresión en 70 archivos (419.813,9306 ms), con ambos módulos nativos recompilados. Los resultados finales, módulos y hashes se registran en [el resultado de validación](performance/native-initial-idle-clock-validation-20261116.json). Las pruebas ejercitan WASM real y Game, un compañero TaskStart real, los cuatro perfiles, vencimiento diario en standalone y pthread, la espera y conversión antes del primer reloj, rechazo de nacimiento incompleto en cohorte viva, tarea pendiente y su admisión posterior, idempotencia e identidades alteradas. El relevo a Home usa también los puertos reales de recursos/control, con GPU simulada y retención del mismo cuerpo durante la preparación y drenaje. No es una aceptación de hardware de Idle inicial.

Los primeros ensayos mantuvieron correctamente las guardas para puertas no migradas y una ruta Home desconocida. Se corrigieron los nuevos fixtures: la prueba integrada excluye puertas y declara su destino Home en el corredor libre verificado de su mundo reducido, antes de crear la sesión de intenciones. No se retiraron esas guardas ni se fabricó una ruta o prueba anterior.

La compilación de producto pasa en 43,91 s. Los nueve hashes de fuentes y módulos nativos coinciden con la compilación final; los 16 archivos previos protegidos permanecen idénticos por bytes. No se modifica código de renderizado ni se reconstruyen recursos gráficos en este incremento.

Faltan los metadatos de control/eventos para la admisión inicial estacionaria, su transactor/consumidor gráfico sobre el actor residente, y la ejecución completa de descanso, vigilancia y paseo con RNG y reglas originales. También siguen pendientes otras clases/finales y puertas, productor ordinario, nacimiento preparado en partida viva, sustitución de mundo, recuperación incremental de los 3123 recursos sanos y aceptación A/B/C antes de D. No cambia ningún cierre A6/A/B/C, ni se mide o acredita ausencia de tirones con estas pruebas.
