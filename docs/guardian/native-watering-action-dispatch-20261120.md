# Water y Plant en el productor ordinario

La cadena de contratación, cosecha, transporte, entrega y vuelta a casa ya se verificó en GPU física con los cuatro perfiles. Desde la entrega se verificó también la adquisición de una segunda tarea sobre el cuerpo original. Son recorridos distintos del fin de turno durante una Task en movimiento. [Home y ausencia](native-post-settlement-home-20261120.md), [segunda tarea](native-post-settlement-next-task-20261120.md).

## Frontera reproducida

En Game con WASM instalado, `initial` y `water` adquirieron Task14, llegaron a 0,83 m del mijo, pasaron `canWaterFrom` y completaron Action15. Se usaron plantas vivas con su primer riego debido o con el primero satisfecho y el siguiente debido, respectivamente. El cuerpo siguió asignado a la tarea, el riego permaneció debido y hubo cero `WaterSatisfied`. La entrada de consecuencia devolvió `unsupported` antes de solicitar un paquete gráfico. El productor ordinario llegaba a intentar esa entrada para ambas acciones completadas. La prueba automática reproduce el despacho en una autoridad restaurada que adquiere Action15 por los canales existentes con un doble gráfico.

## Decisión

OpenRA comprueba la elegibilidad y consume el recurso en `HarvestResource.Tick`. `Activity.TickOuter` finaliza la actividad concreta y entrega el mismo actor a la siguiente. Godot aplica su mezcla visual dentro de `AnimationMixer`, que conserva una caché tipada de pistas. Wild Guardians mantiene su selección por la acción ejecutada y reutiliza el reloj, las variantes gráficas y la residencia existentes. [OpenRA HarvestResource](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Activities/HarvestResource.cs), [OpenRA Activity](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Game/Activities/Activity.cs), [Godot AnimationMixer](https://github.com/godotengine/godot/blob/4.4-stable/scene/animation/animation_mixer.cpp).

El productor solo solicita Carry16 cuando el WASM confirma que terminó una acción Harvest. `initial` y `water` conservan su pose, asignación y objetivo hasta que exista la consecuencia preparada que aplica `canWaterFrom` y `waterPlant` y devuelve el mismo cuerpo al flujo de tareas. La acción visual y el paso del reloj conservan sus permisos actuales. No se cambia el productor legado ni se introducen familias de recursos, relojes, dependencias o rutas nuevas en este avance.

## Validación

Las dos pruebas nuevas fallaron con el productor anterior. Registraba `task-consequence` al final de la acción. Con la corrección pasaron las 269 pruebas de la selección dirigida, incluida la secuencia ordinaria Harvest → Carry → entrega, y compiló el build de producto. La comprobación de Water y Plant mide la autoridad y los recibos con un doble gráfico. Quedan el efecto y su recorrido en GPU física.

```powershell
node --test tests/native-intent-production-authority.test.js
```

## Siguiente punto

La próxima integración comparte la regla de riego entre `initial` y `water`. Debe verificar el objetivo y la posición al confirmar la transferencia estacionaria y publicar `WaterSatisfied` una sola vez. Task25, los motores de puerta y C4 conservan sus aceptaciones propias.
