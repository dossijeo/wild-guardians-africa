# Puertos y contrato de publicación de Farm23

Continúa la [adquisición de fuente](e-r3-native-farm-arrival-route-admission-20261117.md) del [plan principal](integrated-gpu-migration-plan-20261104.md). Los puertos de recursos existentes conservan la plantilla de llegada23 y la publicación valida su acuse/liberación propios. El Host aún no anuncia la capacidad23 ni prepara su reloj/actor: sigue pendiente el consumidor gráfico real. Game/productor ordinarios y bootstrap activo permanecen cerrados. A6/A/B/C siguen abiertos; D no se inicia.

## Referencia y decisión

Se vuelve a consultar la implementación ya fijada de [wgpu v26.0.1, `LifetimeTracker::triage_submissions` y `add_work_done_closure`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs#L296). Los callbacks se vinculan a la submission activa y se recuperan al completar su índice; la construcción de datos por sí sola no acredita su consumo. Se conserva esa distinción en los adaptadores de Wild Guardians: el paquete y el acuse corresponden a una plantilla, frontera y frame concretos, y una respuesta genérica no los sustituye. Se reutilizan los puertos, reserva única y registro de hold existentes, sin otro canal, fence, cola o dependencia. El hash de la implementación consultada figura en la evidencia.

## Cambios

El cliente compartido ofrece `prepareNativeFarmArrivalResources`; su conexión directa conserva `preparedFarmArrivalTemplate` mediante el handle existente. Preparación, invalidación, refresh, commit y abort siguen usando el mismo identificador y reserva. La preparación exige modo diferido y la referencia exacta del perfil23. El receptor admite los nuevos nombres de mensajes y devuelve esa plantilla. Rechaza envolver Farm en otra familia, otra clase como Farm, o un refresh de clase ajena antes de llamar al preparador. No transfiere funciones ni propietarios de escena por el puerto.

La publicación incorpora la plantilla23 a su exclusión mutua, normalización, hold y solicitud de quiescencia. Sólo acepta `nativeFarmArrivalVersion:1` con plantilla exacta, frontera y frame retenido. El recibo devuelto conserva esos datos propios. La liberación transporta `nativeFarmArrivals` y contrasta frontera actual, secuencia de la fuente, asignación emitida, actor/cuerpo únicos y referencia preparada exacta. Rechaza arrays nulos, datos omitidos, duplicados, asociaciones ajenas o mezclas de familias. Las otras familias tampoco pueden liberar asociaciones Farm usando su hold.

El adaptador del dibujante no anuncia aún esta versión. Una imagen preparada genérica del Host original carece del recibo23 y la publicación la rechaza. Completar los adaptadores de transporte no concede una capacidad gráfica ni cambia el cohort de Game. Si el commit físico ya ocurrió y se corrompe la liberación, la fuente informa `committed-control-failed` y se cierra; no afirma deshacer la adquisición nativa.

## Validación y continuación

La [evidencia](performance/native-farm-arrival-route-ports-validation-20261117.json) registra los resultados finales, comandos, selección y hashes. Las 23 pruebas nuevas atraviesan dos `MessageChannel` reales, publicación, control y módulos nativos: cuatro perfiles caminando/corriendo con compañero Task, avance durante preparación/drain, acuses incompletos o ajenos, plantillas de recurso incorrectas, refresh e invalidación, exclusión de reservas, cancelación/reintento, liberaciones omitidas/nulas/duplicadas/ajenas, conflicto de plantillas y pthread.

Los handles de preparación y acuses del consumidor positivo son dobles explícitos. La prueba negativa del Host usa su implementación y la del cliente originales con el dispositivo simulado del fixture: prepara una imagen genérica real del protocolo y verifica que no pueda producir el recibo de Farm23. Ninguna de esas pruebas acredita GPU de hardware, roster/Surface de Farm o ausencia de tirones.

Un loader ESM de sólo lectura elimina exclusivamente la validación23 del acuse en la publicación. La misma prueba negativa pasa a fallar por `Missing expected rejection`, sin modificar el árbol ni los WASM. Es evidencia de que el acuse genérico no queda convertido silenciosamente en el recibo23. Los casos filtrados de ese control no cuentan como fallos de la regresión final.

No cambian los 64 inputs/artefactos nativos ni Host, shaders, Surface, roster o capacidades del draw Worker. Se ejecutan regresión y build, sin recompilar C++ ni repetir hardware. Las medidas históricas de la vertical previa —569 IDs conservados, 30 recursos tardíos y máximo global de 66,72 ms— siguen limitadas a esa vertical. La recuperación incremental integral de 3.123 y la eliminación de tirones permanecen pendientes de aceptación.

Se continúa con el reloj/reflejo de picking, retención y liberación de Farm23 en el Host y consumidor original de roster/Surface, junto con su capacidad verificable y pruebas GPU. Después deben completarse parada durante movimiento, finales Idle/Task/Home, alternativas de entrada del cohort, contratos/puertas/raid, productor integral y guardado UI, conservando la asignación original de tareas.
