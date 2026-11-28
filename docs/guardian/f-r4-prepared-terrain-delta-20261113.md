# f-R4: consumir el delta preparado en el surface existente

Continuación de b71b183dd. **f-R4 sigue parcial**; no se cierra ningún padre A6
ni se altera el orden A → B → C → D. La reconstrucción de 3123 recursos en un
dispositivo sano sigue siendo evidencia negativa de la vía de fallback.

## Aplicación en los propietarios existentes

El publicador de terreno reserva una sola propuesta de revisiones futuras en su
canal actual. Obtiene los payloads de la vista canónica nativa previa al efecto;
no cambia el manifest ni publica geometría visible durante la preparación.
La negociación exige un receptor que soporte propuestas. Secuencia base,
época del canal, ticket/sesión/tiempo nativos, revisiones y bytes quedan ligados.

El receptor prepara los participantes reales de terreno y vegetación mediante
prepareWebGpuTemporalTerrain y el coordinador de chunks existente. Su valid()
consulta los tickets reales de admisión, no un booleano simulado. La preparación
no toca la escena visible; esta sigue mostrando la revisión anterior. La
supresión se captura y debe seguir igual al activar; ocultar props canónicos
impide acreditar preparación nativa.

Después del commit físico, el hook compara los payloads canónicos efectivos y
los que ha staged el publicador con la propuesta, incluidos los bytes de los
arrays y las retiradas. commit() del hook transfiere la reserva al siguiente
lote confirmado; **no declara que la geometría ya sea visible**. El batch normal
de ese mismo canal consume el handle retenido sin volver a preparar sus recursos.
Solo terrain.confirm() activa ambos propietarios y emite sus notificaciones una
vez. El recibo incluye el ticket preparado; el surface adopta esa identidad
únicamente si concuerda también con el journal físico confirmado. No se etiqueta
un mundo antiguo con el ticket más reciente.

La comparación reutiliza después los payloads preparados, liberando las copias
del lote normal. Hasta esa comparación pueden coexistir dos copias: cada
propuesta dispone como máximo de la mitad del presupuesto negociado de bytes y
entradas. Su carga se incluye en retainedBytes. Cancelación, timeout de 10 s,
publicación ordinaria competidora, disposición o fallo liberan reservas y
handles; un preparador que termina tarde aborta su resultado. Un cambio que ya
se armó exige el lote exacto, sin fallback silencioso a otra preparación.

La API prepareNativeWorldResources del publicador puede servir directamente al
hook nativo cuando su propietario ya publica los datos canónicos efectivos.
La autoridad de gameplay aún no activa esta nueva vía: la integración probada
abajo usa el bridge y los propietarios de producto con una fixture explícita.
No se añade otro renderer, dispositivo, generador de mundo o coordinador.

## Evidencia WebGPU real y sus límites

[Recibo NVIDIA/Turing](performance/native-prepared-delta-20261113.json) y
[captura final](performance/native-prepared-delta-20261113.png), con el Worker de
dibujo de producto, WASM real y un trabajador estacionario a tiempo nativo 10 s.
Se retira y readmite el chunk (-1,-1), fuera del encuadre del personaje. Se
conservan renderer, dispositivo, escena, root del trabajador y mesh/geometría del
chunk (0,1). Sus cuatro buffers GPU conservan exactamente sus IDs. No se crea
otro surface y no hay forks de buffers/bindings ni errores GPU capturados.

El contador acumulado de factories del proxy pasa de 2158 a 2519: 89 factories
tras la retirada y otras 272 entre preparación y presentación de la readmisión.
No es una reconstrucción de 3123 recursos ni una prueba de que toda asignación
restante sea mínima. La retirada no crea shaders, pipelines, samplers ni texturas;
sí crea buffers/grupos durante la siguiente presentación. La readmisión crea sus
14 pipelines y 14 shaders nuevos **antes del hold**; sus contadores no aumentan
al presentar el nuevo estado. Queda clasificar las asignaciones de uniformes y
verificar conservación de todos los recursos sin cambios, además del chunk
testigo. Los contadores no incluyen los views transitorios ni miden bytes GPU.

La preparación gráfica de la readmisión tarda 386,7 ms. Tras ella se bloquea
realmente el Worker preparador 500,7 ms, antes de devolver el handle al bridge:
el Worker de dibujo presenta **15 frames** del mundo anterior, sin hold, y el
ticket físico sigue en 1. Después se aplica el ticket 2 y se presenta usando el
mismo dispositivo y los buffers conservados. Esto prueba continuidad del dibujo
estacionario durante ese bloqueo, no locomoción autónoma ni aceptación A–F.

El ensayo descubre una brecha estructural adicional: después del drenaje, el
commit nativo y la proyección efectiva tardan **39,9 ms** en la readmisión
(3,6 ms en la retirada). La vista previa todavía no elimina toda regeneración
canónica al confirmar/capturar. Hay que reutilizar su preparación nativa tras
revalidar dependencias; no esconder ese coste en el hold ni declararlo libre de
tirones por haber sacado la compilación GPU de él.

## Validación y continuación

Selección de 891 pruebas dirigidas de 77 archivos, sin fallos ni skips con
--test-concurrency=4. Tras añadir la negativa para canales sin época y endurecer
esa validación y el aborto ante una excepción del ticket, pasan también 64 pruebas de seis archivos de propuesta, batch, historial, cancelación y replay. Build
WebGPU aprobado en 1 min 12 s; comprobaciones de sintaxis del harness aprobadas. Registros locales: .cache/native-prepared-delta-selection.json,
.cache/native-prepared-delta-regression.tap y .cache/native-prepared-delta-build.log (y build final de la misma entrega en
.cache/native-prepared-delta-build-final.log, 42,06 s).
La ejecución anterior con la concurrencia por defecto, build y auditoría GPU
simultáneos dio 890/891: falló la prueba previa de ataque ordenado aceptado, que
espera entregas MessagePort con timers de 20 ms (línea 97). Sus 15 casos pasan
aislados y la selección pasa con concurrencia 4, sin modificar sus fuentes ni
expectativas. Se conserva .cache/native-prepared-delta-regression-concurrent-failure.tap;
no se presenta como ausencia global de inestabilidad temporal.

Las pruebas nuevas cubren la transferencia única, conservación de revisiones,
retirada, propuesta vacía, cancelación durante/después de preparar, resultado
tardío, presupuesto, ticket inválido, supresión y payload efectivo alterado.

Reproducción GPU: con Vite en QA_BASE_URL y PLAYWRIGHT_MODULE apuntando a
Playwright, ejecutar tools/experiments/audit_webgpu_temporal_ground.mjs con
QA_NATIVE_DELTA=true y .cache/tooling/node20.exe. OUTPUT elige el recibo.

La regresión con QA_NATIVE_REPLAY=true, QA_NATIVE_OBSOLETE=true y
QA_NATIVE_DELTA=false conserva checkpoint/replay, seis dibujos y cero errores
GPU. También confirma que el fallback no preparado sigue eligiendo fresh-surface
y crea 3128 factories en esta ejecución (.cache/native-prepared-delta-fallback-regression.json).
No se ha sustituido todavía esa rama del Worker/coordinador principal por
reanudación del mismo surface tras rechazo. La retención de uploads sigue siendo
una condición necesaria, no certificación automática de todos los targets.

Siguientes puntos: eliminar regeneración nativa dentro del hold, resolver el
frame obsoleto preparado en el mismo Worker/surface, conectar la vía a la
autoridad normal y probar personajes con planes nativos completos, pausa,
velocidad y revocación. Preparación de mud y demás metadatos derivados debe
concordar antes del efecto; no activar una mutación que solo los obtenga después.
e-R3/e-R4/f-R4 y los once padres A6 permanecen abiertos.
