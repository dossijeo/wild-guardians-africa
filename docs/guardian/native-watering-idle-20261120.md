# Water y Plant completan el riego sobre el cuerpo original

Game aplica el primer riego de `initial` y los riegos posteriores de `water` cuando el mismo cuerpo adquiere su presentación estacionaria. La regla existente de alcance comprueba la posición ejecutada y `waterPlant` satisface el primer riego debido. Game retira la tarea y emite un solo `WaterSatisfied` si cambió el cultivo. El planificador puede asignar inmediatamente otra tarea al trabajador.

La causa reproducida era común a las dos acciones. Action15 llegaba a su final nativo y conservaba su pose, pero la única consecuencia disponible era Carry16 con una caja. Leímos `HarvestResource.Tick` y `Activity.TickOuter` de OpenRA para contrastar la comprobación del objetivo, la finalización por actividad y el relevo del actor. Godot conserva la resolución de pistas dentro de `AnimationMixer`. Se reutilizan la acción, las variantes visuales y la admisión Idle20 de Wild Guardians. [Diagnóstico anterior](native-watering-action-dispatch-20261120.md), [OpenRA HarvestResource](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Activities/HarvestResource.cs), [OpenRA Activity](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Game/Activities/Activity.cs), [Godot AnimationMixer](https://github.com/godotengine/godot/blob/4.4-stable/scene/animation/animation_mixer.cpp).

El puente prepara Idle con el cuerpo, pose, fases, época y secuencia de la Action15 ya ejecutada. Mientras haya una preparación pendiente conserva la asignación del cultivo. La admisión revalida la acción, el objetivo, la comprobación física y el riego debido. La publicación causal retira la acción y el Host coteja esa transición con el paquete preparado. El roster prepara Idle sobre el actor en uso y retiene la presentación anterior hasta el relevo. La referencia opcional al origen de riego usa los canales Idle20 y de recursos existentes. Los dos exports añadidos corresponden a la preparación y a la lectura de ese origen.

## Validación en hardware

Edge con NVIDIA Turing, un perfil `youngMale` por ejecución. Se carga una partida con progreso semántico de la acción y la autoridad Worker adquiere permisos nuevos. El preparador retiene READY más de 700 ms mientras avanzan Game y el consumidor. Conserva el riego pendiente hasta liberar el paquete, confirma Idle20, publica el efecto y adquiere la segunda Task14 creada por Game. Se verificaron el mismo cuerpo físico y raíz del actor, los dibujos de Idle20 y el drenaje al cerrar la GPU.

| Acción | Dibujos mientras READY esperaba | Dibujos con Idle20 | `WaterSatisfied` | Segunda Task14 |
| --- | ---: | ---: | ---: | --- |
| Water | 22 | 56 | 1 | Cuerpo 1 |
| Plant (`initial`) | 21 | 63 | 1 | Cuerpo 1 |

El primer intento de la auditoría adjuntó recursos antes de que estuvieran preparados los actores. El segundo confundió la segunda asignación ya creada por Game con la tarea antigua. El harness espera los propietarios iniciales y compara ahora ambas identidades.

Las cinco pruebas dirigidas pasan, incluido el control Harvest. Standalone y pthread rechazan la preparación prematura, la secuencia incorrecta y la pose modificada, y conservan la acción tras cancelar Idle. Se recompilaron los dos WASM con los flags canónicos y se verificaron las interfaces anteriores. El build de producto pasó.

La regresión de 346 archivos terminó con 4.168 aprobadas, 23 omitidas y 8 fallos. Los ocho casos dieron el mismo fallo al cargar los 12 archivos de producto del padre `a17a213b7`, incluidos ambos WASM y el factory, en sus ubicaciones originales y sobre los mismos tests del checkout. El control del padre selecciona solo esos ocho casos. Se conservan ambos TAP y las fuentes del contraste identificadas por SHA. [Recibo de la regresión](performance/native-watering-idle-20261120/validation.json).

Con Vite disponible en el puerto 5218 y Playwright en la ruta indicada por `PLAYWRIGHT_MODULE` o en el entorno de QA existente:

```powershell
$env:QA_NATIVE_WATERING_KIND='water'
node tools/guardian/audit_native_watering_idle_world_owner.mjs
$env:QA_NATIVE_WATERING_KIND='initial'
node tools/guardian/audit_native_watering_idle_world_owner.mjs
```

## Partida ordinaria desde Farm

Dos ejecuciones adicionales empiezan con el trabajador de granja y dejan que Game decida la asignación. En Plant se envía una orden real sobre terreno válido y se comprueba el evento `CropPlaced`. En Water, Game avanza un cultivo existente hasta que vence su siguiente riego. Se observa la cadena completa Task14 → Action15 → Idle20 en la misma autoridad Worker y Surface, con un único `WaterSatisfied` en cada partida. Se retienen el cuerpo, la raíz, los huesos y las 28 mallas con sus geometrías originales. El cierre quiesce el productor antes de retirar el consumidor.

| Origen de la tarea | Dibujos durante READY retenido | Dibujos con Idle20 | Drenaje |
| --- | ---: | ---: | --- |
| Orden Plant | 22 | 32 | Completo |
| Checkpoint Water vencido | 22 | 30 | Completo |

```powershell
$env:QA_NATIVE_WATERING_ORIGIN='fresh'
$env:QA_NATIVE_WATERING_KIND='initial'
node tools/guardian/audit_native_watering_idle_world_owner.mjs
$env:QA_NATIVE_WATERING_KIND='water'
node tools/guardian/audit_native_watering_idle_world_owner.mjs
```

La comprobación del 21 de noviembre añadió los otros tres perfiles a los dos casos iniciales de `youngMale`. Las ocho ejecuciones ordinarias en NVIDIA Turing conservaron cuerpo, raíz, huesos y las 27 o 28 mallas originales durante el riego. Cada ejecución publicó un `WaterSatisfied`, produjo entre 21 y 23 dibujos durante el READY retenido y entre 27 y 32 con Idle20 adquirido, y confirmó el drenaje. El runner selecciona el perfil con `QA_NATIVE_WORKER_PROFILE` en modo `fresh`. [Resultados por perfil](performance/native-watering-idle-20261120/worker-profiles.json).

La entrada validada parte de un trabajador estacionario tras Farm. Quedan dos fallos transversales reproducidos y derivados a Astra. El arranque desde Idle20 frío podía llegar a la preparación antes de que estuviera disponible la variante Walk. Una orden Plant válida durante Idle22 en marcha podía quedar con una propuesta de asignación obsoleta. Siguen pendientes las adversidades de la familia y C4. [Recibos de hardware, hashes y fallos abiertos](performance/native-watering-idle-20261120/validation.json).
