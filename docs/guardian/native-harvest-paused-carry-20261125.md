# Harvest con READY de Carry cancelado durante la pausa

El auditor ordinario retuvo la respuesta del ticket 12 de Carry, pausó la
partida mediante la autoridad y entregó READY tras observar el aborto de la
petición original. El ticket 12 no llegó a dibujarse. El cultivo y el saldo se
conservaron en pausa y la caja seguía ausente. Al reanudar, la nueva preparación
del mismo cuerpo obtuvo el ticket 14. Settlement17 dibujó el ticket 18 y abonó
14 monedas una sola vez. [Recibo físico](performance/native-harvest-paused-carry-20261125.json).

Las 587 referencias residentes que compara el auditor se conservaron. El
reintento volvió a crear 16 módulos de color y sombra con WGSL idéntico al de
la primera preparación, sobre cinco geometrías originales. La guarda del
auditor detuvo la prueba antes del drenaje verificable. La captura conserva
1.680 dibujos sin pérdida de traza CDP. El intervalo máximo observado fue de
42,355 ms a 30 Hz. C4 queda abierto.

El control en CPU usa ambos Workers, el WASM y el Host de dibujo con cola
determinista. La selección dirigida aprobó 77 pruebas. El mismo caso adquiere
el READY tardío si se retira la guarda de pausa.
[Control de ciclo](../../tests/native-production-lifecycle.test.js).

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
