# Harvest con READY de Carry cancelado durante la pausa

El auditor ordinario retuvo la respuesta del ticket 12 de Carry, pausó la
partida mediante la autoridad y entregó READY tras observar el aborto de la
petición original. El ticket 12 no llegó a dibujarse. El cultivo y el saldo se
conservaron en pausa y la caja seguía ausente. Al reanudar, la nueva preparación
del mismo cuerpo obtuvo el ticket 14. Settlement17 dibujó el ticket 18 y abonó
14 monedas una sola vez. [Recibo físico](performance/native-harvest-paused-carry-20261125.json).

La primera captura conservó 587 referencias residentes y detectó 16 módulos de
color y sombra con WGSL idéntico al de la primera preparación, sobre cinco
geometrías originales. La guarda del auditor detuvo esa prueba antes del
drenaje. La repetición con materiales residentes conservó 588 referencias,
registró cero creaciones de módulos con fuente repetida y drenó sin errores.
El cuerpo 2 y el abono único se verificaron en ambas pasadas.
[Recibos anterior y corregido](performance/native-harvest-paused-carry-20261125.json).

Three.js r180 comparte los programas de vértice y fragmento por fuente
exacta y los libera al perder el último usuario. El parche local de
`RenderObject` liga los pases de sombra al material fuente. Carry reutiliza
el retiro diferido y conserva un solo conjunto de materiales compilados
en el actor de Harvest mientras siga vigente la acción de origen. El nuevo
paquete conserva su propia preparación, vinculación y reloj. La retirada de
la acción o del actor libera el conjunto anterior. Una cancelación antes de
READY libera los materiales en el retiro normal.
[Three.js, código de los programas](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Pipelines.js#L167-L187) ·
[Three.js, liberación por uso](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Pipelines.js#L229-L253) ·
[Propietario de la sombra](../../tools/patch-three-source-material.mjs).

El control en CPU usa ambos Workers, el WASM y el Host de dibujo con cola
determinista. Quitar la guarda de pausa permite adquirir el READY tardío y
hace fallar la prueba. La regresión del ajuste aprobó 90 pruebas y compiló
el producto WebGPU Worker con dibujo remoto. Al quitar la retención de
materiales, el control gráfico detecta su liberación antes
del reintento. [Control de ciclo](../../tests/native-production-lifecycle.test.js) ·
[Control de retención](../../tests/native-task-consequence-graphics.test.js).

La repetición conservó 1.695 dibujos con traza CDP sin pérdida. El máximo
fue de 74,455 ms a 30 Hz, entre dos repeticiones del paquete 217 con el ticket
7, antes de la preparación de Carry. El primer dibujo de esa pareja ocupó
73,765 ms de tiempo de pared. La causa se investiga por separado y C4 sigue
abierto. [Muestras y máximos](performance/native-harvest-paused-carry-20261125.json).

```powershell
$env:QA_NATIVE_BIRTH_SCENARIO='cancel-before-task'
$env:QA_NATIVE_NEWBORN_PROFILE='youngMale'
$env:QA_NATIVE_BIRTH_FOLLOW_ACTION='true'
$env:QA_NATIVE_BIRTH_FOLLOW_CONSEQUENCE='true'
$env:QA_NATIVE_BIRTH_FOLLOW_SETTLEMENT='true'
$env:QA_NATIVE_BIRTH_PAUSE_CARRY='true'
$env:QA_NATIVE_CAPTURE_MODE='timing'
$env:QA_NATIVE_TRACE='true'
$env:OUTPUT='.cache/native-harvest-paused-carry-nvidia.json'
node tools/guardian/audit_native_farm_birth_world_owner.mjs
```
