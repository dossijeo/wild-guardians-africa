# Plant y Water durante un paseo nativo

Game conserva la elección ordinaria de tarea mientras Idle22 mantiene el cuerpo. El puente reutiliza la comprobación de destino de Farm y solicita Stop12 mediante el productor existente. La tarea queda libre mientras se prepara la parada. El puente descarta la propuesta nativa de asignación que aún no se puede confirmar y conserva la elección en los hechos del mismo lote. Proyectar el cuerpo detenido invalida ese lote y vuelve a planificar desde la pose adquirida.

Si el paseo alcanza el extremo antes de la parada, el productor cancela Stop12 y prepara REST21 con el ancla del paseo ejecutado. La posición, el radio y la identidad proceden de ese paseo aunque otro cultivo esté más cerca al llegar. La proyección de REST21 reabre la asignación una sola vez. WASM valida el ancla, el cuerpo y la pose mediante sus guardas existentes. Cuando vence el turno, Home conserva la prioridad. [Validación nativa del ancla](../../src/world/wild-engine/spatial-idle-cycle-proposal.inc#L71).

El código de OpenRA lee el estado del actor al ejecutar la actividad y distingue cancelación de llegada. Este cambio aplica ambas condiciones a los propietarios de ruta y tarea existentes en Wild Guardians. [OpenRA Activity](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Game/Activities/Activity.cs#L87-L102), [OpenRA Move](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Activities/Move/Move.cs#L130-L157).

## Evidencia funcional

Antes del ajuste, Plant y Water abortaban al confirmar una asignación sobre un cuerpo que seguía en Idle22. Un candidato intermedio ya dibujaba Stop12 pero dejaba el lote aplazado sin replanificar. Otro candidato cancelaba correctamente la parada al llegar, y el paso a REST21 rechazaba el ancla cambiada. En NVIDIA se registraron 559 retornos `unsupported` antes de preparar recursos gráficos. Un control sin orden de cultivo completó el mismo extremo y dibujó REST21. [Secuencias anteriores y recibo del fallo](performance/native-watering-idle-20261120/moving-idle-crop-task-baseline.json).

| Entrada ordinaria | Tickets dibujados del relevo | Riego confirmado | Geometrías originales | Drenaje |
|---|---|---:|---:|---|
| Plant mientras el actor anda | Idle22 6 → Stop12 8 → Task14 10 → Action15 12 → Idle20 14 | 1 | 36 | Sí |
| Water vence durante el paseo y la parada se cancela al llegar | Idle22 6 → REST21 9 → Task14 11 → Action15 13 → Idle20 15 | 1 | 36 | Sí |

Ambas ejecuciones usaron `youngMale`, arranque en frío, Edge con NVIDIA Turing y 640×480 a 30 Hz. El primer envío de cada relevo midió 33,5 y 33,4 ms de intervalo en el Host. La única diferencia entre el puente usado para Plant y la revisión integrada está en el ancla de REST21 al completar un paseo. Water ejecutó esa rama con el puente exacto de la integración. Los recibos conservan los hashes, el ancla, la cancelación, las geometrías y los tickets. C4 a 60 Hz y el timeout intermitente del arranque frío siguen abiertos. [Recibos físicos](performance/native-watering-idle-20261120/moving-idle-crop-task-handoff.json).

Las dos órdenes también completaron el recorrido en NVIDIA Turing con `olderFemale`. En ambos casos Stop12 adquirió el cuerpo 1 y precedió a Task14, Action15 e Idle20. Se conservaron las 33 geometrías de cada actor y se verificó el drenaje. Los primeros dibujos de Stop12 llegaron a los 33,2 ms en Plant y 33,3 ms en Water a 30 Hz. En el arranque de Plant, dos repeticiones previas a cualquier ticket separaron dibujos por 41,1 y 40,9 ms. Los envíos duraron 0,2 ms en ambos casos y la causa queda abierta. [Recibos de olderFemale](performance/native-watering-idle-20261120/moving-idle-older-female-20261121.json).

Las cuatro ejecuciones restantes completaron el riego con `olderMale` y `youngFemale`. Las dos órdenes de Plant y Water de `olderMale` pasaron por Stop12. Water de `youngFemale` llegó al extremo de Idle22 antes de preparar la parada y adquirió REST21 con la misma ancla y el mismo tiempo terminal. Las cuatro conservaron el cuerpo 1 y las 33 o 36 geometrías originales. Los primeros dibujos de esos relevos tardaron de 33,2 a 33,4 ms a 30 Hz. El primer Water de `youngFemale` agotó el plazo de Idle20 al arrancar. Una ejecución con más trazas adquirió Idle20, pero Water venció antes del paseo. Para medir el recorrido solicitado, la ejecución final partió de 4,4 unidades de crecimiento antes del umbral. El timeout inicial sigue abierto. [Recibos de olderMale y youngFemale](performance/native-watering-idle-20261120/moving-idle-remaining-profiles-20261121.json).

## Pruebas dirigidas

```powershell
.cache/tooling/node20.exe --test tests/native-idle-stop-late.test.js tests/native-moving-idle-task.test.js tests/native-idle-moving-task-admission.test.js tests/native-farm-moving-task-admission.test.js tests/native-idle-stroll-contract-home.test.js tests/native-idle-stroll-restoration-game.test.js tests/native-idle-stroll-failed-rest.test.js
```

Pasaron 93 pruebas. Los controles verifican que la elección se invalida al retirar el destino, que Farm y Home mantienen sus prioridades y que Plant por orden y Water por vencimiento producen un solo efecto. El caso tardío retiene la preparación de Stop12 hasta la llegada real y exige REST21 con el ancla adquirida, Task14 y el riego. La compilación Vite de producción valida el paquete con los binarios WASM existentes.
