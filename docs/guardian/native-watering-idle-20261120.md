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

Las ocho ejecuciones partían de un trabajador estacionario tras Farm. Una comprobación posterior arrancó `youngMale` en frío y completó tanto Plant como Water con el mismo cuerpo y los 36 propietarios de geometría. A partir de ahí se reprodujo y corrigió la asignación de las dos acciones durante Idle22 en marcha. Quedan las demás adversidades de la familia y C4. [Arranque en frío](native-idle-walk-handoff-20261121.md), [relevo desde el paseo](native-moving-idle-task-handoff-20261121.md).

El Worker y el consumidor NVIDIA reprodujeron el mismo fallo desde ese arranque en frío. Plant emitió `CropPlaced` mientras `youngMale` y `olderFemale` seguían andando. Water se activó al vencer el riego de un cultivo guardado durante el paseo de `youngMale`. La prueba confirmó dibujos del ticket Idle22 en los dos controles más recientes. En los tres casos, el avance siguiente intentó confirmar la propuesta de tarea mientras Game conservaba el actor en `native-idle-stroll` y sin tarea. La autoridad abortó con `Native task proposal became stale before commit`. [Secuencias y recibos de la GPU](performance/native-watering-idle-20261120/moving-idle-crop-task-baseline.json).

El primer candidato completó el recorrido temprano en NVIDIA al aplazar la asignación hasta la parada. Con Water cerca del extremo, el avance alcanzó el destino real del paseo y canceló Stop12. El productor encontró elegible REST21 y lo intentó 559 veces entre las secuencias 266 y 824. La operación devolvió `unsupported` antes de enviar su preparación gráfica. La revisión posterior conserva el ancla ejecutada y completa REST21, Task14 y el riego sobre el mismo cuerpo. [Contraste de la llegada](native-moving-idle-task-handoff-20261121.md), [traza del aborto anterior](performance/native-watering-idle-20261120/moving-idle-crop-task-baseline.json#L272).

## Invalidación ordinaria del cultivo asignado

En la reproducción anterior, Despertar confirmaba la bendición y retiraba la tarea. WASM conservaba el propietario del cuerpo y el siguiente avance fallaba antes de asignar el cultivo nuevo. La autoridad y WASM reprodujeron el fallo con Water antes de adquirir Task14, durante la marcha y durante Action15, y con Plant durante la marcha. El ensayo usa Host determinista. [Casos y pasos](performance/native-watering-idle-20261120/target-invalidation-baseline.json). La autoridad ahora rechaza Despertar sobre un cultivo con una asignación nativa hasta preparar el relevo. La prueba con Water en marcha conserva la tarea, la carga y la locomoción. Pasaron 38 pruebas dirigidas y la compilación WebGPU. El relevo preparado ya cubre estas fases de la partida ordinaria.

El fallo ocurre después de BlessingApplied. La tarea desaparece, Game deja al trabajador en Idle y el ejecutor conserva el dueño anterior. El siguiente Plant se confirma, pero advance devuelve `Native task game cohort contains an unsupported mover`. El recibo registra los estados y el orden de las operaciones en los cuatro casos. El relevo debe cancelar solo la propuesta cuando aún espera READY, y devolver el cuerpo al planificador mediante un sucesor preparado cuando ya adquirió la ruta o la acción. El mecanismo de parada Task25 ya retiene el cuerpo durante el relevo a Home. [Parada Task25](native-task-stop-admission-20261120.md).

En el código de OpenRA, `Activity.Cancel` termina de inmediato las actividades aún en cola y deja en Canceling a las que empezaron hasta que el actor queda coherente. `HarvestResource` comprueba el objetivo antes de aplicar la consecuencia y libera su reserva en `OnLastRun`. En DetourCrowd, `resetMoveTarget` limpia la petición y conserva el agente. Estos contratos orientan la separación entre revocar una propuesta y transferir un cuerpo en ejecución. [OpenRA Activity](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Game/Activities/Activity.cs#L136-L194), [OpenRA HarvestResource](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Activities/HarvestResource.cs#L72-L109), [DetourCrowd](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L609-L625).

## Despertar preparado sobre la asignación

La orden usa el FIFO y la preparación existentes. Hasta la confirmación conserva el cultivo, la asignación y la carga. Cuando Task14 espera recursos, revoca su petición exacta y conserva Idle20 o Idle21 con el comprobante y el horizonte originales. El Host coteja el recibo con la petición y la presentación que ya posee. Si Idle21 llegó al final, continúa su sucesor ordinario.

Si Task14 sigue andando, la autoridad adquiere la parada Task25 y conserva la pose exacta mientras prepara Idle20. Si la ruta llegó o la acción adquirió su cuerpo, usa directamente ese origen. Confirmar Idle20 sustituye al dueño anterior, aplica Despertar y libera la asignación en la misma frontera. Abortar después de Task25 conserva la carga y el cultivo. El productor prepara Idle20 con la pose retenida y asigna de nuevo la tarea original.

En la prueba física de espera, el Worker recibió el ACK tardío de Task14 cancelada y mantuvo el ticket Idle21 que ya dibujaba. Plant en marcha y Water durante Action15 conservaron las geometrías de trabajador y los cuerpos originales. Las tres ejecuciones confirmaron un Despertar y drenaron. El Host determinista también comprobó el relevo tardío desde la ruta llegada, el siguiente Plant con un solo riego y la recuperación tras abortar. El [relevo antes de la primera admisión de Action15 restaurada](native-pending-action-bless-handoff-20261123.md) ya pasó en NVIDIA para Plant y Water. [Recibos](performance/native-watering-idle-20261120/target-invalidation-handoff-20261121.json).

Pasaron 363 pruebas de autoridad, control y recursos, 18 pruebas finales dirigidas, siete controles nativos por modalidad WASM y tres del recibo. El build WebGPU completó el empaquetado. Se conservaron las interfaces anteriores y los 16 archivos locales protegidos. C4 a 60 Hz sigue abierto.

## Acción restaurada antes de su primera admisión

Al cargar Plant o Water con 0,60 s de acción acumulada, la primera preparación de Action15 quedó retenida. Despertar tuvo vista previa válida y devolvió «El Despertar necesita preparar el relevo del trabajador asignado». La asignación, la carga y el progreso se conservaron. Al liberar la preparación, la acción adquirió el cuerpo 1 y continuó desde el progreso guardado. Los dos casos usan WASM y un Host determinista. [Recibo](performance/native-watering-idle-20261120/target-invalidation-restored-pending-20261123.json).
