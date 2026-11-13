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
