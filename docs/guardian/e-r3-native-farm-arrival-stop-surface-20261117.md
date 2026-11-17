# Farm24 en Surface y Workers originales

Continúa el [roster Farm24](e-r3-native-farm-arrival-stop-graphics-20261117.md) dentro del [plan principal](integrated-gpu-migration-plan-20261104.md). La parada preparada llega al actor original, al Host y a la adopción temporal confirmada. El draw Worker anuncia las capacidades propias de parada y reloj Farm, versión1. No cierra A6/A/B/C ni inicia D.

## Referencia y decisión

Antes de implementar se inspeccionan [`Queue::on_submitted_work_done`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/queue.rs#L1435) y [`LifetimeTracker::add_work_done_closure`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs#L345) de wgpu v26.0.1. Conservan referencias del trabajo pendiente y asocian los callbacks a su terminación. Se mantiene esa separación entre recurso preparado, finalización del trabajo y adopción, usando el paquete, drain y propietarios existentes. No se introduce cola, fence ni dependencia.

Surface reutiliza `terrainStopProtocol`, ya compartido por publicación y recepción. El descriptor finito elige los campos de plantilla, recibo y asociación12/24; no registra cuerpos ni concede tiempo. La preparación de dependientes, captura, commit y retiro del enlace anterior siguen el recorrido existente.

## Implementación y orden de adopción

Surface copia la plantilla Farm24, la entrega al roster por su campo propio y la conserva en la metadata del paquete retenido y en el recibo READY. Rechaza familias simultáneas y geometría para una parada tipada. El commit exige la asociación de la familia exacta, su proyección final, la referencia preparada y la frontera adquirida; entrega esa prueba a los participantes antes de adoptar el batch y el paquete.

La prueba hardware encontró una diferencia con el fixture inicial: el receptor de estado confirmado aplica el snapshot `native-farm-arrival-held` antes del callback que entrega el recibo al roster. El roster ahora valida primero la asociación y el DTO retenido con el codec existente. Sólo durante la comprobación síncrona de esa prueba puede comparar el snapshot con esa pose. Después instala el candidato validado. Un marcador retenido sin prueba sigue siendo inválido; una referencia equivocada o una pose inventada no cambia el candidato ni adquiere permisos.

El reconciliador de recursos de mundo admite el registro24 sólo como parada de cuerpo, con `chunks` y `removed` vacíos y el batch vacío realmente aplicado. Conserva los controles de orden, autoridad, sesión, tiempo, secuencia y props canónicos. Las familias de movimiento13–23 siguen rechazadas en este canal. Surface comprueba además que la frontera final coincide con la consumida por la preparación de terreno.

El recorrido hardware usa el puerto original de recursos para Farm23 y el puerto original de terreno para Farm24, junto con el control directo del draw Worker. No añade un comando de preparación ni convierte el endpoint genérico de motores en otro preparador de paradas. Game conserva `arriving`, la pose/fases/presupuesto adquiridos e `idleState` nulo. Los relevos Farm→Task/Home y los finales siguen pendientes; no se cambia la prioridad de Task sobre trabajadores `arriving`.

## Evidencia hardware

La [evidencia](performance/native-farm-arrival-stop-surface-validation-20261117.json) registra GPU NVIDIA Turing real, Surface/actores/GLB/bancos originales y Workers separados. La fuente nativa corre en la página del audit; el independiente B es un Home explícitamente preparado del fixture. No equivale al productor ordinario ni al cohort completo.

Farm23 se adquiere antes de preparar24. Mientras el Worker de preparación está bloqueado1.800 ms, la ruta Farm original y el cuerpo independiente avanzan: se registran54 frames. La parada revalida desde el tiempo14,98 hasta17,42 y adquiere la pose física final, no la del preview. La adopción termina en secuencia3, con61 frames posteriores al commit y picking sobre ambos cuerpos.

Se conservan641 IDs residentes de geometría y texturas. La preparación24 crea68 recursos:36 buffers,16 layouts de bind group y16 bind groups. No crea texturas ni buffers de vértices/índices, ni shaders/pipelines nuevos; no destruye recursos residentes. Después de READY crea0 recursos, mantiene los contadores de factories y no hace forks de buffers/texturas. Los forks de uniforms/enlaces pertenecen al paquete preparado y no crecen al adoptarlo.

El control negativo retira únicamente la plantilla24 de la metadata de Surface mediante interceptación de lectura en Playwright. El Host rechaza el paquete antes de adquirir la parada; la fuente conserva Farm23 y no tiene ejecución Farm retenida. El control ESM de pose elimina sólo la comprobación final exacta del roster y provoca el fallo esperado al aceptar indebidamente una pose inventada. Ninguno modifica el árbol ni WASM.

También se repite el recorrido Idle12 en hardware tras compartir Surface y el audit: conserva679 IDs, prepara68 recursos, crea0 después de READY, sin errores GPU y con drain completo. Este resultado comprueba la compatibilidad del recorrido anterior, no la recuperación completa del mundo.

## Continuidad y límites

Los contadores de reutilización no demuestran ausencia de tirones. En las muestras de preparación24 el intervalo máximo es33,46 ms; en las posteriores al commit alcanza64,27 ms, con dibujo de hasta4,82 ms. Las muestras anteriores de Farm23 contienen un intervalo de86,81 ms. Son máximos de esas ventanas capturadas, no una afirmación sobre todos los intervalos de la ejecución. Se conserva una traza CDP para investigar estos costes; no se atribuyen sin evidencia a compilación, drain u otro mecanismo concreto.

Los primeros intentos descubren dos problemas del fixture y dos de producto. El fixture esperaba assets sin esperar la frontera del terreno temporal y reanudaba su pump sin restablecer el reloj pausado; ambos se corrigen sin relajar el producto. El tercer intento llega al snapshot retenido antes del recibo y el cuarto al reconciliador que aún cerraba24. Las correcciones descritas y las pruebas de orden/reconciliación preceden al quinto intento positivo. Los errores posteriores de fence al abortar esos intentos no se presentan como su causa original.

Pasan105 pruebas dirigidas y la regresión seleccionada de230 archivos, con una omisión opcional; el build termina correctamente. La evidencia conserva hashes de375 entradas,64 inputs/artefactos nativos sin recompilar y los16 archivos locales ajenos. No se declara corregidos los siete fallos históricos fuera de esta selección.

Quedan los relevos y finales Farm, cohort/contratos/urgencia/gates/raid, productor ordinario, guardado UI y recuperación, planificación de preparación y continuidad integral. La recuperación incremental de los3.123 recursos y la eliminación de los huecos medidos siguen abiertas. La aceptación del plan mantiene el orden A/A6 → B1–B7 → C antes de D.
