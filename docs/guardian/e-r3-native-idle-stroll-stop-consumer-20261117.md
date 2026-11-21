# Suspensión gráfica del paseo sobre los propietarios existentes

Continúa la [fuente nativa de parada explícita](e-r3-native-idle-stroll-stop-source-20261116.md) y la [fuente Home desde el cuerpo suspendido](e-r3-native-idle-moving-home-source-20261116.md). Este incremento completa el adaptador tipado, el transporte de la propuesta sin geometría y su consumidor original. No cierra A6/e-R3/e-R4/f-R4/A/B/C ni habilita el productor ordinario.

## Referencia y decisiones

Se leyó el código instalado de [`Renderer.compileAsync`, Three r180](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Renderer.js): guarda el contexto, la función de render y las promesas de compilación, y restaura el contexto anterior después del recorrido temporal (líneas 854–858 y 952–958). Se adapta ese patrón mediante la captura reversible que ya tiene nuestro coordinador: los cuerpos y motores participan en la misma admisión y restauración, sin crear otra escena, coordinador, caché o dependencia.

Las decisiones nativas de conservar agente y comprobar su generación siguen las referencias de código Detour/Rapier documentadas en el incremento de fuente. No se reemplaza el cierre analítico existente ni se introduce un algoritmo propio para esta integración.

## Implementación y propiedad

- `stopNativeIdleStrollAfterGpuQuiescence` obtiene la asociación 22 vigente y usa la familia 12 del transactor de mundo. La entrada genérica también exige esa asociación completa y un preparador con paquete retenido: no permite eludir la preparación llamando directamente al mutador. Sesión, actor y asignación conservan sus 53 bits; slot y generación conservan sus 32 bits.
- El codec de propuestas, el publicador de terreno y la reconciliación de publicaciones aceptan 12 exclusivamente con cero cambios de geometría. La propuesta exige efectos de parada reales. Usa el canal de terreno existente, sus créditos, cancelación y adopción de una frontera vacía; no disfraza una parada como upsert de un chunk. La Surface no interpreta 12 como recursos de movimiento de puerta.
- El coordinador admite un batch sin miembros terreno/bioma cuando contiene participantes dependientes válidos. Conserva los mismos tickets, captura/restauración, rollback, finalización y retirada. Una reserva en su mapa existente permite que `dispose` cancele también ese batch; no modifica el orden o las revisiones de chunks.
- La Surface prepara los cuerpos y motores proyectados contra la residencia visible sin cambios. El roster y el movimiento suspendido comparten la textura de ruta y los bancos del actor original; la publicación no mueve el cuerpo, cambia el RNG ni crea otro actor.
- La prueba de picking encontró un error real después de revalidar una ruta: el roster usaba `previous.packet.startTime`, aunque el movimiento retenido ya tenía otra época. El movimiento expone su `clockEpoch` del mismo `table` que etiqueta el uniforme y el roster consulta esa época. La regresión cubre revalidación, suspensión, textura compartida y retirada del predecesor.

## Validación

La evidencia reproducible está en [el registro de validación](performance/native-idle-stroll-stop-consumer-validation-20261117.json).

La fuente y ambos transportes son reales en las pruebas de CPU; los recibos y participantes gráficos de esas pruebas son dobles explícitos. Standalone y pthread cubren commit de la parada y rechazo al avanzar el reloj durante preparación. Se comprueban también asociación falsificada, paquete sin retención, cuerpo/slot/RNG conservados, permiso directo de suspensión y continuación del compañero. Las pruebas del canal exigen adopción de la frontera sin cambiar revisiones ni reconstruir el lote ordinario. El coordinador cubre captura, restauración al fallar, rollback de cuerpos/motores y cancelación por disposición durante admisión.

La aceptación NVIDIA/Turing usa fuente nativa, canal temporal de terreno, control directo, actor/bancos/roster/Surface/Host originales y GPU real. Publica y adopta primero la vista Game ejecutada del paseo, y después prepara la suspensión contra ese mismo estado. No relaja la validación del propietario cuando una publicación cambia el estado de Game.

| Comprobación del relevo de parada | Resultado |
|---|---:|
| IDs residentes de geometría y texturas conservados | 679 |
| Texturas o buffers estáticos nuevos/retirados | 0 |
| Shaders, pipelines y pipeline layouts nuevos | 0 |
| Recursos nuevos de protocolo durante preparación | 68: 36 buffers de uniformes, 16 bind groups y 16 layouts |
| Copias internas del Host durante preparación | 120 uniformes, 13.408 bytes y 120 bindings |
| Copias de buffers estáticos o texturas del Host | 0 |
| Asignaciones de protocolo/Host después de READY | 0 |
| Frames del paquete suspendido durante bloqueo de 1.800 ms | 54 |
| Avance del reloj dibujado después del commit | 1,76 s |
| Avance independiente del compañero después del commit | 2,592 unidades |
| Picking del cuerpo detenido y del compañero | Ambos correctos |
| Adopción / retirada | `ready`, secuencia 6, drain confirmado |
| Errores GPU, consola, página o transporte | 0 |

Se inspeccionó la captura confirmada. Los recursos de protocolo y las copias internas se contabilizan por separado: conservar IDs residentes no significa que preparar sea gratuito.

Pasan **231 pruebas en 21 archivos, 67.807,4214 ms**, incluida la regresión de efectos nativos y los consumidores de movimiento/terreno afectados. Los 61 hashes de fuente/build/artefactos nativos coinciden con el build validado de la fuente 12; no se recompila WASM innecesariamente. Se mantienen los 16 archivos ajenos protegidos y el helper pthread original sin seguimiento. El build de producto pasa en **48,37 s**.

## Siguiente dependencia pendiente

**El reloj de autoridad se mantiene durante la preparación de esta aceptación de parada.** La transacción genérica exige la frontera temporal exacta y rechaza correctamente un candidato si el reloj avanza. Después del commit, cuerpo detenido y compañero sí continúan dibujándose con el reloj emitido. Esta evidencia no demuestra continuidad independiente durante la preparación móvil ni elimina todavía ese posible tirón.

El siguiente punto es preparar/revalidar la suspensión con la pose ejecutada final mientras avanza la autoridad, antes de conectar la petición Home de la fuente ya implementada a control/Game/puertos/roster/Surface. No se permite reutilizar una pose anterior con una frontera nueva. Siguen pendientes tarea durante paseo, restauración móvil, cohorte/productor ordinarios y recuperación integral incremental de los 3.123 recursos. No hay cambios de dependencias ni inicio de optimización D.
