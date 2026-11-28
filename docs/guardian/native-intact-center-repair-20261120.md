# Reparación ordinaria de un centro intacto

Una orden `requestRepair` para un centro operativo recorre Task14, Action15 e Idle20 sobre el mismo cuerpo. El daño y la caja de monedas conservan sus valores durante la preparación gráfica. Al confirmar Idle, Game aplica el coste original, restaura la vida y emite un solo `RepairApplied`. La huella física de ese centro ya existe y se reutiliza junto con sus rutas y el actor.

El control anterior adquiría Action15 de duración cero, conservaba 300 de 600 HP y seguía manteniendo la tarea. OpenRA revalida el objetivo y sus reparadores en `RepairableBuilding.ITick.Tick`, calcula el coste sobre el daño vigente y aplica la curación después de cobrar. Wild Guardians revalida el centro intacto, la acción y el coste en la admisión Idle20 que ya usa Water y Plant. La regla de cobro sigue siendo la de `repairCost` y la rutina de reparación de Game es compartida con el flujo legado. [Código de OpenRA](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Traits/Buildings/RepairableBuilding.cs).

Como el estado físico sigue siendo `intact`, la publicación actualiza el daño en el mirror de Wild Engine mediante el evento existente. No se vuelve a instalar la huella del centro. La preparación adicional reutiliza el slot y el canal Idle20. El WASM tiene dos entradas aditivas para preparar y leer el origen Repair y se mantienen las interfaces anteriores.

La prueba dirigida confirma la permanencia del daño y la ausencia de débito mientras se retiene la preparación. En el piloto Edge con NVIDIA Turing, una orden real sobre `structure-2` restauró de 300 a 600 HP y cargó 400 monedas una sola vez. El consumidor envió 22 dibujos durante la espera, 32 con Idle20 adquirido y un recibo final de drenaje. Se conservaron el cuerpo, la raíz, los huesos y las 28 mallas con sus geometrías originales.

```powershell
$env:QA_NATIVE_WATERING_ORIGIN='fresh'
$env:QA_NATIVE_WATERING_KIND='repair'
node tools/guardian/audit_native_watering_idle_world_owner.mjs
```

Pasaron 417 de los 426 casos seleccionados en 46 archivos y el build de producto. Nueve pruebas quedaron omitidas y hubo cero fallos. El control previo reproduce la falta de preparación tras la acción.

Quedan las reparaciones que vuelven a introducir colisión, la construcción durante rutas activas y las demás adversidades de la familia. El caso topológico está en revisión con Astra. C4 conserva su validación separada. [Recibo y fuentes](performance/native-intact-center-repair-20261120/validation.json).

El control adicional de Repair sobre zarzas prepara dos guardados equivalentes con el muro intacto a 50/100 HP o arruinado a 0/100 HP. La autoridad WASM acepta la orden y adquiere Task14 y Action15 en ambos casos. Después de doce segundos simulados, la tarea sigue en acción y conserva los HP iniciales. Queda aplicar la reparación de muros conservando su huella cuando sigue intacta y revalidar acceso y colisión al restaurar ruinas. El control usa los puertos reales con un Host de dibujo simulado. [Resultados de ambos casos](performance/native-intact-center-repair-20261120/wall-repair-baseline.json).

La comprobación del 21 de noviembre añade `olderMale`, `olderFemale` y `youngFemale` al primer resultado `youngMale`. Cada orden devolvió el centro de 300 a 600 HP, debitó 400 monedas una sola vez y conservó el cuerpo, la raíz, los huesos y las 27 o 28 mallas originales. Se observaron 22 dibujos durante la espera en cada caso, entre 29 y 32 dibujos del Idle adquirido y un recibo de drenaje por sesión. El runner acepta el perfil mediante `QA_NATIVE_WORKER_PROFILE` en el modo `fresh`. [Resultados de los cuatro perfiles](performance/native-intact-center-repair-20261120/worker-profiles.json).
