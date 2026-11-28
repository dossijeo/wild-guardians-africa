# Preparación y adopción de Farm23 en WorldSurface y Workers originales

Continúa el [roster sobre el actor original](e-r3-native-farm-arrival-route-graphics-20261117.md), siguiendo el [plan principal](integrated-gpu-migration-plan-20261104.md). WorldSurface prepara Farm23 mediante su ciclo compartido y el draw Worker anuncia la capacidad que ya consumen cliente/Host. Se valida el recorrido en GPU real con ambos puertos, conservando el inventario residente. Game/productor ordinarios permanecen cerrados hasta completar los relevos y el cohort. A6/A/B/C abiertos; D no iniciado.

## Referencia de implementación

Antes de modificar el ciclo se consulta el código real de [wgpu v26.0.1, `LifetimeTracker::triage_submissions`, `schedule_resource_destruction` y `add_work_done_closure`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs#L296). El tracking asocia callbacks y recursos a submissions; sólo retira los completados. Se conserva el ciclo que ya posee Surface: preparar y retener el paquete, esperar el acuse del trabajo enviado, adquirir la asociación nativa exacta, adoptar y esperar la publicación correspondiente. No se añade otra cola, fence, propietario, reloj o dependencia. La construcción inicial y la reutilización del actor siguen las implementaciones Mesh/SkeletonUtils de Three r180 documentadas en el incremento anterior.

## Cambio

`prepareNativeFarmArrivalResources` selecciona los codecs23, soporte de terreno, participante del roster y retag/picking Farm en el preparador de movimiento existente. Exige inicio diferido y mantiene la presentación confirmada retenida durante la preparación, activación y captura. El paquete lleva `nativeFarmArrivalTemplate`; el handle expone `preparedFarmArrivalTemplate` y los comandos originales de invalidación, refresh, commit y aborto.

El commit comprueba el recurso23, binding y frontera emitidos antes de comprometer el paquete y finalizar los participantes. La presentación enviada libera la publicación retenida. La ranura continúa `adopting` hasta recibir una publicación posterior con el trabajador realmente `arriving`, la marca Farm activa y el perfil/centro/destino de servicio correspondientes a la fuente. La pose puede haber avanzado: no se exige la posición pendiente antigua. No se convierte una publicación genérica en una autorización ni se fabrica una consecuencia Idle.

El draw Worker anuncia `nativeFarmArrivalVersion:1` después de completar este consumidor. El cliente, Host, emisor y receptor de recursos usan sus capacidades y contratos originales. Esto habilita la adquisición gráfica opt-in; no abre el Game/productor ordinario ni el bootstrap de una ruta Farm ya activa. El refresh comparte el ciclo anterior; esta validación integrada ejercita retiming compatible de la preparación retenida, no una sustitución arbitraria del programa geométrico.

## GPU, identidad y continuidad

La [evidencia](performance/native-farm-arrival-route-surface-validation-20261117.json) registra dos ejecuciones NVIDIA/Turing, una con traza. El fixture declara una llegada Farm genuina y pendiente, sin historia Task/Home/Idle para ese actor, en un estado inicial mínimo de desierto. El segundo trabajador usa la ruta Home independiente explícita del audit existente. La fuente vive en la página y avanza el motor nativo; preparador y consumidor son Workers originales, WorldSurface/actores/bancos son los de producción y los puertos de recursos/control son reales. No es aún el productor ordinario completo ni una prueba de todos los perfiles en hardware.

La primera ejecución conserva **564 IDs de geometría y bancos** y la repetición con traza **561**, todos los presentes en sus respectivos inventarios iniciales y sin retirar ninguno. Preparan **102 recursos** de la nueva variante antes de READY y crean **cero después de READY**, sin forks posteriores de bindings/uniformes. Se conserva la identidad de raíces, huesos, geometrías e instancias del mundo. El cuerpo pendiente no se mueve antes de adquirir; después, el binding emitido y el reloj de la imagen enviada dan una pose nativa que el picking original encuentra. La retirada final se realiza después de quiescer el productor y drenar el consumidor.

El consumidor sigue dibujando durante bloqueos reales de CPU de 1.800 ms en el preparador: 54 imágenes en la preparación de ambas ejecuciones, y 48/53 durante el segundo bloqueo después de adquirir. Esto prueba independencia funcional y reutilización acotada, **no ausencia de tirones**. La primera ejecución tiene un máximo global de **172,74 ms**, dentro del segundo bloqueo. La repetición con traza registra **158,18 ms globales**, antes de preparar Farm, y **61,20 ms** en el segundo bloqueo. Los tiempos individuales de dibujo son cortos; no basta con ese dato para descartar un hueco de scheduling o de GPU.

La traza muestra microtareas largas del preparador y trabajo de compilación Dawn solapados con algunos huecos previos a READY; la tarea larga de microtareas pertenece a otro hilo que el consumidor. Se conservan tiempos y correlación en la evidencia. No se atribuye causalidad definitiva ni se equipara cero asignaciones con cero tirones. La continuidad integrada y la planificación de preparación bajo carga siguen abiertas.

## Validaciones y siguiente punto

El control negativo intercepta únicamente el código servido de Surface para omitir la plantilla Farm del paquete retenido. Con exactamente una sustitución, la admisión falla por la discrepancia entre reloj y plantilla; no hay asociación23 emitida, la petición sigue presente y el cuerpo conserva todos sus valores. El árbol y los WASM permanecen intactos. El fallo intencionado no cuenta como fallo de la regresión final.

Se ejecutan regresión compartida y build del producto sobre inputs congelados, después de terminar hardware. Los 64 inputs/artefactos nativos y los 16 archivos locales ajenos siguen exactos, sin recompilar C++. Los siete fallos históricos de dos suites fuera de la selección no se declaran corregidos.

Se continúa con los relevos preparados de Farm durante movimiento y al endpoint hacia Idle/Task/Home, manteniendo la prioridad Task original, incluida la maduración de cultivos dentro del tick. Siguen pendientes alternativas de entrada/cohort, contratos/puertas/raid, productor integral, guardado UI, planificación de preparación sin huecos y recuperación incremental completa de los 3.123 recursos. Estos inventarios de una escena mínima no sustituyen esa aceptación A/A6/B/C.
