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
| A6-04.f-R3 | Antes de este incremento, `attachNativeIntentControl` cerraba el canal anterior tras el ACK de bootstrap del reemplazo | Siguiente dependencia. Un cierre de puerto no prueba drenaje GPU. Se implementa abajo; el entregable completo permanece abierto. |
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

**Pendiente fijo:** f-R3 sigue parcial; no se cambia la cuenta de 4 entregables
cerrados y 4 pendientes. Falta completar la recuperación segura de un propietario
incierto y acreditar la conexión de todas las fronteras de producto. Después:
f-R4, e-R3 y e-R4; resto de A6, B y C según sus dependencias.
