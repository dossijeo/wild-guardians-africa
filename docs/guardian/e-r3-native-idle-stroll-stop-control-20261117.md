# Control directo de la parada móvil preparada

Continúa la [referencia tipada y su fuente nativa](e-r3-native-idle-stroll-stop-data-20261117.md). La preparación de familia12 puede conservar sus propietarios mientras avanzan los cuerpos. Este incremento añade su permiso de metadatos al control existente; todavía no lo conecta a transactor, puertos ni dibujo diferido. A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos.

## Código fuente consultado y decisión

En [`AnimationAction._updateTimeScale` y `_updateTime`, Three r180](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationAction.js), una acción pausada conserva su tiempo local mientras el mixer sigue avanzando. Se adopta la separación entre el avance global y la adquisición de una parada individual. Aquí sólo se implementa su control; el muestreo gráfico final congelado sigue pendiente y no se presume válido por conservar los recursos.

Se contrasta también [`Arena::remove`, Rapier v0.22.0](https://github.com/dimforge/rapier/blob/v0.22.0/src/data/arena.rs): retirar una ocupación es una transición explícita con generación, distinta de conservarla para otro estado. El actor `NeedsPlan` conserva su registro revocado en el mapa existente hasta su siguiente transición o retirada. Ese registro conserva la identidad de la revocación, sin conceder un reloj ejecutable. No hay dependencias, registro histórico ni propietario nuevo.

## Preparación y adquisición

`admitStrollStop` exige la ruta22 previamente instalada, las identidades exactas y todos los propietarios actuales. Su permiso preparado sobrevive al avance del reloj; no tiene `sample` ni `safeUntil` y no permite dibujar una pose anterior.

`installStrollStops` sólo acepta la frontera final nativa, las revocaciones exactas y su watermark recibido. Valida todos los elementos antes de escribir uno; rechaza bootstrap, duplicados y reúsos. Conserva la prueba inmutable sobre cada registro ya revocado e instala las referencias reales de los cuerpos suspendidos. Un propietario `NeedsPlan` no adquiere permiso de cuerpo retenido.

La referencia antigua de suspensión sigue exigiendo su frontera exacta: no se convierte en un alias temporal de la nueva. El permiso del conjunto caduca si cambia cualquiera de sus miembros; el cuerpo que continúa suspendido conserva su permiso individual aunque un compañero reciba otra asignación. Retirada, cambio de época o eliminación del control invalidan los permisos previos.

## Validación y límites

Las [evidencias reproducibles](performance/native-idle-stroll-stop-control-validation-20261117.json) identifican entradas y comandos. Las pruebas nuevas usan fuente22 y parada12 reales en los cuatro perfiles, standalone/pthread; omiten deliberadamente el watermark antes de instalar la parada revalidada. Cubren fuente gráfica no instalada, sustituciones, atomicidad, cancelación y eliminación. Un caso adicional de `NeedsPlan` inyecta eventos sintéticos sólo para comprobar el controlador; no se presenta como evidencia nativa ni de hardware.

Pasan **399 pruebas en 39 archivos, 144.194,7723 ms**, incluidos los 15 casos nuevos y los controles afectados de tareas, Home, Idle, reanudación y publicación. El build pasa en **45,52 s**. Se verifican 133 entradas probadas, los 61 hashes nativos sin recompilar y los 16 archivos ajenos protegidos; el helper pthread sigue sin seguimiento y byte a byte intacto.

NVIDIA/Turing conserva 679 IDs residentes; prepara 68 recursos de protocolo y 120 copias de uniformes (13.408 bytes) y bindings del Host. No crea shaders/pipelines ni copia buffers estáticos/texturas; no asigna después de READY. Hay 54 frames durante el bloqueo de 1.800 ms, ambos picks y drenaje correctos, sin errores GPU/consola/página/transporte. Se inspecciona la captura.

La aceptación GPU repetida utiliza el recorrido anterior, que mantiene la autoridad durante preparación. No demuestra todavía la parada diferida con autoridad continua ni resuelve la recuperación integral incremental de 3.123 recursos.

## Continuación

Conectar template/atestación al transactor y canales existentes, y consumir el estado final en roster, motores y Host sin detener la autoridad. Conservar recursos y usar la frontera ejecutada real para pose, fases y picking. Después continúa Home desde el cuerpo suspendido. Tarea durante paseo, restauración móvil, cohorte/productor ordinarios y recuperación incremental integral siguen pendientes. No se inicia D.
