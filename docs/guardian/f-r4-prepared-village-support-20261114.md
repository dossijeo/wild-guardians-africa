# f-R4: preparar aldeas cuyo apoyo sí cambia

14 de noviembre de 2026. Continúa el [contexto de color preparado](f-r4-prepared-color-context-20261114.md).
**f-R4, e-R3/e-R4 y los once padres A6 siguen abiertos.** Este incremento cierra
la preparación previa de la proyección de aldeas sobre el terreno propuesto;
otros consumidores y la integración ordinaria siguen pendientes.

## Investigación y decisión

Antes de diseñarlo se consultó código real de
[Bevy v0.17.2, render_asset.rs](https://github.com/bevyengine/bevy/blob/v0.17.2/crates/bevy_render/src/render_asset.rs):
`RenderAssetPlugin<…, AFTER>` ordena preparaciones por dependencia y
`prepare_assets` entrega el recurso anterior a `prepare_asset`, admitiendo
reintentos. Su extracción inicial puede retirar el recurso anterior antes de que
el siguiente esté listo. Nuestro contrato requiere conservar el mundo anterior
mientras la propuesta física todavía no tiene efecto.

Se adaptan la preparación por dependencia y la publicación posterior al éxito
al **batch reversible y replacement slot existentes**. No se incorpora Bevy,
una cola paralela, un protocolo o un registro nuevo. Las mallas de terreno ya
preparadas se exponen al sampler existente mediante una vista de solo consulta;
los chunks no incluidos siguen viniendo de la residencia efectiva. No se
instalan provisionalmente datos en el mundo ni en la residencia activa.

La aldea compara su clave actual de layout/alturas con esa proyección propuesta.
Si coincide, conserva los mismos objetos. Si difiere, construye un candidato
oculto en su propietario, con las mismas geometrías y materiales del banco.
El slot mantiene visible y listo el anterior. El batch admite los candidatos,
incluida su visibilidad futura mediante `include`, y ejecuta activación,
attachment y finalización reversibles junto a terreno/props. Solo después de
validar todas las fases retira recursos anteriores y envía notificaciones.
Se conserva la identidad de cámara/escena/nodo de luces del incremento anterior.

Los dependientes no fabrican otra revisión de chunk: mantienen su propio
read set de entidad, cultura, layout, propietario y los meshes de apoyo retenidos
fuera del delta. Cada aprobación debe devolver exactamente `true`.
Cambio de intención normal, cancelación, fallo parcial, reentrada del aborto o
cierre invalidan la propuesta. Un fallo de finalización revierte el layout;
la liberación espera compilación/trabajo GPU pendientes mediante el servicio
existente. El slot deja de retener el participante al terminar y puede cerrarse
también dentro de una fase reversible sin perder ninguno de los dos propietarios.

## Prueba WASM/WebGPU real

El [control sin la preparación de aldeas](performance/native-unprepared-village-support-20261114.json)
falla en la mutación 8: el gate del primer frame detecta **54 creaciones tardías**,
36 buffers de uniforms y 18 bind groups. Se desactiva únicamente el callback de
dependientes mediante una sustitución QA comprobada; los gates siguen estrictos.
La medición incluye mensajes de creación recibidos hasta el ACK, separadamente
de las factories iniciadas dentro de `render`.

El [recibo preparado](performance/native-prepared-village-support-20261114.json)
extiende las seis mutaciones anteriores con modificación y restauración del apoyo
real de la aldea. En ambos pasos cambian **seis alturas de edificios residentes**:

- Ocho mutaciones con cero factories al grabar el primer frame y cero mensajes de creación pendientes hasta su ACK; ninguna compilación tardía de la aldea.
- Sus nueve meshes residentes conservan las geometrías, materiales y todos los IDs de sus buffers. El layout cambiado usa nuevas instancias admitidas; una aldea con proyección intacta conserva sus instancias anteriores.
- Mientras se prepara la mutación 8, la proyección efectiva mantiene exactamente los meshes y posiciones anteriores; bloquear 500 ms el preparador deja **15 dibujos** de ese mundo y ningún efecto físico nuevo.
- Cero copias internas de buffers geométricos. Las copias de uniforms/bind groups se contabilizan aparte y terminan antes de solicitar el hold; no se afirma cero asignaciones totales.
- Mismo renderer, dispositivo, escena y trabajador estacionario, geometría cambiada dentro de cámara, dos movimientos de cámara sin factories, cero errores y cierre/drenaje comprobados.

La [captura después de restaurar](performance/native-prepared-village-support-20261114.png)
es idéntica byte a byte a la captura del incremento de color en el mismo estado
final. No acredita movimiento nativo autónomo, tiempos de la partida completa
ni aceptación visual de todos los consumidores.

La unidad actual de sustitución sigue siendo el layout de la aldea: se conserva
la geometría/material GPU del banco, y las nuevas instancias preparan sus bindings
antes del efecto. Esta prueba no demuestra retención de cada instancia individual
dentro de un layout que sí cambió, ni convierte este caso en aceptación integral
frente al fallback histórico que reconstruía 3123 recursos.

## Validación y siguiente punto

25 pruebas nuevas: slot reversible/compilación/recursos, fases conjuntas,
read sets, cancelación reentrante, cierre durante finalización, propuesta de
alturas sin alterar residencia, retención equivalente, cambios de entidad y
fallo parcial/reintento. [Regresión amplia](performance/native-prepared-village-support-validation-20261114.json): **1142 pruebas / 94 archivos**, concurrencia 2, cero fallos/skips; **107 dirigidas finales**. Build WebGPU/remote aprobado en **42,26 s**, con las advertencias habituales de chunks/imports mixtos. Registros `.cache/native-village-prepared-{regression,directed}.tap` y `.cache/native-village-prepared-build.log`.

La [regresión con Workers reales](performance/native-prepared-village-support-frames-20261114.json)
vuelve a regrabar dos frames obsoletos, conserva el dispositivo y 93 buffers de
vértices por paso, sin reemplazos/errores y con cierre/drenaje verificados.

Reproducción: Vite de producto WebGPU, `QA_BASE_URL=http://127.0.0.1:5181`,
`QA_NATIVE_VILLAGE=true` y `tools/experiments/audit_webgpu_temporal_ground.mjs`.
El control usa además `QA_NATIVE_VILLAGE_UNPREPARED=true` y debe fallar.
Node 20, Playwright/Edge y GPU real; las cifras son controles funcionales, no
una campaña de benchmarks.

Continuar los consumidores de terreno restantes (centros/muros, cultivos/cajas,
efectos y apoyos de personajes), demás familias/streams de f-R4 y la conexión
con autoridad ordinaria/intenciones. Se mantiene la aceptación A–F/B/C y el
recuento de A6/e/f abierto; no se retiran protecciones.
