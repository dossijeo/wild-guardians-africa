# Despertar antes de adquirir una Action15 restaurada

## Problema y corrección

Al restaurar Plant o Water, el guardado conserva 0,60 s de Action15. Antes, la vista previa de Despertar era válida y el relevo se rechazaba mientras esperaba su primera preparación gráfica. [Control anterior](performance/native-watering-idle-20261120/target-invalidation-restored-pending-20261123.json).

La fase 6 de `NativeTaskCancellationSource` acredita la declaración restaurada pendiente mediante el ABI existente de 20 doubles. WASM comprueba la tarea, el objetivo, la reserva y el cuerpo. Idle20 usa la preparación, validación y adquisición existentes. El control directo exige sesión, secuencia y origen exactos.

El productor cancela la preparación anterior de Action15. La tarea, la carga de Despertar y el tiempo guardado se conservan hasta adquirir Idle20. Si se cancela Idle20, la preparación ordinaria de Action15 vuelve a empezar desde 0,60 s. La preparación gráfica revalida el actor, su pose, la tarea y su progreso.

## Evidencia y ejecución

Los cuatro controles de autoridad WASM y Host determinista verifican Plant y Water con adquisición o cancelación. Cubren pausa, reanudación, rechazo de una declaración de otra sesión, secuencia, origen, fase o época, un solo efecto y el mismo cuerpo. Los tres controles gráficos verifican identidad de actor y geometrías, reversión y rechazo por progreso o marcador cambiado. Pasaron 44 pruebas dirigidas de integración, incluida restauración con pthread. El control con la autoridad y WASM anteriores se detiene antes de preparar Idle20.

Los controles se ejecutan con los WASM canónicos y Node 20.

```powershell
node --test tests/native-pending-action-bless.test.mjs tests/native-pending-action-bless-graphics.test.mjs tests/native-awakening-task-handoff.test.js tests/native-initial-idle-body-control.test.js tests/native-task-action-restoration.test.js
```

Las variantes standalone y pthread conservan importaciones, exportaciones y versiones de la interfaz. El módulo JavaScript de pthread coincide byte a byte.

El build WebGPU Worker pasó en 63 s. La regresión de impacto pasó 813 pruebas en el primer recorrido. Cuatro archivos de Idle exterior se interrumpieron por el límite de 45 s de ese recorrido. Los cuatro terminaron al repetirlos sin ese límite y pasaron sus 120 pruebas.

## Patrones consultados

- La disposición y los callbacks del cargador glTF de Babylon comprueban la vigencia del dueño al terminar la preparación. El canal de Wild Guardians aplica ese patrón al resultado tardío de Action15. [Babylon.js 8.0.0 glTFLoader](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/loaders/src/glTF/2.0/glTFLoader.ts#L300-L506).
- El cargador de Godot conserva la identidad de la solicitud pendiente y comprueba su estado al completarla. La fase 6 usa la declaración nativa existente para acreditar el relevo. [Godot 4.4 ResourceLoader](https://github.com/godotengine/godot/blob/4.4-stable/core/io/resource_loader.cpp#L522-L837).

## Prueba física

En Edge con NVIDIA Turing, Plant y Water conservaron el cuerpo 1 y dibujaron Idle20 con el ticket 3. Mantuvieron la tarea, la carga y los 0,60 s con READY retenido durante ocho y siete dibujos, respectivamente. Al liberar el READY anterior de Action15, el canal descartó su resultado. Después de adquirir Idle20 se aplicó un solo Despertar. Se conservaron 959 buffers residentes comparables en Plant y 1.003 en Water. Los dos consumidores drenaron sin errores. [Recibos físicos](performance/native-watering-idle-20261120/target-invalidation-restored-physical-20261123.json).

Los mayores intervalos del Host fueron de 108,6 ms en Plant y 83,8 ms en Water. Ambos aparecieron en repeticiones sin ticket, con duraciones instrumentadas de 2,7 y 2,6 ms. Entre sus dibujos, la traza a 30 Hz registra trabajo de `CommandBufferService` en `WebGPUDecoderImpl` dentro del hilo `CrGpuMain`, sin un callback intermedio de dibujo. Queda identificar el comando de Dawn y su contribución al intervalo. C4 sigue abierto.
