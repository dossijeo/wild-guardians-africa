# Preparar la consecuencia semántica de Harvest

Continúa la [restauración de acciones](e-r3-native-action-restoration-20261115.md).
El cálculo ordinario de cosecha puede producir ahora datos inmutables de su
consecuencia sin consumir el cultivo, dinero, IDs, potencia ni pérdidas reservadas.
La propia finalización ordinaria de `Game` usa esa función de reglas. No hay una
implementación económica diferente para el futuro consumidor nativo.

Este incremento prepara una dependencia del commit de consecuencias. No implementa
todavía la propuesta/commit nativos, el relevo al transporte de la caja ni la
siguiente tarea. Se conserva la protección de `completeTask`: ninguna marca o
progreso nativo permite aplicar efectos. e-R3/e-R4/f-R4, A6 y A/B/C siguen abiertos.

## Datos preparados, sin efectos ni permisos

`Game.prepareHarvestConsequence` exige una tarea Harvest asignada al trabajador,
su objetivo correcto, un cultivo maduro solicitado y ausencia de otra caja.
Calcula las reglas existentes: valor racional, perfil masculino, Multiply antiguo
o potencia comprometida, bonificación de cultivo, influencia de bendiciones y
pérdida de microevento después de las bonificaciones. Incluye los datos de la caja
y su procedencia, sin incrementar `nextId` ni retirar `multiplyPower` del cultivo.

El resultado declara `authorizedConsequences:false`. Sus objetos anidados son
copias propias congeladas; preparar no congela el estado vivo. No guarda handles
WASM ni concede una llegada, una asociación GPU o la propiedad del cuerpo. No hay
otro registro de tareas, reloj, ledger, cola o copia de la partida.

`harvestConsequenceCurrent` vuelve a calcular esa consecuencia pequeña y compara
sus datos. Posición/progreso de otro actor y tiempo transcurrido no la invalidan.
Cambios de tarea, objetivo, perfil, posición de origen, caja/ID o resultado
económico sí. Esta comprobación semántica **no sustituye** la identidad nativa,
época, cuerpo, frontera ejecutada y recursos que deberá comprobar la propuesta.
El ID de caja es provisional: otro comando puede consumirlo mientras se prepara.
Habrá que descartar o renovar esos datos; no se reserva por anticipado.

`previewHarvestMicroLoss` separa también cálculo y consumo de la pérdida local.
Puede consultar la deducción y el límite diario sin borrar la reserva ni resetear
el día de liquidación. `harvestMicroLoss` consume después mediante ese mismo
cálculo y mantiene su orden de redondeo, límite y evento. Preparar varias veces
no utiliza la cuota que podría necesitar otra cosecha.

La finalización ordinaria conserva el orden observable de eventos. Asigna el ID
y toma la posición viva al crear la caja, después del posible evento de pérdida;
un listener no puede provocar que se reutilice ciegamente el ID provisional.
La caja viva conserva la potencia original y sigue siendo móvil. El guardado y
la liquidación en entrega conservan las reglas y formatos anteriores.

## Código consolidado consultado antes de implementar

- [Flecs v4.0.4, `src/stage.c`, `flecs_defer_set`](https://github.com/SanderMertens/flecs/blob/v4.0.4/src/stage.c#L297):
  lectura del almacenamiento temporal y copia de valores antes de insertarlos
  (líneas 365–393). Se adapta la separación entre datos propios de preparación y
  estado vivo. No se introduce Flecs, un ECS, una cola paralela ni un nuevo sistema
  de transacciones.
- [Godot 4.4, `AnimationPlayer::_blend_post_process`](https://github.com/godotengine/godot/blob/4.4-stable/scene/animation/animation_player.cpp#L307):
  lectura de la comprobación de identidad antes de finalizar o encadenar. Se
  conserva la distinción entre final temporal y fuente todavía válida. El clip
  terminado no concede efectos de gameplay; la autorización sigue siendo tarea
  del propietario nativo y de la admisión común existente.

No se cambia motor ni se añaden dependencias. El cálculo queda en las reglas de
`Game` que ya utiliza el Worker autoritativo; el futuro contrato nativo debe
consumirlo, sin copiar estas reglas a un segundo ejecutor.

## Validación y pendiente inmediato

[Registro reproducible](performance/harvest-consequence-data-validation-20261115.json).
Pasan 167/167 pruebas dirigidas, incluidos los 14 casos nuevos. La regresión
económica de 31 archivos termina con 303/305 aprobados: sus dos fallos de fundación
de poblados se reproducen con los archivos anteriores de `HEAD`, con el mismo
error de cultura. La compilación de producto pasa. Estos grupos se solapan.

La expansión inicial por imports seleccionó 517 archivos e incluyó campañas de
100 noches y matrices completas de navegación. Se interrumpió expresamente por
exceder este cambio; su salida parcial se conserva y **no es una campaña completa**.
Los 41 fallos observados en ocho archivos se reprodujeron sustituyendo únicamente
los textos de `game.js` y `microevents/economy.js` por los de `a849785ff`, en sus URLs
originales y sin modificar el árbol. Coinciden los nombres y los mensajes completos
de error. El registro contiene el loader de sólo lectura, hashes y selecciones.
No se alteran expectativas para poner esas pruebas en verde ni se atribuyen sus
fallos a esta extracción. Tampoco se convierte esta comparación en aceptación C.

Las pruebas específicas cubren los cuatro perfiles, fracciones sin pérdida,
potencia comprometida sin doble Multiply, bendiciones, cuota diaria compartida,
obsolescencia y ausencia de escrituras. Una cadena de comandos ordinarios observa
la caja exactamente en `CropPicked` y verifica un único consumo, sin pago temprano.
Esa cadena usa terreno controlado y no certifica navegación nativa ni campaña.

Otra prueba usa WASM real, restauración genuina de acción terminada y el contrato
común de admisión con cola GPU simulada. Obtiene la consecuencia sin cambiar la
tarea, cuerpo ni cultivo; `Game.tick` continúa reteniéndolos. No es prueba de un
commit de consecuencia ni de preparación de la caja en hardware.

El siguiente paso sigue siendo emitir una propuesta nativa que retenga la fuente
de acción y prepare el resultado y el siguiente propietario antes del efecto.
`nav_intent_finish` aún retira tarea e intención: no debe usarse como sustituto de
ese relevo ni retirarse la protección de `completeTask`. La coherencia de
publicaciones ordinarias y la reutilización completa de los 3.123 recursos siguen
pendientes. Este cambio de reglas no modifica el renderer ni su contrato GPU.
No se recompila WASM ni se repite hardware por esta extracción de reglas; los
hashes de contexto identifican los binarios y los propietarios nativos sin cambios.
