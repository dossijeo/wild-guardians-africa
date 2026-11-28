# Farm24 en el cliente y Host originales

Continúa el [reloj detenido y picking Farm](e-r3-native-farm-arrival-stop-clock-20261117.md), según el [plan principal](integrated-gpu-migration-plan-20261104.md). El cliente y Host originales conservan la plantilla24, esperan la promesa de drain de su dispositivo y aplican la proyección final adquirida por la fuente. Surface/roster, capacidades del draw Worker, hardware y relevos Task/Home siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Referencia y adaptación

Antes de implementar se inspecciona [wgpu v26.0.1, `Queue::on_submitted_work_done`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/queue.rs#L1435) y [`LifetimeTracker::add_work_done_closure`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs#L345). El callback se asocia al trabajo activo que debe finalizar. Se conserva esa separación sobre el hold y el paquete retenido existentes: preparar metadatos no equivale a recibir el ACK ni a adquirir la parada. No se introduce cola, fence, controlador o dependencia.

## Paquete, ACK y adquisición

El cliente exige las capacidades propias de parada y reloj Farm, rechaza plantillas simultáneas de otras familias y conserva una copia de la metadata del paquete. El commit consulta esa copia; mutar los objetos del caller después de READY no cambia la fuente preparada. Una parada exige asociación con proyección antes de completar el commit local.

El Host valida la frontera y la plantilla contra el control directo. La admisión de cada selector Farm usa la lease Farm existente y conserva separadas preparación y adquisición. Antes del ACK comprueba, para cada propietario detenido, un reloj relativo y todos los escalares necesarios: edad, posición, yaw, fase, llegada y fases Run/Walk/Carry. Un paquete genérico o incompleto no obtiene un recibo24.

El ACK se emite sólo después de resolver `device.queue.onSubmittedWorkDone` y nombra el frame retenido exacto. La liberación exige la asociación24 con proyección, la referencia preparada, la frontera adquirida y la misma secuencia de paquete. Rechaza colecciones ajenas o mezcladas antes de instalar. El registro original del controlador instala la prueba; el Host aplica entonces los valores finales y conserva el mismo paquete para adopción y picking.

El transporte de uniforms ya existente reescribe los valores detenidos necesarios durante el replay de passes. La pose procede del cuerpo nativo retenido, no del preview ni de una nueva muestra de ruta. El frame presentado conserva la edad desde el origen adquirido y los valores Float32 que recibió realmente la GPU simulada.

## Evidencia y límites

La [evidencia](performance/native-farm-arrival-stop-remote-validation-20261117.json) recoge 27 casos nuevos y 110 dirigidos. Los cuatro perfiles pasan en dibujo simple y replay, con fuente Farm23→24 genuina, Task14 independiente, publicador/control, cliente/Host originales y puerto real de terreno. Pthread usa el mismo recorrido. El dispositivo, la cola y el dibujo de triángulo son simulados; no son el actor original, Surface ni aceptación hardware.

Las pruebas verifican pose final revalidada durante preparación/drain, buffer presentado y picking, estabilidad de cuerpos/RNG/economía/tareas, un commit lógico al adoptar el batch posterior y cero recursos adicionales después de READY en este fixture mínimo. No se extrapola ese contador a las 3.123 entidades/recursos ni a pipelines o materiales de la escena completa.

Se retiene explícitamente la promesa de drain: mientras no se resuelve, la fuente puede avanzar pero no compromete24 ni cambia el último frame presentado. Este test artificial comprueba orden y propiedad; no prueba continuidad gráfica durante un drain prolongado. La caducidad de la ruta cancela la parada sin revivirla. Se rechazan capacidades ausentes, ACKs alterados, plantillas faltantes/mezcladas/ajenas y uniforms incompletos.

La corrupción inyectada después de serializar el recibo final demuestra otro límite: el commit físico ya puede haberse completado y el resultado síncrono de la fuente puede decir `committed`. El Host detecta el recibo inválido, falla y no presenta ese paquete. No se describe ese caso como rollback ni como error síncrono anterior al commit.

La primera ejecución nueva falla8/8 por una expectativa de fixture: el commit lógico del handle de terreno ocurre en el batch confirmado posterior, no al retornar la operación nativa. Se mueve esa comprobación al punto de adopción; el camino de producto ya había comprometido. Los casos corregidos y ampliados pasan antes de la validación final.

El control negativo elimina únicamente la exigencia de `phase` en el ACK Farm del Host mediante un loader ESM de lectura. Un paquete incompleto llega indebidamente al commit y la prueba falla; árbol y WASM permanecen intactos. Ese fallo intencionado se separa de la regresión final.

Se verifican 373 entradas de validación, 64 inputs/artefactos nativos sin recompilar, los 16 archivos locales ajenos y el worker pthread sin seguimiento. No se anuncia capacidad24 en el draw Worker ni se repite hardware. Continúan Surface/roster/actor original, hardware, relevos y productor integral, guardado UI y continuidad A/A6/B/C. Los huecos históricos Farm23 y la recuperación incremental de los 3.123 recursos siguen abiertos.
