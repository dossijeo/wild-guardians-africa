# Fin de turno de Task y retorno a Home

El productor ordinario reconoce una Task14 en movimiento al vencer el turno y solicita la parada 25. El trabajador conserva la tarea, la ruta y su cuerpo mientras se preparan los gráficos. El recibo adquirido detiene el cuerpo y permite liberar la tarea y solicitar Home18. Home19 retira ese mismo cuerpo cuando llega a su vivienda. [Plan integrado](integrated-gpu-migration-plan-20261104.md) · [Criterios de A6](A6-CHECKLIST.md).

## Frontera del turno

Game evalúa la guarda de retorno con el mismo tiempo canónico que aplica al ejecutar el paso. La captura a 250 s fallaba antes de avanzar. La captura a 300 s sumaba 0,05 a 299,9499999999955, quedaba por debajo de la guarda y luego redondeaba a 300 para ejecutar el retorno heredado. Ahora los dos casos conservan la ejecución de Task hasta adquirir la parada. [Reproducciones a 250 y 300 s](native-task-stop-home-graphics-20261120.md).

La autoridad publica los avisos de planificación y confirma el reloj causal de la declaración Home antes de que el productor intente admitir Home18. La historia de recursos acepta la frontera 25 con un delta de terreno vacío y Surface mantiene la guarda que exige la parada preparada. El motor WASM, el propietario de dibujo y el productor existentes realizan cada adquisición. La corrección de la señal de terreno conserva las regiones de vegetación durante estas paradas. [Conservación de la vegetación](far-structure-revision-retention-20261121.md).

La implementación de OpenRA en `release-20250330` conserva una actividad cancelada hasta que `TickOuter` completa su salida. `Move.Tick` confirma la cancelación cuando el móvil puede quedarse en su celda. Wild Guardians aplica la misma transición sobre el propietario activo y acredita el punto de entrega con el recibo de parada 25. [Activity.Cancel y TickOuter](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Game/Activities/Activity.cs#L87-L140) · [Estado de cancelación](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Game/Activities/Activity.cs#L183-L194) · [Move.Tick](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Activities/Move/Move.cs#L130-L140).

## Validación de autoridad

```powershell
.cache/tooling/node20.exe --test tests/native-task-return-authority.test.js tests/native-task-route-stop-source.test.js tests/native-task-route-stop-admission.test.js
```

Las 33 pruebas dirigidas pasan. La prueba ordinaria valida los cuatro perfiles con WASM y los dos puertos reales, y usa una cola de dibujo determinista. Retiene las respuestas de la parada y de Home para confirmar, respectivamente, el movimiento con la misma tarea y la pose fija mientras se espera el retorno. También comprueba la frontera fraccionaria, el rechazo de una preparación y la retirada después de Home. Los controles de fuente conservan su cobertura WASM autónoma y pthread. Pasaron las 629 pruebas de la selección ampliada y la compilación Vite de producción. [Pruebas de autoridad](../../tests/native-task-return-authority.test.js).

## Worker y GPU física

En NVIDIA Turing, el checkout integrado completó el retorno de `olderMale`, `olderFemale` y `youngFemale`. `youngMale` completó el mismo recorrido al servir la adaptación candidata en los Workers de producto. Los cuatro casos mantuvieron el cuerpo 1 en movimiento mientras la respuesta gráfica de la parada estuvo retenida. El Host dibujó Task14 con el ticket 5, la parada con el 7 y Home18 con el 9. El actor conservó la raíz y sus 33 o 36 propietarios de geometría, según el perfil. Home19 retiró ese cuerpo y emitió el dibujo del ticket 11. Los cuatro recorridos drenaron el consumidor sin errores de GPU. [Recibos de los cuatro perfiles](performance/native-task-stop-home-graphics-20261120/ordinary-shift-task-stop-home-20261121.json).

Los intentos del checkout integrado con `youngMale` se interrumpieron antes de adquirir Idle20. La última traza identifica `Native resource preparation timed out` sin respuesta gráfica y con 28 entradas del journal, por debajo del umbral. Astra recibió el fallo de arranque y el recibo de retorno del candidato.

En NVIDIA Turing, una Task de `olderFemale` alcanzó el destino mientras se retenía la respuesta READY de la parada 25. La última publicación conservó el cuerpo 1 en movimiento a 21,50 s de tiempo transcurrido. Al cruzar el fin de ruta de 21,507 s, Game lanzó `Expired Task lost its executed moving source`. Solo se dibujaron las adquisiciones Idle20 y Task14. Astra recibió la reproducción para resolver la continuación hacia Home desde la ruta completada. [Captura de llegada durante la preparación](performance/native-task-stop-home-graphics-20261120/ordinary-shift-arrival-during-stop.json).

 También quedan los motores de puerta y los retornos por cambios de centro o incursión. La aceptación de 60 FPS sigue abierta.
