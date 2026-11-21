# Contrato de datos y asociación de la parada Farm24

Continúa la [parada nativa Farm24](e-r3-native-farm-arrival-stop-source-20261117.md), siguiendo el [plan principal](integrated-gpu-migration-plan-20261104.md). El bridge y los lectores originales ya capturan, copian, revalidan, cancelan y verifican las asociaciones24. Se comparte el esquema de parada existente con Idle12, manteniendo la identidad explícita de cada familia. Faltan la proyección semántica del cuerpo Farm retenido y el relevo completo mediante control, admisión, puertos y consumidor gráfico. A6/A/B/C abiertos; D no iniciado.

## Código consultado y adaptación

Antes de diseñar el contrato se inspecciona [wgpu v26.0.1, `RawId::zip/unzip` e `Id<T>`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/id.rs#L83). El código conserva índice y época en la representación y distingue familias mediante el marcador de tipo. Se adapta ese criterio a las etiquetas de datos y generaciones que Wild Guardians ya usa; no se copia su empaquetado binario ni se introduce wgpu como dependencia. El hash de la implementación consultada consta en la evidencia.

Se extrae el esquema existente a un módulo puro con dos instancias inmutables,12 y24. No crea propietarios, registros de recursos, relojes ni controladores. Los exports públicos y los diagnósticos de Idle conservan su forma; Farm expone sus etiquetas y diagnósticos propios. Las comparaciones de referencia, recibo y selector también comprueban la familia y versión, además de los valores de propietario/frontera. Una misma estructura numérica retaggeada no se convierte en una asociación nativa de otra clase.

## Fuente elegida y cierre de dependencias

La revisión revela una distinción necesaria: el cierre de una parada puede suspender varias rutas. La colección de propietarios y el recibo de tickets anterior no identificaban por sí solos cuál había sido la fuente elegida. Una dependencia válida no debe poder sustituir ese actor en una referencia entregada al lector.

Se añaden **seis valores** a la publicación nativa que ya conserva el último resultado: versión, sesión, actor, slot, generación y secuencia de asignación de la instrucción de parada. Se obtienen del input que la fuente realmente comprometió. Un getter de sólo lectura expone esa tupla mientras el recibo/frontera de la publicación siga siendo el actual. Se limpia al registrar otro resultado; no es un historial ni otra tabla de cuerpos.

El lector común de asociaciones12/24 comprueba la clase nativa comprometida, ambos tickets y tiempos, esa fuente exacta, los fingerprints de todos los cuerpos suspendidos/liberados y los motores. La proyección opcional se coteja contra las poses físicas retenidas, no contra una pose escrita por el preparador. El test de cierre con dos rutas demuestra que la ruta dependiente está detenida y es un propietario válido, pero no puede hacerse pasar por la fuente.

## Captura y propiedad de datos

Los lectores existentes de mundo admiten24 como clase explícita y siguen excluyendo las clases de movimiento13–23. Exigen cero geometría y efectos de parada reales. Copian los buffers antes de otras llamadas nativas, sin seleccionar/publicar chunks para esta instrucción sin cambios de terreno. El bridge usa el mismo input acotado y ciclo de preparación de fuente que12, con selección del binding Farm23 y del getter de traducción24.

El candidato contiene referencias congeladas y arrays de efectos copiados, modificables de forma independiente para preparación. La asociación final congela también los valores de pose/motores y conserva la referencia preparada junto a la adquirida. Dos revalidaciones pueden actualizar el instante y la pose sin cambiar el origen preparado. Cambiar propietarios, familia, época o tickets no produce una asociación válida.

Se corrige además la conversión al consultar motores desde las referencias numéricas de efectos: el getter de Game recibe su ID canónico de estructura. Un test de formato con un motor inexistente verifica que ese valor no obtiene una asociación; es un test de codec, no una puerta física inventada ni un permiso GPU.

## Validación y continuación

La [evidencia](performance/native-farm-arrival-stop-data-validation-20261117.json) recoge 18 pruebas nuevas y 89 dirigidas, regresión compartida, build y hashes. Los cuatro perfiles pasan en standalone y pthread: captura/copia, dos revalidaciones, recibos y pose final, aliases de familia, candidatos/tickets ajenos, fronteras obsoletas, llegada completada/cero, copia de recursos sin geometría y limpieza del último journal. Se prueba también la exclusión simétrica entre un Farm24 real y un Idle12 real aunque un caller retaggee sus valores.

La primera regresión detecta que el diagnóstico compartido había cambiado el texto que el Host esperaba para una referencia Idle inválida. El paquete se rechazaba y no se enviaba a GPU; fallaba la comprobación del mensaje. Se conserva el diagnóstico anterior de Idle y se añade el correspondiente a Farm. La regresión y el build finales se repiten sobre esa versión; el primer resultado queda identificado separadamente en la evidencia.

El control negativo usa un loader ESM de sólo lectura que elimina únicamente la comparación de actor/slot/generación/asignación de la fuente seleccionada. La dependencia del cierre se acepta entonces indebidamente como fuente y la prueba falla. Se conserva la validación de sesión, tickets, clase y cuerpos; el resultado demuestra la necesidad de la comprobación añadida, sin modificar el árbol o los WASM. Ese fallo intencionado no pertenece a la regresión final.

Se recompilan ambos módulos para el getter añadido y se congelan 64 inputs/artefactos nativos; sólo cambian el cpp, el script de exports y los tres artefactos esperados. Los 16 archivos locales ajenos y el worker pthread sin seguimiento se preservan. Las pruebas usan la fuente/ABI nativa real; sus commits confiados no son recibos gráficos. El permiso de Game para Farm retenido sigue en `-1` y no se anuncia parada24 en el draw Worker.

No se repite hardware: aún falta el consumidor24. La evidencia Farm23 de Surface sigue siendo histórica, incluidos sus huecos de 172,74 ms y los de la repetición con traza. No se acredita ausencia de tirones ni recuperación incremental de los 3.123 recursos.

Se continúa con la proyección del cuerpo Farm retenido y los relevos preparados, conservando la prioridad Task de `arriving`, también cuando maduran cultivos dentro del tick. Siguen el endpoint Idle/Task/Home, alternativas/cohort, contratos/puertas/raid, productor integral, guardado UI, planificación de preparación y continuidad integrada A/A6/B/C.
