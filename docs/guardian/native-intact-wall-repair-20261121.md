# Reparación ordinaria de un muro intacto

La orden `requestRepair` para un módulo de muro dañado e intacto termina Action15 por el mismo Idle20 que usa un centro. La autoridad revalida el tipo, el estado, los HP y la acción ejecutada antes del recibo. La compra y el `RepairApplied` usan la rutina de Game. El evento actualiza los HP del mirror nativo y conserva la huella física al mantenerse el estado `intact`.

La autoridad nativa conserva el tipo de estructura en la prueba preparada y obliga a que el objetivo siga siendo ese tipo al confirmarla. La variante `wallRepairSource` es aditiva y atraviesa la validación existente de pose, cuerpo, sesión y secuencia. Los orígenes Water, Plant y Repair de centro preservan su formato y su validador. Las dos compilaciones de WASM añaden las entradas de preparación y lectura de la prueba de muro.

OpenRA revalida los reparadores, calcula el coste sobre los HP vigentes y aplica curación después de cobrar en `RepairableBuilding.ITick.Tick`. Wild Guardians conserva el punto de revalidación y la rutina de débito única dentro del Idle20 ya existente. [Código de OpenRA](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Traits/Buildings/RepairableBuilding.cs#L130-L201).

El control previo con la autoridad real aceptaba la orden para zarzas intactas a 50/100 HP y llegaba a Action15. La acción terminada seguía ocupando el trabajador. La prueba dirigida retiene la preparación de Idle20 y verifica que, mientras espera, se conservan el daño y el saldo. Al adquirir el paquete, se conserva el cuerpo del trabajador, se elimina la tarea y se publica una sola reparación a 100 HP con un solo débito. La ruina sigue aceptando la orden y espera su propia consecuencia topológica. [Recibo anterior de ambos objetivos](performance/native-intact-center-repair-20261120/wall-repair-baseline.json).

Los cuatro perfiles ejecutaron la orden desde la autoridad ordinaria en NVIDIA Turing. Cada ejecución restauró `structure-749` de 50 a 100 HP, cargó cinco monedas una sola vez y conservó el actor, su cuerpo, sus 27 o 28 mallas y el grupo del muro. Hubo 21 o 22 dibujos durante la espera de READY, entre 32 y 46 con el Idle adquirido y un recibo de drenaje por ejecución. En la muestra de `olderMale`, el grupo del muro pasó de una malla visible a dos partes del mismo módulo durante la transición de daño. La lógica existente admite esos cambios por módulo. Los recuentos son muestras funcionales y la cadencia de C4 queda abierta. [Resumen y ABI](performance/native-intact-wall-repair-20261121/validation.json) · [Transición observada](performance/native-intact-wall-repair-20261121/olderMale.json.gz).

```powershell
$env:QA_NATIVE_WATERING_ORIGIN='fresh'
$env:QA_NATIVE_WATERING_KIND='repair'
$env:QA_NATIVE_REPAIR_TARGET='wall'
node tools/guardian/audit_native_watering_idle_world_owner.mjs
```

La selección de 49 archivos pasó 441 pruebas, con nueve omisiones y cero fallos. Las dos variantes de WASM conservaron los exports previos y el build de producto completó el empaquetado. [Regresión](performance/native-intact-wall-repair-20261121/tests.log.gz) · [Build](performance/native-intact-wall-repair-20261121/build.log.gz).

El control posterior de autoridad rechazó una segunda orden de Repair sobre el muro sano. A continuación, la orden de Harvest adquirió Task14 sobre el mismo cuerpo y mantuvo un único `RepairApplied`. Pasaron los tres controles dirigidos de centro intacto, muro intacto y ruina con WASM y el Host simulado.

El caso de ruina necesita revalidar el acceso y adquirir las paradas de las rutas afectadas antes de restaurar la colisión. El rendimiento de C4 y la integración ordinaria de Build al cruzar Farm continúan abiertos.

## Puerta intacta con daño parcial

Una puerta de zarzas restaurada a 30/60 HP deja el roster en `unsupported-cohort`. Una puerta sana con la misma estructura adquiere Idle20 y rechaza Repair por estar a pleno HP. Con el trabajador cerca del vano y una ampliación privada del filtro de HP, la autoridad admite Repair, abre el motor 1000000 y confirma 60 HP, el cuerpo 1 y un solo débito de 5 monedas en Host determinista. El control legacy con el trabajador más lejos dejó la tarea pendiente de asignación. [Controles](performance/native-intact-wall-repair-20261121/damaged-bramble-gate-control.json).

En NVIDIA, la puerta dañada conserva su raíz y dos mallas antes de Repair. Tras ampliar el filtro del motor en la autoridad, Surface rechaza el dueño por HP. Al admitir ese estado también en la comprobación de residencia, el enlace del motor devuelve `Native gate graphics unavailable`. La geometría dañada tiene dos etapas y el enlace actual solo acepta la malla única a pleno HP. La siguiente adaptación debe preparar ambas representaciones según el HP real y mantener el dueño del motor durante la reparación. [Generación de etapas](../../src/rendering/walls-native.js#L3), [enlace gráfico del motor](../../src/rendering/native-gate-gpu-binding.js#L13).

En OpenRA, `Gate.Tick` cambia la ocupación del mapa con la posición de la hoja. `Health.InflictDamage` aplica los HP y retira al actor cuando llega a cero. Esa separación permite conservar el motor de Wild Guardians mientras el daño parcial modifica la representación de la puerta. [Código de Gate](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Traits/Buildings/Gate.cs#L61-L97), [código de Health](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Traits/Health.cs#L175-L207).
