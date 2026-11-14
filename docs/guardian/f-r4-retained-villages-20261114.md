# f-R4: conservar las aldeas cuyo apoyo no cambia

14 de noviembre de 2026. Continúa la [validación por fase reversible](f-r4-prepared-phase-validation-20261114.md).
**f-R4, e-R3/e-R4 y los once padres A6 permanecen abiertos.** Se elimina una
reconstrucción tardía de un propietario real de producto; no se acredita aún
continuidad ni admisión previa de todos los consumidores del terreno.

## Investigación aplicada

- [Three r180, Renderer](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Renderer.js): se leyó `compileAsync` y `_createObjectPipeline` en la dependencia local. La preparación construye nodos, geometrías y bindings, además del pipeline. Compartir geometría/material no elimina ese trabajo al crear otros objetos.
- [Three r180, RenderObjects](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/RenderObjects.js): `get` conserva su caché por objeto, material, contexto y luces. Se mantienen los meshes originales cuando su proyección sigue siendo la misma.
- [React v19.2.0, ReactFiberHooks](https://github.com/facebook/react/blob/v19.2.0/packages/react-reconciler/src/ReactFiberHooks.js): se leyó `subscribeToStore`/`checkIfSnapshotChanged`. Una notificación consulta el snapshot efectivo y solo solicita actualización si cambió. Se adapta esa distinción a la clave que ya poseía la aldea, sin introducir React, otro caché o dependencia.

## Causa y cambio

Cada aviso `terrainChanged` incrementaba un contador global en settlements.
Ese contador invalidaba la clave de todas las aldeas, incluso ante una revisión
de props o un cambio lejano que mantenía sus apoyos. Se creaban meshes nuevos
con los mismos bancos y empezaba otra admisión después del commit físico.

La captura CDP del Worker localiza unos 21 ms de la ventana posterior a
`endFrame` en `PipelineAdmission.execute`/`compileAsync`, construyendo nodos del
candidato de nueve edificios. Las llamadas proceden del replacement slot.
No era una espera por recursos en el draw Worker. El recibo previo registra
59 creaciones adicionales en pasos sin recursos nuevos durante la grabación
del primer frame. La captura es diagnóstico dirigido, no una campaña D.

El mismo propietario usa ahora la distribución autorada, las coordenadas,
orientaciones y **cada altura realmente muestreada** como su clave. El sampler
existente conserva consultas del mismo mesh y vuelve a muestrear un terreno
sustituido. Un mesh de terreno distinto con iguales alturas no exige sustituir
la aldea. `null` conserva explícitamente la ausencia de residencia.

El slot sigue conservando el objeto anterior mientras admite un candidato.
Coincidir con un candidato pendiente no reinicia su preparación; volver a la
proyección activa cancela solamente el candidato. Si una admisión falla, una
notificación posterior con la misma proyección permite reintentar. Los cambios
reales de apoyo, distribución, orden, key, coordenadas o yaw conservan la ruta
de sustitución. La cámara conserva los mismos meshes y envelopes cuando nada
cambia y declara incompleta una sustitución pendiente.

No se alteran la física, los bancos, la hidratación de texturas, el renderer,
la admisión ni la política de previews. Un apoyo realmente cambiado todavía
necesita incorporar este consumidor a la preparación anterior al efecto: este
incremento resuelve la retención de una aldea intacta, no esa dependencia.

## Evidencia y límites

[Diagnóstico previo](performance/native-village-retention-before-20261114.json)
y [recibo WebGPU posterior](performance/native-village-retention-20261114.json).
Mismo harness WASM, canal/coordinador y propietarios gráficos de producto,
NVIDIA Turing, seis mutaciones y un trabajador estacionario a tiempo nativo 10.

Los nueve meshes admitidos de la aldea (una décima unidad queda fuera de
residencia en este fixture) mantienen objetos, geometrías,
materiales, posiciones y los IDs GPU de sus atributos en todos los pasos;
**cero compilaciones tardías de esa aldea**. La espera `endFrame → sendStartedAt`
pasa de unos 19–22 ms a menos de 1 ms en la ejecución dirigida. Se mantienen
las comprobaciones de alturas canónicas y la retención de terreno/props.
Mismo dispositivo, cero forks/errores GPU y cierre/drenaje verificados.

En la ejecución final, los pasos de terreno registran:

| Cambio | Commit/proyección nativo | Activación | Drenaje → primer dibujo | Intervalo máximo nativo | Recursos creados al grabar el primer frame |
| --- | ---: | ---: | ---: | ---: | ---: |
| Añadir explanación | 5,4 ms | 11,0 ms | 38,3 ms | 68,8 ms | 8 |
| Restaurar terreno | 10,5 ms | 19,5 ms | 57,2 ms | 68,4 ms | 20 |

Son tiempos de esta ejecución, con variación de entrega/pacing, no percentiles ni
latencia máxima del producto. Selección amplia: **992 pruebas en 88 archivos**,
concurrencia 2, sin fallos/skips: `.cache/native-village-retention-regression.tap`
y `.cache/native-village-retention-selection.json`. Sintaxis del módulo y harness
comprobada. La grabación del primer frame aún crea bindings en los
pasos que incorporan geometría; deben investigarse sus entradas exactas de
admisión. Sigue habiendo espera de activación, entrega y pacing. No se declara
ausencia de tirones, locomoción autónoma ni aceptación del producto completo.

## Validación y siguiente punto

Ocho casos nuevos ejercitan el propietario real con bancos de prueba, sampler,
slot, admisión y cámara: notificaciones ajenas, terreno equivalente, apoyo
distinto, candidato estable/reversión, pérdida/retorno de residencia,
modificaciones de layout, reintento tras fallo y prueba de readiness tras revertir
una pérdida de residencia pendiente. También pasan los contratos
existentes de aldea admitida, preview y sampler: **21 pruebas dirigidas**.

Completar la cobertura previa de los bindings que todavía aparecen en el primer
dibujo y de los consumidores cuyo apoyo sí cambia. Continuar las familias/streams
de f-R4 y conectar autoridad ordinaria, personajes e intenciones con aceptación
A–F/B/C. No se retiran protecciones ni se cambia el recuento de cierres.

Regresión de Workers reales: dos frames obsoletos regrabados con el mismo
dispositivo y 93 buffers de vértices compartidos por paso, sin errores y con
cierre/drenaje verificados: `.cache/native-village-retention-frames.json`.
Build WebGPU/remote draw aprobado en 42.49s, con las advertencias habituales
de tamaño de chunks: `.cache/native-village-retention-build.log`.
