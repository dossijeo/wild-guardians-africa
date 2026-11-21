# Corrección de auditoría: prioridad compartida de los volúmenes de cultivo

Rectifica la interpretación de selección en [TaskAction](native-task-action-publication-hold-20261120.md). La observación de27 impactos sobre la malla del trabajador sobrescritos por una caja de cultivo era real, pero no acreditaba un defecto específico de la migración. El método completo WorldScene.pick también prueba las cajas de los cultivos después de las mallas y conserva el objetivo más próximo. La región correspondiente coincide entre el archivo de trabajo y el commit755812f61; el resto de cambios ajenos de scene.js se preserva sin publicarlo.

## Decisión de alcance

El plan exige extender la infraestructura manteniendo las reglas y dice: «No introducir algoritmos nuevos como requisito de migración». Antes de cambiar un mecanismo, la investigación debe contrastar también el comportamiento que se ha de preservar. La comparación con la ruta heredada debió preceder al prototipo de selección precisa.

Se leyó fuente real de Three0.180.0 (Mesh, InstancedMesh y SkinnedMesh), se adaptaron copias CPU para los triángulos de cultivos y se registró el float absoluto enviado por el consumidor. El candidato pasó cinco casos GPU, controles dirigidos, build y una selección de4848 pruebas con4847 pases y una omisión. Eso no prueba su adecuación al requisito: alteraba la prioridad del volumen lógico compartido por ambas rutas. Se descarta y se retira por completo de producto y de los harnesses, incluidos los dos archivos nuevos. Los nueve archivos existentes vuelven por bytes a sus copias anteriores. La corrección de coordinación TaskAction de755812f61 permanece intacta.

No se modifica el selector heredado, no se publican los cambios ajenos de scene.js, ni se da prioridad incondicional al trabajador. Tampoco se reclasifican los ensayos fallidos de los perfiles mayores como pruebas positivas. La comparación de código no sustituye una comparación perceptiva completa de poses y selección; A7 y C siguen abiertos.

La referencia consultada de Godot4.5-stable sobre límites por hueso, guardados por esqueleto y versión, queda sin adoptar. Las latencias119–149ms del contratado y53–91ms del compañero pertenecían al candidato descartado: no se atribuyen a la ruta vigente ni justifican por sí solas otra arquitectura. La investigación permanece subordinada a los requisitos y a las medidas del producto que se migra.

## Validación vigente

Se añade una regresión al selector existente: el volumen lógico mantiene su prioridad cuando contiene la malla del trabajador; retirarlo deja seleccionable al mismo trabajador residente; un prop opaco más próximo sigue ocultando ambos objetivos. Es una comprobación del contrato compartido, no una simulación de una cosecha autoritativa.

**13/13 pruebas del selector pasan**, sin omisiones ni fallos (532.768ms Node). Dos comprobaciones de sintaxis pasan. Las pruebas y el build completos vigentes se heredan de755812f61 (4838/4839, una omisión,365 archivos; build139.142s), sin declararlos nuevos para esta regresión. Los resultados del candidato descartado se identifican por separado y no se usan como validación de la rama publicada.

Se verifican los691 inputs anteriores sin cambios, más el selector y su suite que se registran explícitamente en este incremento:693 inputs en el recibo. Los64 inputs nativos,16 archivos ajenos y38 A5 permanecen exactos. No hay cambios de producto, dependencias, WASM, ABI, reloj o protocolo. Las cuatro cabeceras se actualizan por inserción de bytes, conservando el resto de sus cuerpos.

## Siguiente punto del plan

Continuar la misma autoridad, preparador, Surface y consumidor ordinarios desde Harvest15 hasta Carry16 y entrega17/Home. La consecuencia Harvest retira el cultivo confirmado y permite comprobar la selección del trabajador sin cambiar la prioridad compartida. Los componentes de consecuencia y entrega ya tienen evidencia propia; falta recorrerlos con el productor ordinario y el mismo cuerpo, banco y cohort, reteniendo respuestas READY auténticas y conservando los recursos no cambiados.

La selección durante la superposición debe contrastarse con la referencia heredada antes de considerarla una regresión nativa. No reiniciar la recuperación WALK retenida ni main pausado ya acreditadas. Las otras intenciones, cohortes, fallos, VFX, publicación, plataformas, el caso global3.123 y los huecos167,650/168/50,71ms siguen abiertos. A6/A/B/C no cerrados; D no iniciado; f-R3 conserva su cierre de seguridad.

[Recibo y evidencias de la comparación](performance/native-crop-selection-parity-20261120-validation.json). La región heredada se conserva como extracto de código ya comprometido; los archivos ajenos completos no se incorporan. El candidato queda como diagnóstico descartado, con fuentes y recibos locales preservados en .cache/native-crop-picking-rejected-policy; su manifiesto y logs de validación se adjuntan como evidencia de descarte, no como avance funcional publicado.
