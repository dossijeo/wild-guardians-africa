# Recarga en frío después de Home19 en Sabana

El perfil `nativeWorkerLifecycle` puede guardar el ataque diurno al centro con un único trabajador sano ya refugiado y un único facóquero. El guardado público conserva la persona y su contrato, el refugio y sus fases, el evento de origen de la incursión y el tramo restante o el ataque lógico en curso del animal. La prueba persistente también se puede volver a guardar en la nueva autoridad mientras el trabajador siga refugiado.

Al reconstruir el mundo nativo, WASM declara primero la ausencia del trabajador en el refugio y le asigna una secuencia nueva. Esa declaración se envía a Draw en el mismo `IntentBaseline` que el reloj y la solicitud del animal. La ruta o el ataque cargado vuelve a adquirir sus recursos en la nueva época. El camino sigue el patrón de inicialización de un agente nuevo a partir de una posición, con un corredor independiente. [DetourCrowd v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L511-L579)

El `RaidEnded` de Game decide si la persona debe volver al centro. La solicitud Farm23 consume una sola vez la ausencia de esa época y conserva la pose y el contrato. El Host compara la solicitud con la declaración original y espera la retirada del actor del raid. En juego continuo sigue usando el recibo de Home19. La retirada del animal, la adquisición del nuevo cuerpo y el primer dibujo del regreso conservan sus permisos existentes.

## Controles

La preimagen rechaza el guardado público después de Home19. En el candidato, el control integrado usa Game, WASM, los dos puertos de producción y un Host con cola GPU determinista. Reinicia durante la aproximación, durante un ataque lógico y durante Retreat. Los tres recorridos conservan los golpes sin duplicar impactos y recuperan Farm23 e Idle con la misma persona y el mismo saldo. Alterar una fase en disco rechaza la carga. Alterar solo la secuencia en el mensaje Farm v2 posterior hace que Draw rechace el permiso y deja sin adquirir el segundo Farm23.

La regresión final de huida, ataque al centro, Retreat, Farm, checkpoint y control Draw pasó 56 de 56 pruebas. El archivo `native-savanna-cold-refuge-impact.tap` tiene SHA-256 `29c618bd36ac1e08dd728b2f4ed666e98afbffec1ff7fc5e72fcef6b3aa8c813`.

```powershell
node --test --test-name-pattern='cold reload' tests/native-farm-raid-flight-savanna.test.js
```

## NVIDIA

El recorrido físico del día 2 de Sabana 712 guardó la aproximación a `structure-2` a t=612,90. Cerró el consumidor original, leyó el archivo y arrancó otra autoridad y otro Draw. La secuencia de ausencia cambió de 9 a 1 y el primer envío válido del animal escribió edad cero, con el trabajador aún en casa. Los dos golpes bajaron el centro a 560 y 540 HP. `RaidEnded` se confirmó a t=649,97. Farm se adquirió a t=653,75 con el cuerpo 2 y la misma pose del refugio. `worker-21` / `person-9` llegó a Idle a t=686,55 con su contrato y saldo de 190. Ambos consumidores drenaron y no se registraron errores. El corte físico precedió al endurecimiento final de las comprobaciones de bootstrap, cubierto por la regresión CPU.

El recibo `native-savanna-cold-refuge-nvidia.json` y el guardado `native-savanna-cold-refuge-nvidia.save.json` están en `E:/wild-guardians-qa/native-menu-20261126`. SHA-256 del recibo `3d0e0a7a307254e05574315a1b42dde83fa7545f6050e29dc5f19cecdf0412bc` y del guardado `3fe4fed72fb4ddc06975ea194a22859cd70294696f2ab3a1a72967ea799c2cc2`.

El arnés local se genera con `.cache/make-savanna-cold-refuge-audit.mjs`, usando el recorrido diurno anterior como base. El mismo navegador abre dos páginas sucesivas. La segunda recibe los bytes leídos del archivo. El perfil de arranque es `{"nativeWorkerLifecycle":true}` y el insumo es `.cache/savanna-daytime-center-physical-input.json`. El binario standalone y el pthread conservan las importaciones y añaden la exportación invocable `nav_intent_restore_refuge_return`.

## Incursión sobre cultivos

La misma ausencia de Home19 permite guardar el ataque diurno a cultivos en Sabana con un centro operativo y un único trabajador sano ya refugiado, sin hechizos activos. Game conserva el cultivo, la reserva y el identificador del golpe. Para una aproximación pendiente, WASM lee el corredor de ese actor, sesión, solicitud y tipo de destino. El fichero solo conserva los puntos y el estado semántico habitual. La autoridad nueva vuelve a preparar su propio paquete.

El control CPU reinicia durante la marcha, durante el golpe y durante Retreat. También vuelve a guardar el corredor mientras retiene el READY de la autoridad nueva. El primer recorrido falla al pedir el guardado en la preimagen. Los cuatro recorridos conservan los blancos `plant-5` y `plant-7`, una sola aplicación de cada golpe y el regreso de la misma persona al centro. Los pares standalone y pthread añaden `nav_animal_pending_crop_points` y `nav_animal_pending_crop_points_ptr`.

La selección completa pasó 60 de 60 pruebas. SHA-256 de `native-savanna-cold-crop-impact.tap` `ceadd65f522117d17e2c7b59fbe8c81e9a25a930f6cdc45d14425c98f7b24b2f`.

En NVIDIA se escribió el guardado de la aproximación a t=614,35. Tras leerlo, Draw presentó al facóquero a edad cero y el trabajador siguió en el refugio. Los golpes `attack-48` y `attack-52` destruyeron `plant-5` y `plant-7`. `RaidEnded` se confirmó a t=674,44. El mismo `worker-21` / `person-9` adquirió Farm con un cuerpo nuevo a t=678,00 y llegó a Idle a t=710,90 con saldo 190 y sin heridas. Los dos consumidores drenaron sin errores.

En el mismo directorio de QA, `native-savanna-cold-crop-nvidia.json` tiene SHA-256 `0dbb087f649157bb6fdef8fa0651ec796666bf6fdae7da45cf36cd8a4e7a4f1021`. El archivo de partida `native-savanna-cold-crop-nvidia.save.json` tiene SHA-256 `68aa69f6555d90e10a859d106607c1b38db6e754b97d3d63aabf0614a0f358e1`. El arnés usa como insumo `.cache/native-flee-sabana-civil-physical-input.json` y el mismo perfil `nativeWorkerLifecycle`.

El [guardado con los dos cuerpos activos](sabana-active-flight-checkpoint-20261127.md) cubre el tramo anterior a Home19 en Sabana sin portón ni Escudo. Los cultivos protegidos y la recuperación de dispositivo durante la recarga requieren sus propios controles. Los criterios de A6, B y C siguen abiertos.
