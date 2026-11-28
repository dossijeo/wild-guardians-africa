# Farm terminada → Idle en la Surface original

Continúa el [actor Farm23 → Idle21](native-farm-arrived-idle-cycle-graphics-20261118.md) y el [plan integrado](integrated-gpu-migration-plan-20261104.md). Se valida el relevo directo desde la llegada real23, sin fabricar20/24, en el actor original, Surface, puertos de recursos/control, Host y GPU NVIDIA/Turing. La autoridad del ensayo está en página y el ancla cargada y el actor Home independiente están preparados expresamente. No cierra el productor ordinario, cohort, recuperación integral ni aceptación de plataforma/cadencia. A6/A/B/C abiertos; D no iniciado.

## Referencias y adaptación

Se revisa el código real de [`LifetimeTracker::triage_submissions` y `schedule_resource_destruction` de wgpu26](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs#L296): el trabajo completado determina cuándo soltar referencias y retirar recursos. Se contrasta con [`Mesh.copy` de Three r180](https://github.com/mrdoob/three.js/blob/r180/src/objects/Mesh.js#L111), que comparte geometría/material. Se conservan el actor residente y la retirada diferida existentes. El ensayo utiliza los mecanismos ya implementados de Idle21, plantilla preparada, quiescencia, puerto directo y asociación instalada. No modifica mecanismos de producto ni añade dependencias.

La fixture incorpora una planta manual viva antes de crear la autoridad, para que el ancla original contenga el extremo Farm. Hasta la adquisición real21, Game sigue proyectando Farm `arriving`, sin Idle semántico anticipado. Después publica la proyección real21 y adopta la secuencia5. Reutiliza los gates de terreno coordinado, espera de terreno listo y cámara inicial noreste del ensayo Home.

## Identidad, fase y selección

Las ejecuciones visual y sin capturas conservan650 IDs GPU de geometrías/bancos inmutables, raíz/mallas/índices/rig/instancias, incluido el material de bancos que la nueva fase no utiliza. Se retira solamente la textura de trayectoria Farm. La preparación nueva crea98 recursos: una textura,12 módulos de shader y8 pipelines asíncronos, entre otros recursos del programa Idle/Alert que esta Surface aún no había preparado. No hay shaders con fuente duplicada ni copias de buffers/texturas residentes. La textura nueva mide112×123; coincide con el banco Alert youngMale original de123 frames y su empaquetado. Esta coincidencia es una inferencia del descriptor y del catálogo; la traza GPU no etiqueta esa textura con el nombre del clip.

No se crea ningún recurso después de READY, ni al adquirir21 ni al cruzar REST→WATCH. Se prepara una sola vez. Con el preparador bloqueado, Farm conserva su extremo y su reloj Idle continuo; después Idle dibuja54 frames durante el bloqueo de1800ms y150 frames durante otro bloqueo de5000ms que cruza el nudo nativo de vigilancia (7,5999999046s). El cuerpo no se mueve, el actor independiente avanza y no cambia el RNG mundial.

Las capturas de reposo y vigilancia se toman dentro de sus bloqueos. El reloj semántico de esos checkpoints procede de la ejecución nativa. Tras desbloquear, los samples de Host acreditan envíos a ambos lados del nudo; el picking final utiliza el reloj realmente enviado de `captureNativeRoutePickFrame`, no una edad calculada para sustituirlo. Picking del extremo Farm, Idle y el actor independiente, ACK tipado21, adopción5 y drain pasan.

## Validación y límites de cadencia

La ventana completa comienza en el primer bloqueo de preparación Idle y llega al último sample disponible tras vigilancia, selección y fence. Visual:408 frames, máximo38,4202ms, p9533,4299ms, cero intervalos>50ms. Sin capturas:408 frames, máximo38,0149ms, p9533,4299ms, cero>50ms. Global visual:1133 frames, máximo124,7651ms y8>50ms; global sin capturas:1137 frames, máximo102,6399ms y3>50ms. No hay aceptación global de ausencia de tirones ni se atribuye causa. La evidencia Home anterior264/147ms permanece abierta.

El control negativo intercepta una sola plantilla preparada21, sin modificar producto: se rechaza antes de adquirir21, no existe binding Idle y Farm no cambia de propietario. El mensaje existente es `Pending settlement clock differs from its retained template`; el recibo identifica el ensayo Idle. Exit1 esperado.

Se conserva el primer ensayo fallido: `client.inspect()` esperaba al preparador bloqueado y retrasaba las imágenes hasta después del bloqueo. La sonda se corrige capturando primero la imagen independiente e inspeccionando los samples retenidos después; no se cambia el runtime para que pase.

Sintaxis correcta de los cuatro módulos del ensayo;417 inputs y64 inputs/artefactos nativos congelados y verificados. No se recompila WASM. La regresión de producto2812/2813 (una comparación opcional omitida) y build1m47s pertenecen a `17cf340a0`; no se repiten ni se atribuyen a cambios posteriores del ensayo. Se preservan16 archivos ajenos, el worker pthread sin seguimiento y los bytes anteriores de los cuatro documentos principales.

Los [recibos, hashes y métricas](performance/native-farm-arrived-idle-cycle-surface-validation-20261118.json) conservan el alcance exacto. Los siguientes pendientes son la aproximación Idle nativa fuera del ancla original, productor/cohort, recuperación incremental integral de3.123 recursos y aceptación integrada de cadencia/plataforma.
