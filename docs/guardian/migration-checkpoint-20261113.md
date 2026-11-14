# Migración: auditoría y continuación del 13 de noviembre de 2026

Referencia principal: [plan integrado](integrated-gpu-migration-plan-20261104.md),
con la [corrección de A6](intent-route-architecture-correction-20261108.md) como
contrato prevalente y los IDs de [A6-CHECKLIST](A6-CHECKLIST.md) sin renumerar.
Base auditada: `14f36652f`, rama `codex/guardian-3d-animation`.

## Estado contrastado

`CURRENT-STATUS.md` conserva principalmente evidencia de octubre del guardián
original. Sus aprobaciones parciales y sus prioridades históricas no sustituyen
el orden A → B → C → D ni cierran la migración actual.

| Bloque | Implementación/evidencia contrastada | Estado real y trabajo pendiente |
| --- | --- | --- |
| A1/A3 | `a1-a3-contract-audit.md`; fachada y perfil WebGPU, autoridad Worker, catálogo de familias y pases | Contratos cerrados internamente en el alcance enumerado. No son aceptación de locomoción autónoma ni de la partida completa. |
| A2/A4/A5/A7 | Publicación incremental y recuperación; admisión/registro de recursos; `b-infrastructure-product-20261108/README.md` con Attack y recuperación real | Componentes integrados y evidencia acotada que se conservan. La nueva vía autónoma debe conectar sus garantías temporales y de relevo. |
| A6-04.e-R1/e-R2 | `8a1603029`, `75b52783d`, `18324a07f`, `95f834112`: mecanismo, admisión, reservas y reanudación nativos | Cerrados para la clase nativa documentada. No activan cruces ni consecuencias de gameplay. |
| A6-04.f-R1/f-R2 | `7e16571cc`, `8e0fb20e4`, `139a1c14a`, `14f36652f`: reloj ejecutado y propuestas no efectivas con commit condicionado | Cerrados en su dominio opt-in. Un consumidor y triángulos diagnósticos no equivalen a personajes de producto. |
| A6-04.f-R3 | Antes de este incremento, `attachNativeIntentControl` cerraba el canal anterior tras el ACK de bootstrap del reemplazo | Criterio de seguridad cerrado con el registro nativo y la evidencia descritos abajo. Un cierre de puerto no prueba drenaje GPU. |
| A6 restante y e-R3/e-R4/f-R4 | Checklist principal y corrección de propietarios | Integración de entidades, tráfico, persistencia, recursos coordinados y aceptación con personajes siguen pendientes. Los 11 puntos principales de A6 permanecen abiertos. |
| B1–B7 | Inventario del plan, cierres técnicos de suelo/cobertura y de infraestructura de B | Avances parciales reutilizables; no declarar B completo ni continuar contenido como sustituto del bloqueo A6. |
| C/D | Evidencia histórica con alcance explícito | No se ha superado C1–C4 para la migración completa. D va después de A/B/C. |

## Incremento f-R3: registro de consumidores y retirada GPU

La autoridad usa `native-intent-control-cohort.js` para registrar el consumidor
actual y el candidato de recuperación desde el comienzo del bootstrap. Un
relevo conserva ambos hasta recibir la retirada del anterior; ninguna frontera
física se concede mientras haya una incorporación pendiente. La pertenencia
queda bloqueada durante una propuesta física. Los recibos agregados son de un
solo uso y no se aceptan copias ni recibos de otro relevo.

`IntentControlRetire` viaja por el canal directo, fuera de preparación. El Worker
de dibujo detiene rAF y operaciones independientes antes de capturar
`queue.onSubmittedWorkDone()`. Su recibo debe coincidir con sesión, época,
secuencia, tiempo, versión de reloj y un token de retirada nuevo. También se
comprueban operaciones que estaban esperando recursos cuando llegó la retirada.

La disposición ordinaria solo comunica retirada después del drenaje. Una
pérdida real de `GPUDevice` puede certificar que ese dispositivo no seguirá
ejecutando; el aviso lleva el token efímero de esa conexión, recibido en su
baseline. Un aviso antiguo del mismo propietario nativo no retira al reemplazo.
No se guardan estos tokens ni se modifica el RNG de gameplay.

Timeout, canal perdido, recibo inválido o retiro sin prueba dejan los propietarios
sin certificar en el registro y bloquean nuevas mutaciones/relevos. No se
convierten en una retirada exitosa por abrir otro Worker. Esta es una política
conservadora: recuperar una conexión de estado incierto sin reiniciar autoridad
todavía requiere completar el protocolo de recuperación.

Validación del código: **169 pruebas dirigidas aprobadas, cero fallos/skips**,
en `native-intent-control-{publication,cohort,authority}`, `native-barrier-quiescence`,
`remote-webgpu`, `native-route-control`, `simulation-authority-client` y
`worker-hosted-runtime`. Se ejecutan con `.cache/tooling/node20.exe --test`
y los ocho archivos `.test.js` correspondientes. Node 24 del PATH rechaza los
imports JSON `assert` existentes; no se modifican para esta tarea.

Build: `VITE_WEBGPU_REMOTE_DRAW=true .cache/tooling/node20.exe node_modules/vite/bin/vite.js build`,
aprobado en 49,88 s, con los avisos existentes de imports mixtos/chunks grandes.
Recibos locales: `.cache/native-cohort-regression.tap` y `.cache/native-cohort-build.log`.
No es la suite completa ni una medición de rendimiento.

Los cambios locales previos de carga, simulación, escena, destrucción y QA quedan
fuera de estos commits.

El primer incremento de registro/retirada era parcial. El cierre de f-R3 se
documenta al final, tras conectar el registro también al bridge nativo.

## Evidencia real de relevo, pérdida y silencio

Código anterior: `9a8d56e9c`, publicado en la rama. El harness existente
`tests/browser/native-world-mutations.html` incorpora
`runNativeControlLifecycleAudit()`, reutilizando el preparador y dibujante de
f-R1/f-R2; no se añade otro renderer ni planificador.

[Recibo completo](performance/native-control-lifecycle-20261113.json): WASM real
y tres Workers de dibujo WebGPU NVIDIA/Turing sucesivos. Durante un bloqueo
síncrono de preparación de **500,065 ms**, la retirada se confirma aproximadamente
113 ms después del comienzo; el consumidor anterior dibuja cuatro veces y no
vuelve a dibujar después del drenaje. Un intento de mutación con el candidato
pendiente se rechaza sin modificar mundo/residencia. El reemplazo puede después
confirmar la adición de chunk mediante el mismo contrato condicionado.

Se destruye realmente el dispositivo del reemplazo y se conecta otro consumidor
a la misma autoridad/época después de su prueba de retirada. Un relay de prueba
retiene a continuación `IntentMutationQuiesce`: el reloj visible se mantiene en
10,25 s, límite nativo ejecutado; agotar el timeout cancela la propuesta, deja el
mundo intacto y cierra el grupo. No se acepta una retirada incierta por timeout.

Cero excepciones de página y cero respuestas HTTP fallidas observadas por el
listener de la página. La consola conserva **un 404 sin URL atribuida**; no se
silencia ni se declara resuelto, y el listener de página no cubre todas las
peticiones de Workers. Este ensayo no es aprobación global de recursos.

Reproducción, con Vite en 5181 y `PLAYWRIGHT_MODULE` apuntando a Playwright:

```powershell
.cache/tooling/node20.exe node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5181 --strictPort
# En otra terminal:
.cache/tooling/node20.exe tools/guardian/audit_native_control_lifecycle.mjs
.cache/tooling/node20.exe --test tests/native-control-lifecycle-evidence.test.js
```

`QA_BASE_URL` y `OUTPUT` permiten cambiar origen/destino. Se usa Edge headless;
no se habilita un adaptador software. Es aceptación de estas fronteras con
triángulos diagnósticos y ejecución nativa, no personajes reales, consecuencias,
recuperación de un Worker irrecuperable ni cierre del producto. Por sí solo no
cerraba f-R3: todavía faltaba ligar la cobertura del recibo al propietario nativo.

Regresión gráfica del mismo harness: los seis casos anteriores de f-R2 vuelven
a pasar con WebGPU real y preparación bloqueada; todos confirman la mutación
y no dibujan el paquete antiguo después del commit. Recibo local:
`.cache/native-world-mutations-regression.json`; la evidencia histórica no se
sobrescribe. Los tres comprobadores de recibos f-R1/f-R2/f-R3 y el análisis de
sintaxis de los scripts modificados también pasan.

## Cierre del criterio de seguridad f-R3

El bridge de Wild Engine registra cada cola gráfica que solicita baseline y su
propietario de frontera. Comprueba cobertura y pertenencia **antes de staging y
después del recibo**, tanto para motores de puerta como para las cuatro familias
de mutación. No basta entregar un publicador con el mismo estado o señalar un
propietario que no lo tenga registrado. Los observadores de diagnóstico sin GPU
no se convierten en colas gráficas.

La vida del registro es independiente de las suscripciones al log. Un cierre de
puerto, timeout o unsubscribe mantiene la cola incierta en el registro; un
recibo de drenaje válido permite retirarla. Las pruebas con WASM real cubren
omisión de otro consumidor activo, puerto ya cerrado, llegada durante la espera,
copia de publicador y asignación de propietario sin pertenencia. Ninguno cambia
el mundo ni revoca rutas. Después de drenar realmente el consumidor adicional,
la misma propuesta puede confirmar.

El [ensayo gráfico posterior al registro](performance/native-control-consumers-20261113.json)
vuelve a comprobar relevo durante bloqueo de 500 ms, pérdida real de dispositivo
y silencio, usando los mismos Workers. La política de seguridad ante conexión
irrecuperable es fallo explícito, ausencia de commit y retención del propietario
incierto. Ese fallo no se presenta como recuperación exitosa. Una pérdida real
de dispositivo puede recuperarse conservando la autoridad tras su prueba de
retirada; no se inventa esa prueba a partir de la muerte de un Worker.

**f-R3 cerrado en el dominio nativo opt-in de f-R1/f-R2.** De los ocho entregables
fijos quedan e-R3/e-R4/f-R4. Los padres e/f y los once puntos principales de A6
siguen abiertos. El siguiente bloqueo es f-R4: aplicar la misma mutación física
a los recursos/dibujo con personajes reales y preparación bloqueada. Todavía no
se activa autonomía de producto ni se sustituye el movimiento JS protegido.

Validación final de este incremento: **190 pruebas dirigidas, cero fallos/skips**,
añadiendo `spatial-native-gate-transactions.test.js` a la selección anterior.
Build WebGPU aprobado en 45,21 s con los avisos existentes. Recibos locales:
`.cache/native-consumer-registry-regression.tap` y
`.cache/native-consumer-registry-build.log`. El recibo gráfico posterior al
registro conserva el 404 de consola sin atribución descrito arriba.

## Último incremento: recursos canónicos de f-R4

[Implementación, validación y límites](f-r4-canonical-resources-20261113.md): el
commit nativo publica sus chunks reales por la sesión/canal de terreno existente
y entrega una frontera compacta a la publicación confirmada de la autoridad.
f-R4 sigue parcial: faltan admisión/retiradas gráficas y personajes reales.

El incremento siguiente conserva las retiradas por ese mismo canal: revisión,
confirmación y handoff sin resurrección por mensajes atrasados. Un receptor sin
propietario de retirada gráfica falla antes de cambiar residencia. Pasan 190
pruebas dirigidas y build; la admisión del surface y los cierres siguen pendientes.

Después de `f8a31ab8e`, terreno y vegetación tienen participantes reversibles de
retirada en el coordinador/adaptador existente, incluidos rollback de lotes mixtos
y notificaciones después del commit. Pasan 362 pruebas y build. Los tickets GPU
de estas pruebas son simulados; faltan callback del surface/cámara/grass,
frontera completa y aceptación gráfica con personajes. f-R4 sigue parcial.

Incremento posterior: callback de retirada del surface temporal conectado a
cámara y grass con la secuencia confirmada. Pasan 571 pruebas y build. El
[control WebGPU real](performance/confirmed-terrain-retirement-20261113.json)
retira y readmite terreno/cobertura/cámara con el mismo surface. Este control
secuencia recursos manualmente y no contiene personajes ni propuesta causal
nativa; no cierra f-R4. El siguiente bloqueo es la frontera nativa completa antes
de abrir el frame, incluidos uploads de frames rechazados, y su aceptación real.

El receptor preparado conserva ahora una constancia inmutable de las revisiones
que confirmó su lote gráfico; no la produce por ACK, commit lógico o resultado
ambiguo. Pasan 575 pruebas y build. Es una entrada para el contraste nativo del
frame, todavía pendiente, y no un permiso global de mundo/reloj ni recuperación.

El checkpoint visual conserva ahora el ticket físico de su autoridad solo si
el journal canónico sigue vigente. El preparador lo valida y el surface lo adopta
tras restaurar sus recursos; el Worker lo captura al abrir/cerrar el frame.
Pasan 696 pruebas y build. El replay de nuevas fronteras, recuperación ante frame
obsoleto/uploads y personajes reales siguen pendientes; no se cierra f-R4.

El replay recuperado contrasta ahora las fronteras canónicas con los lotes
realmente aplicados y admite la escena completa antes de exponer su identidad.
La preparación independiente de texturas conserva el guard de mundo para los
dibujos y no se repite en rAF. Pasan 728 pruebas de 58 archivos sin fallos/skips.
El [recibo GPU real](performance/native-world-replay-20261113.json) y la
[captura](performance/native-world-replay-20261113.png) acreditan relevo, checkpoint
ticket 1, retirada ticket 2 y nueve chunks con un trabajador estacionario visible,
seis dibujos y cero errores GPU. Tiempo fijo 10 y calidad muy baja; no son
locomoción autónoma, paridad visual ni bloqueo conjunto de 500 ms. Siguen pendientes
publicaciones vivas, recuperación de uploads rechazados y esa aceptación integrada.
f-R4 permanece parcial, sin cambios en los recuentos de A6/e/f.
`VITE_WEBGPU_REMOTE_DRAW=true`: build aprobado en 46,42 s; registros `.cache/native-world-replay-build.log` y `.cache/native-world-replay-regression.tap`.

La regresión de autoridad/control de producto conserva Shield y 15 dibujos durante
500 ms de bloqueo, sin errores capturados (`.cache/native-world-replay-product.log`).
Su fixture no contiene mallas de personajes ni locomoción nativa autónoma.

Los frames rechazados por cambio nativo ya activan la recuperación de surface
nuevo mediante el coordinador existente, con retención del consumidor anterior
hasta el relevo y sin reusar el bookkeeping de uploads. En WebGPU real, el paquete
rechazado deja 0 donde intentaba escribir 123; un upload permitido devuelve 123.
Una recuperación agrupada crea 3123 recursos y vuelve a presentar ticket 2:
[recibo](performance/native-world-obsolete-20261113.json),
[captura](performance/native-world-obsolete-20261113.png). Se usa markLost
inyectado en el harness; queda verificar el journal/cliente principal con la
autoridad normal y la admisión de publicaciones vivas. Pasan 791 pruebas de 67
archivos sin skips/fallos y build en 47,65 s. f-R4 sigue parcial y los 11 padres
A6 abiertos; no es aceptación de locomoción nativa ni de 500 ms conjunta.

Se incorpora una [vista nativa de recursos antes del efecto físico](f-r4-prepared-world-resources-20261113.md): solo el delta canónico se entrega al hook de preparación antes del hold GPU. Cancelación/fallo o dependencias nuevas no detienen el dibujo anterior. Pasan 859 pruebas/73 archivos y build WebGPU; standalone y pthread reconstruidos. El handle GPU de estas pruebas es un doble, no aceptación gráfica. La observación del usuario sobre 3123 recursos corrige expresamente el alcance: el fallback que recrea un dispositivo sano sigue siendo demasiado amplio y pendiente de sustituir por conservación de recursos y uploads. No se ha eliminado aún ese fallback ni cerrado f-R4.

El [transporte retiene uploads del frame obsoleto](f-r4-retained-preparations-20261113.md) hasta comandos nuevos del mundo correcto, con pins y presupuestos, y cancela la espera del pipeline abandonado. Recibo GPU real: mismo Buffer:5, contador 18 → 18, readback 123, sin forks ni errores GPU. Es diagnóstico sin personajes. La regresión del surface de producto sigue seleccionando el fallback de 3123 recursos, brecha explícita pendiente. Pasan 871 pruebas/74 archivos sin fallos/skips y build WebGPU en 1 min. Sigue pendiente consumir la propuesta/delta en el surface existente; no se cierra f-R4 ni A6.

El [delta preparado ya se consume en el surface existente](f-r4-prepared-terrain-delta-20261113.md) mediante el canal y coordinador actuales, con bytes/revisiones exactos y activación única por confirmación. En NVIDIA real se retira/readmite un chunk conservando renderer, dispositivo, escena, personaje estacionario y los cuatro IDs de buffers de otro chunk. El preparador bloqueado 500,7 ms deja 15 dibujos del mundo anterior y ningún efecto físico. Los pipelines nuevos de la readmisión se crean antes del hold. Sigue pendiente el coste nativo de 39,9 ms tras drenaje y la rama de frame obsoleto, cuya regresión todavía reconstruye 3128 factories. La vía no está activada en gameplay normal ni acredita locomoción; f-R4 y los once padres A6 siguen abiertos. Validación: 891 pruebas/77 archivos sin fallos/skips y build WebGPU.

La [adición nativa ya instala sus datos y sectores preparados](f-r4-native-prepared-commit-20261113.md), revalidando también perfiles y revisiones del grafo. El journal conserva sus buffers propios después de soltar la propuesta, y la exportación evita regenerar/seleccionar el chunk. Paridad con la vía canónica en los seis biomas y seis perfiles, incluidas rutas transitables entre chunks. Standalone/pthread reconstruidos; 902 pruebas/78 archivos sin fallos/skips. En el mismo ensayo WebGPU, commit/proyección de readmisión pasa de 39,9 a 1,6 ms; bloqueo previo de 500,9 ms permite 15 dibujos del mundo anterior, con los mismos buffers y dispositivo. No es locomoción ni latency máxima. Quedan otras familias, el frame obsoleto en vuelo y la autoridad normal; f-R4 y los once padres A6 abiertos.

La [continuación de frames nativos preparados](f-r4-frame-continuation-20261113.md) adapta la invalidación de grabaciones de Babylon y el ciclo real de NodeFrame de Three, sin nuevas dependencias. Dos frames obsoletos en tránsito se sustituyen por grabaciones nuevas en los Workers reales de producto, conservando 93 buffers de vértices, 39/21 uploads usados sin reenvío y el mismo propietario, sin errores GPU. Cierre y drenaje comprobados. 914 pruebas/79 archivos aprobados. Quedan otros casos de recuperación, otras familias, la autoridad normal y la aceptación con personajes autónomos; f-R4 y A6 siguen abiertos. La consulta de código fuente consolidado antes de cada mecanismo queda incorporada a MIGRATION-OBJECTIVE.md por instrucción del usuario.

La [retención de terreno en revisiones de props](f-r4-unchanged-terrain-20261113.md) separa identidad de publicación y recursos en los mismos propietarios, con patrones consultados en el código real de Three/Godot. En WASM/WebGPU real, eliminación/restauración de un prop conserva los cuatro buffers y la textura de máscara en uno/dos chunks afectados, sin errores/forks y con drenaje al cerrar. La prueba GPU detectó la promoción Uint16→Uint32 de Three; se corrige la comparación por valores canónicos. Queda el coste nativo de props (14–18 ms tras drenaje), preparación de otras familias, autoridad normal y aceptación integrada. No se cierra f-R4/A6.

Los [props nativos ya instalan sus recursos preparados](f-r4-native-prepared-props-20261113.md), con patrones leídos en fuentes de Detour/Godot. Se conservan guardas, halos y revisiones canónicas; propuestas de claves sin prop ya no inventan chunks gráficos. Paridad de supresión en seis biomas/perfiles y restauración protegida con ejecución nativa; runtime pthread real conserva aislamiento de su job previo. En NVIDIA real, commit/proyección de props pasa de 14,2/18,2 ms a 0,9/1,3 ms, sin recetas nuevas tras preparación ni reemplazo de terreno/dispositivo. Quedan reutilización de instancias gráficas, terreno, autoridad normal y aceptación integrada; f-R4/A6 permanecen abiertos.

La [retención gráfica de slots de props](f-r4-retained-biome-slots-20261113.md) aplica la granularidad de datos leída en fuentes de Three/Godot a la admisión conjunta existente. Los grupos conservados se admiten realmente sin mover meshes ni duplicar sus leases; cancelación/rollback descartan solo lo nuevo. Selección y queries far soportan los grupos efectivos. En NVIDIA, 6/16 meshes mantienen sus buffers y materiales, sin errores/forks y con drenaje al cerrar; preparación 278/785 → 11/170 ms en el fixture y factories de ambos cambios 739 → 201. Quedan slots parcialmente cambiados, terreno y familias restantes, autoridad normal y aceptación; f-R4/A6 abiertos.

El 14 de noviembre se incorpora la [instalación nativa de terreno preparado](f-r4-native-prepared-terrain-20261114.md), adaptando patrones leídos en fuentes de Recast/Detour y Godot. Se conserva el orden canónico por chunk/perfil y bordes, con guardas físicas revalidadas y muestras retenidas solo del delta. Diez casos nuevos comparan geometría/grafos/rutas con la vía canónica y ejercitan el runtime pthread; pasan 963 pruebas/83 archivos. En NVIDIA, las alturas nuevas coinciden con el terreno admitido y se conservan 3/8 terrenos y 22/50 meshes de props intactos, sin forks/errores y con drenaje. El commit/proyección nativo tarda 4,9/11,6 ms, pero el primer dibujo nuevo llega 90,8/169,5 ms después del drenaje y hay intervalos de hasta 199,8 ms entre dibujos. Esa demora posterior al commit es el siguiente bloqueo explícito; no se acredita ausencia de tirones ni locomoción. Autoridad normal, e-R3/e-R4/f-R4 y los once padres A6 siguen abiertos.

Se desglosa el [relevo preparado posterior al commit](f-r4-prepared-handoff-20261114.md). La comparación binaria exacta adopta el recorrido directo consultado en Node/fast-deep-equal, manteniendo límites de vistas, bits de floats y todos los rechazos del canal. En la restauración grande, staging/armado/publicación pasan de 11,6/23,0/11,4 ms a 2,3/3,6/1,7 ms. El primer dibujo pasa de 176,1 a 104,9 ms desde el drenaje en estas dos ejecuciones, pero la activación todavía tarda 43,6 ms y hay un intervalo entre dibujos de 132,1 ms. Pasan 966 pruebas en 84 archivos sin fallos/skips. Ese trabajo pendiente impide acreditar continuidad; f-R4/A6 y la entrega integrada permanecen abiertos.

La [validación de tickets por fase reversible](f-r4-prepared-phase-validation-20261114.md) adapta las fronteras de commit consultadas en el reconciliador de React. El coordinador existente verifica el conjunto completo antes del commit y tras cada fase síncrona reversible; cancelación/cierre siguen comprobándose entre participantes y no hay retiro/notificación hasta superar todas las guardas. Cinco casos nuevos cubren coste lineal, invalidaciones cruzadas y cancelación inmediata. En NVIDIA, la activación de la restauración pasa de 43,6 a 22,8 ms, sin reconstruir recursos intactos; primer dibujo a 86,9 ms e intervalo máximo entre dibujos de 99,9 ms. Sigue sin acreditarse ausencia de tirones. La regresión de Workers reales regraba dos frames obsoletos conservando 93 buffers por paso y dispositivo, sin errores, con drenaje. Pasan 971 pruebas/84 archivos sin fallos/skips. f-R4/A6 y la entrega integrada siguen abiertos.

La [retención de aldeas intactas](f-r4-retained-villages-20261114.md) elimina una reconstrucción tardía provocada por el contador global de avisos de terreno. El perfil CDP localiza unos 21 ms en otra admisión del candidato de nueve edificios después del commit; se adapta la distinción notificación/snapshot consultada en React y las claves reales de RenderObjects de Three. La clave existente usa ahora layout y alturas efectivas, conservando reintento, cancelación y pérdida/reversión de residencia. En WASM/WebGPU real se conservan los nueve meshes residentes y todos sus IDs GPU, sin otra compilación de esa aldea; espera hasta envío inferior a 1 ms. Pasan 992 pruebas/88 archivos y la regresión de dos frames obsoletos conserva 93 buffers por paso y dispositivo, sin errores, con drenaje. Los cambios de terreno todavía crean 8/20 recursos al grabar el primer frame; su admisión previa y los consumidores con apoyo realmente cambiado siguen pendientes, junto con autoridad normal y aceptación A–F/B/C. f-R4 y los once padres A6 permanecen abiertos.

La [preparación de bindings y recursos de sombras](f-r4-prepared-shadow-bindings-20261114.md) adapta la clave escena/cámara/nodo de luces leída en Three r180. La admisión usa el nodo de la cámara de sombra y restaura el estado antes de esperar; el pase de color mantiene su opción desactivada en el recibo. El mismo servicio confirma el prefijo de uploads, patrón consultado en Dawn/wgpu, antes de devolver ready y solicitar el hold. Las seis mutaciones dejan cero factories en el primer dibujo, frente a 8/20 recursos tardíos en terreno. Las copias internas de uniforms/bind groups se contabilizan aparte y terminan antes de solicitar quiescencia; no se copian buffers de geometría. Pasan 1099 pruebas/92 archivos, con 12 casos nuevos de contexto y finalización. La regresión de Workers reales vuelve a regrabar dos frames obsoletos conservando 93 buffers por paso y dispositivo, sin errores y con drenaje. La admisión de color al encuadrar geometría nueva, consumidores cuyo apoyo cambie, autoridad normal y aceptación integrada siguen pendientes; f-R4 y A6 permanecen abiertos.


La [admisión del pase de color en el contexto efectivo](f-r4-prepared-color-context-20261114.md) usa las claves reales de escena y la invalidación puntual de `Nodes` consultadas en Three r180, sin avanzar `info.calls`. Niebla/entorno/luces estructuralmente cambiados invalidan el ticket, mientras sus uniforms ordinarios lo conservan. El adaptador común se activa por defecto, conservando opt-out explícito. La cámara amplia reproduce 64 factories tardías con la opción anterior; las seis mutaciones nativas visibles y dos movimientos posteriores de cámara pasan ahora con cero factories, mismos propietarios e IDs intactos, copias internas previas al hold y drenaje. La comparación GPU de doce estados de niebla/entorno/día-noche deja cero canales distintos frente al render directo y exige efecto visual de cada eje. Pasan los seis biomas/día-noche, 1113 pruebas/93 archivos, 119 dirigidas finales y build en 46,32 s. Dos frames obsoletos de Workers reales conservan 93 buffers por paso y dispositivo, sin reemplazos/errores y con drenaje. Quedan consumidores cuyo apoyo sí cambia, demás familias/streams, autoridad normal y aceptación A–F/B/C; no cambia el recuento de A6/e/f ni se declara ausencia general de tirones.


La [proyección de aldeas con apoyo cambiado](f-r4-prepared-village-support-20261114.md) participa ahora en el batch reversible de terreno/props antes del efecto nativo. La vista usa los meshes candidatos y el sampler existente sin instalarlos en residencia viva. Se adapta la preparación por dependencias y el recurso anterior consultados en Bevy; slots, bancos, leases y admisión siguen siendo los propietarios comunes. El control sin callback detecta 54 creaciones tardías (36 buffers de uniforms/18 bind groups). La prueba preparada añade modificación/restauración de seis alturas de edificio: ocho mutaciones sin factories ni mensajes de creación tardíos, nueve geometrías/materiales e IDs de buffers conservados, sin recompilar la aldea tras ready; el bloqueo de 500 ms mantiene 15 dibujos anteriores. Los layouts con proyección intacta conservan sus meshes; el layout cambiado usa instancias nuevas preparadas. La captura final restaurada coincide byte a byte con el incremento anterior. Pasan 1142 pruebas/94 archivos, 107 dirigidas finales y build en 42,26 s. Dos frames obsoletos conservan dispositivo y 93 buffers por paso sin errores/reemplazos y con drenaje. Quedan centros/muros, cultivos/cajas, efectos y apoyos de personajes, demás familias/streams, autoridad normal e intenciones y aceptación A–F/B/C; f-R4 y los once padres A6 continúan abiertos.


La [auditoría de consumidores retenidos](f-r4-retained-terrain-consumers-20261114.md) confirma que centros/muros intactos y dañados, cultivos (incluido bridge 21) y cajas ya conservan sus recursos al modificar/restaurar el apoyo. Se contrastaron Bindings/Attributes de Three y el ciclo de vida de wgpu; no fue necesario añadir sustituciones ni cambiar el transporte. Tres escenarios, ocho mutaciones cada uno: cero factories en el primer render y mensajes de creación tardíos, matrices/alturas cambiadas con los mismos meshes e IDs, preparación bloqueada manteniendo dibujo anterior y drenaje final. El acercamiento de cámara inicia 96 creaciones de LOD, con ocho pipelines asíncronos, fuera de los renders; cada render intermedio y el primer draw estable tienen cero factories. Esta admisión se mide separadamente sin relajar los gates físicos. Pasan 104 pruebas dirigidas y sintaxis QA; producción sigue en cb29ec41c, sin otro build presentado como nuevo. Quedan efectos activos, cambios de familia/topología, apoyos y personajes en movimiento, autoridad ordinaria/intenciones y aceptación A–F/B/C. No cambian los cierres de A6/e/f.


La [identidad de ruta nativa en los uniforms de Three](f-r4-native-three-clock-20261114.md) enlaza el adaptador existente con actor/asignación/handle inmutable, sin otro reloj ni cambios de clave estructural. Se consultaron las implementaciones de grupos/bindings de Three r180. Siete casos nuevos usan offsets reales de NodeUniformsGroup sobre un backend de prueba; pasan 22 dirigidas, 127 de regresión y build en 45,25 s. Todavía no se ha demostrado locomoción de mallas reales: sigue la representación de la ruta futura con apoyo 3D y su admisión/recuperación. No se reutiliza un permiso histórico para autorizar futuro ni se activa autonomía de producto; A6/e/f mantienen sus pendientes.

La [captura completa de asignaciones nativas y su apoyo 3D](f-r4-native-route-support-20261114.md)
usa los nudos/muestras C++ y el cálculo de triángulos ya existente. Conserva el
recurso entero, fases y la identidad inmutable; cambiar terreno ajeno a la ruta no
invalida su apoyo. Las pruebas contrastan WASM y raycast de Three. Es preparación
de datos, aún sin reproducción GPU en personajes originales ni autonomía ordinaria;
f-R4 y los once padres de A6 permanecen abiertos.

La [reproducción GPU de la ruta completa sobre el trabajador original](f-r4-native-gpu-character-20261114.md)
utiliza la búsqueda binaria leída en Godot y las primitivas TSL de Three. El
propietario de materiales/transform es común con el histórico. Dos pruebas con
WASM y el dibujante real conservan 15 frames durante un bloqueo de 500 ms, rig y
uniform CPU inmóviles, tiempo nativo finito, cancelación y drenaje. La ruta larga
retiene 2.971 nudos y se consulta más allá del cursor 106, sin recortarla. Primera
presentación preparada del personaje: cero fábricas GPU instrumentadas. El
perfil olderFemale utiliza sus texturas y bake originales. Esto sustituye la
limitación de triángulos en esta prueba de componente; no conecta todavía las
asignaciones a WorldSurface/rosters ordinarios ni sus cambios de clip/recuperación.
f-R4, e-R3/e-R4 y los once padres permanecen abiertos.


Continuación parcial f-R4, 14 de noviembre: [preparación y relevo en los propietarios normales del trabajador](f-r4-native-worker-owners-20261114.md). WorldClient/Worker/Surface/roster preparan y confirman el primer dibujo; la misma asignación conserva los 1939 recursos del mundo de prueba. Relevo sobre el rig y geometría existentes, cero fábricas GPU en el primer render y 15 dibujos durante bloqueo de 500 ms. El productor ordinario de asignaciones, transiciones, demás intenciones y aceptación integrada siguen pendientes; no cambia el recuento de cierres.


Continuación parcial f-R4, 14 de noviembre: [Run/Walk nativos sobre la misma malla](f-r4-native-run-walk-20261114.md). El shader consume los dos bakes originales y selecciona sus fases con C++, sin cambios CPU al cruzar el límite. La prueba con los dos Workers normales cruza ese límite durante un bloqueo de 500 ms; no crea recursos en el primer render. Quedan Carry, Idle/puerta/acción, productor/ejecución ordinarios e integración completa.
