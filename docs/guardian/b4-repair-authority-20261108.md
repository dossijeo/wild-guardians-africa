# Reparación: alcance real de la presentación

La reparación en el juego actual se resuelve en la autoridad cuando el trabajador alcanza el punto de servicio. `updateWorkers` llama inmediatamente a `completeTask`; también completa sin demora una reparación recuperada con estado `acting`. La acción emite `RepairApplied`, cuyo efecto de polvo se reproduce desde la presentación confirmada. No se produce un intervalo normal de reparación `acting` de 3,8 segundos. `workerPose` y `workVfxPlans` conservan ramas para ese estado, pero su existencia no demuestra que sea alcanzable en una partida actual.

Los bancos `Dig` y su conexión introducidos en los commits 94d7207ec, 296e332c6, 18939c4e9 y 9c30cc643 se retiraron: dependían de un estado que la simulación real no mantiene y no eliminaban trabajo real. Las pruebas de esos commits usaban fixtures sintéticos, no demostraban una tarea de reparación real. Se conservan en el historial si vuelven a ser útiles.

No se altera el comportamiento lógico ni se añade una duración de reparación para justificar una animación. Para una presentación animada futura habría que diseñar una secuencia exclusivamente visual desde `RepairApplied`, que no retrase el resultado autoritativo, no duplique el efecto confirmado y se interrumpa correctamente si el trabajador recibe otra instrucción. Esto no forma parte de la implementación actual.
