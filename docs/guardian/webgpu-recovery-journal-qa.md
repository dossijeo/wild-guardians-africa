# Recuperación QA de presentación WebGPU

La opción QA conserva un checkpoint de presentación candidato y solo lo reconoce como base tras el ACK exacto del Worker gráfico. Un journal acotado retiene, desde esa frontera, las publicaciones completas y sus eventos, poses e invalidaciones, así como los lotes de terreno previos a cada publicación. El replay envía el checkpoint sin volver a emitir sus eventos y entrega después cada lote de terreno y publicación en orden, esperando un ACK con sesión, identificador, fase y secuencia antes del siguiente. Las publicaciones siguen guardando sus fronteras originales: este mecanismo no consolida snapshots por tick.

La admisión de simulación se detiene durante el reenganche QA. El presupuesto usa límites configurables de entradas y una estimación de bytes; la sobrecarga real del heap y las copias temporales no están incluidas exactamente. No existe todavía renovación automática de checkpoint. El journal no está listo para producción ni garantiza funcionamiento prolongado.

La recuperación rechaza un journal con error de canal, candidato pendiente, terreno incompleto, secuencia distinta de la autoridad o saturación. La autoridad permanece detenida ante esos errores y se informa del fallo; no se reengancha silenciosamente con un hueco. La recuperación no constituye rollback físico de la simulación.

## Evidencia

- Prueba real QA WebGPU de sustitución de Worker y canvas: checkpoint 170, replay hasta 197 y continuación hasta 213, con 25 chunks. El intervalo observado estaba pausado y no demuestra por sí solo replay de eventos o poses físicas.
- Una segunda prueba real restauró una pose Rapier activa: base 816 y replay hasta 853. La caída y el impacto eran anteriores a la base; no demuestra replay de un evento posterior.
- Se reprodujo saturación: base 302, through/ACK 430 y 128 entradas, con el canal visual al día pero órdenes y pasos pendientes. Sin renovación, el umbral detiene el despacho e impide ejecutar el checkpoint que permitiría liberar el journal. Esto sigue pendiente.
- Se está comprobando un evento posterior al checkpoint. Hasta completar esa prueba no se afirma que todos los efectos/eventos y su deduplicación estén verificados en juego real.

Pruebas dirigidas reproducibles con Node 20 del repositorio:

```powershell
.\.cache\tooling\node20.exe --test tests/presentation-recovery-journal.test.js tests/presentation-recovery-replay.test.js tests/visual-publication-stream.test.js tests/host-publication-queue.test.js
```

34 pruebas pasaron tras añadir las guardas fail-closed. Cubren orden, ACK y cursor, eventos y poses en publicaciones, tandas de terreno, límites, duplicados, journal incompleto y overflow. Son pruebas de contrato; no sustituyen validación visual, rendimiento sostenido o recuperación real tras pérdida de dispositivo.

## Renovación experimental sobre comandos existentes

La vía QA solicita un nuevo checkpoint al llegar a la mitad del límite del journal, adjuntándolo al siguiente comando que ya le corresponde por orden. No encola un snapshot adicional ni adelanta órdenes. El candidato no reemplaza la base hasta su ACK exacto; una solicitud explícita de checkpoint espera en su posición mientras hay otro candidato. La publicación que lleva el checkpoint constituye una frontera que no se fusiona con ticks vecinos.

Una comparación determinista con dos Workers de simulación y Rapier reales ejecutó 120 pasos posteriores a un impacto, con pose activa en los 120 y 30 checkpoints adjuntos a pasos normales. Los snapshots, eventos y poses físicas activas fueron idénticos entre ambas ejecuciones. Esta prueba cubre ese impacto y no demuestra equivalencia de todos los escenarios físicos. Las pruebas unitarias también ejercitan 400 publicaciones con ACK inmediato, superando 128 y promoviendo bases sucesivas; no prueban rendimiento sostenido del juego ni ausencia de bloqueo si el renderizador deja de responder.

La copia periódica completa del terreno, la retención de snapshots y la contrapresión si falla o se demora el ACK siguen siendo limitaciones de QA. No hay recuperación de pérdida espontánea del dispositivo, ni validación completa del replay de eventos posteriores; esta renovación no convierte el mecanismo en una solución de producción ni elimina el acoplamiento temporal.

En la renovación automática, el Worker gráfico vivo registra ahora el checkpoint como base de recuperación sin reconstruir los chunks que ya recibe por su canal de terreno. Tampoco descarta mensajes tardíos de ese canal. Los checkpoints explícitos y la reconstrucción de un Worker nuevo siguen aplicando la base completa. Las pruebas verifican el ACK exacto, la recepción de terreno tardío y el envío de una base automática completa al replay. El cambio elimina una reconstrucción periódica de geometría e instancias, pero no se ha medido todavía su efecto sobre la memoria ni se ha demostrado que explique la espera observada.

## Auditoría de evento posterior: resultado inconcluso

Tras introducir la renovación se inició `tools/experiments/audit_live_webgpu_reconnect_event.mjs` contra Vite local, con Edge headless y `--enable-unsafe-swiftshader`. La prueba alcanzó el arranque de partida, confirmó un backend WebGPU y un actor preparado, y entró en la etapa de checkpoint. No se observó confirmación del checkpoint ni finalización de la prueba. La salida quedó en el hito `QA stage: checkpoint`; tampoco se observó el diagnóstico posterior al límite instrumentado. Por tanto, no se alcanzaron ni el evento posterior ni el reenganche.

Durante la espera, el proceso GPU de esa sesión Playwright creció aproximadamente de 3,998 a 4,039 GB y un renderer de 3,561 a 3,595 GB entre dos sondeos consecutivos. Solo se identificó esa familia de procesos Edge. Se cerró exclusivamente la sesión de prueba para proteger la memoria del equipo. Estas cifras son conjuntos de trabajo observados en Windows, no mediciones de memoria GPU ni un benchmark de producción. No se ha determinado qué causó el crecimiento, la espera o la ausencia de diagnóstico; puede intervenir el laboratorio, el navegador o el juego. No se debe interpretar como evidencia de éxito ni de fallo concreto de la renovación. Se deben investigar las asignaciones antes de repetir una carga pesada.
