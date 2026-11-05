# Terreno confirmado para cámara: QA

Con `qa-webgpu-camera-terrain`, el Worker gráfico envía una copia de las 2.401
alturas de cada chunk que ya aplicó, con secuencia, época y revisión. La copia
ocupa 9.604 bytes por publicación; no se consulta por fotograma. El cliente
solo expone el chunk después de que el estado confirmado en main alcance su
secuencia. Una revisión recibida invalida la altura anterior hasta confirmarse;
los datos ausentes o futuros producen `CameraTerrainUnavailable`.

La vista está limitada a 512 chunks y 256 publicaciones pendientes. Ante
desbordamiento, datos inválidos o cambio inesperado de época, el cliente
destruye la vista QA, sin cerrar el renderer ni la simulación. Una recuperación
gráfica crea una vista nueva vacía: todavía no se repueblan los chunks del
checkpoint. No se ha inyectado en los controles de cámara; faltan un manejo
transaccional de pose segura para chunks ausentes, cobertura de exclusiones y
paridad frente al campo nativo, que puede diferir de la malla triangulada.

El mismo flag QA recibe un subíndice de árboles del Worker: cada chunk incluye
bounds locales de LOD0 efectivo por slot y transformaciones de instancias, con
época, secuencia, revisión de origen y revisión de presentación. Los cambios
de supresión regeneran la entrada; una revisión futura invalida la anterior
hasta que main confirme su secuencia. Hay límites de 512 chunks, 256 entradas
pendientes y 50.000 volúmenes; un error desactiva solo este subíndice. Las
pruebas comparan CameraTreeRegistry con rotaciones, escalas y supresión, y con
la geometría real de un árbol de sabana. No se ha probado la equivalencia en
los demás biomas ni con `noNearTreeTextures`; los checkpoints restaurados aún
no repueblan el índice. Faltan edificios y murallas: el subíndice declara
`complete:false` y no se conecta a la cámara.

`tests/browser/worker-camera-terrain.html` valida un chunk de autoridad real
pasando por Workers reales y backend WebGPU, sin inyección de cámara. Con Vite
en `http://127.0.0.1:5187` y Playwright en `NODE_PATH`, se reproduce mediante
`node tools/experiments/audit_worker_camera_terrain.mjs`. No es una prueba de
interacción, recuperación, biomas completos ni rendimiento.

Un guard experimental se descartó: con OrbitControls real y damping, una
actualización fallida redujo el delta angular de 0,5 a 0,475 y el offset de
pan de 2 a 1,9 aun restaurando la pose. Por tanto restaurar solo la cámara y
el objetivo no preserva la entrada. Antes de inyectar esta vista deben
resolverse también los acumuladores internos del control, el primer cambio de
fuente con pose segura, focus/pick diferidos y la equivalencia de exclusiones.

Se probó después un snapshot explícito de los acumuladores de OrbitControls
r180 con eventos reales: restauró un único giro, pan o rueda, pero no reprodujo
la trayectoria ni el damping de dos movimientos recibidos mientras faltaba
terreno. El segundo guard también se descartó. Un reintento seguro necesita
preservar y reproducir el orden de las intenciones, además de validar foco,
selección y exclusiones; la fuente sigue sin inyectarse.

Se probó una cola acotada de actualizaciones de OrbitControls r180. Superó
pruebas de giro, pan y rueda con damping, pero se retiró porque carecía de
consumidor seguro: faltan exclusiones transaccionales, foco, selección,
gestos que mutan la cámara directamente y recuperación.
La revisión de la vista también invalida la caché de pose cuando cambia el
terreno, incluso con la cámara inmóvil, para no reutilizar una altura antigua.

### Estructuras confirmadas (QA, cobertura parcial)

El productor de settlements publica las cajas locales y matrices de los edificios de poblado y piezas de muralla que ya están disponibles. Las altas, cambios de puerta/etapa, bajas y la llegada de terreno reconstruyen la publicación; esta se agrupa tras reconciliar el estado para etiquetarla con la secuencia confirmada. El cliente invalida la versión anterior antes de aceptar otra, espera la confirmación correspondiente y desactiva solo este índice ante datos inválidos o cambio de época. El presupuesto de volúmenes se comparte con árboles. El control de cámara no utiliza el índice.

Los centros declaran cobertura incompleta: el paquete de autoría actual no incluye los envelopes nativos de destrucción y calcular nuevos templates únicamente para la cámara supondría trabajo adicional. Tampoco se ha completado cobertura de rocas, fuentes de terreno y selección. La prueba compara registries reales con geometría sintética, y comprueba transporte y orden de microtarea; aún faltan comparación con assets reales, cambios reales de puertas/daños y reinicio del Worker. La recuperación no se considera validada y no debe habilitar controles alternativos.

### Envelopes de centros precalculados (QA)

`tools/experiments/bake_center_camera_bounds.mjs` reproduce las cajas `still`, `fall` y `ash` del kernel de destrucción para las cinco culturas y genera `public/content/structure-preview/center-camera-bounds.json`. El generador verifica que la geometría de cada preview coincide con el GLB original. En el Worker, la ruta QA comprueba SHA-256 de posiciones, normales, UV e índices y del descriptor de destrucción; la URL se compara por separado para tolerar la reescritura de assets de Vite. Si el archivo falta o la identidad difiere, el centro se declara sin cobertura; no se calcula un template adicional ni se activa una aproximación.

`tests/confirmed-camera-center-assets.test.js` compara las cinco culturas con `prepareNativeBuilding` y `CameraBuildingRegistry` a daños 0, 0,5, 0,9 y 1, y comprueba rechazos por alteración de geometría, URL y descriptor. El fixture `audit_webgpu_settlements.mjs` también ha pasado sobre WebGPU real con 10 edificios, tres murallas y centro intacto, dañado, en ruinas y reparado, comprobando que el productor publica el centro. No valida todavía recuperación del Worker, la totalidad del escenario ni la interacción de cámara; esta fuente sigue desactivada para controles.

La publicación de árboles declara ahora cobertura por chunk: si una variante arbórea con instancias visibles todavía no tiene geometría cargada, el chunk se marca incompleto. `matchesTreeManifest` solo acepta los chunks confirmados, con epoch y revisión fuente exactas, y no certifica edificios ni la cobertura global de cámara. Las pruebas usan geometrías LOD0 y `CameraTreeRegistry` para los seis biomas, además de carga incremental de dos slots.

El checkpoint de recuperación aún no incluye la identidad de terreno: el reenganche crea una epoch nueva y no repite todos los chunks. Un bootstrap en secuencia 0 durante replay concurrente podría adelantar terreno respecto al estado reproducido. La recuperación de este índice requiere una barrera posterior al replay con manifiesto completo y huellas comprobadas de los chunks ya reconstruidos, invalidada si cambia el terreno durante la comprobación. Hasta que exista esa barrera, `complete` sigue siendo falso y el enfoque de tutorial no se habilita.
