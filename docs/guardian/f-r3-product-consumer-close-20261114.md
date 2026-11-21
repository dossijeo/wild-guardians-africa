# Cierre del consumidor GPU de producto con recibo de drenaje

14 de noviembre de 2026. Base `651048dc6`. Complementa la seguridad de f-R3;
no cambia los gates pendientes de e-R3/e-R4/f-R4 ni declara A6 completo.

Al ampliar la prueba con los propietarios normales se encontró que el preparador
confirmaba `disposed` antes de terminar el fence del host de dibujo. WorldClient
podía terminar ese Worker y perder el certificado nativo de retirada.

Se consultó el código de [Three r180, WebGPUBackend.waitForGPU](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/WebGPUBackend.js#L1349):
espera `queue.onSubmittedWorkDone`. Se reutilizan ese fence y el certificado de
retirada ligado al token de la conexión que ya posee nuestro host.

El RPC de recursos `dispose` responde después de parar el replay, drenar la
cola, notificar la retirada por el canal nativo y liberar los recursos. El
cliente remoto ofrece `disposeAsync`; WorldSurface espera su respuesta antes
de confirmar el cierre del preparador. Sólo entonces WorldClient termina el
Worker de dibujo. Las peticiones repetidas comparten el cierre en curso.

El RPC puede unirse a un host ya detenido, incluida una pérdida de dispositivo
durante el cierre. Un error de fence rechaza la petición; no emite una respuesta
exitosa. El protocolo nativo, su token y su propietario no cambian; una ausencia
o un timeout del canal no equivalen a un drenaje certificado.

Validación dirigida: `.cache/tooling/node20.exe --test tests/remote-webgpu.test.js
 tests/native-frame-continuation.test.js tests/native-intent-control-cohort.test.js
 tests/native-intent-control-publication.test.js`: 120 aprobadas, sin fallos ni
omisiones. WASM real y GPU simulada con fence diferido: el recibo nativo sigue
pendiente hasta resolver la cola; antes de ese instante no se termina el dueño.
También se prueban el fence fallido y la unión al cierre con device loss.
Log local: `.cache/native-close-directed.tap`.

La aceptación integrada de la migración sigue abierta. El incremento Run/Walk
registra por separado la comprobación real con ambos Workers y NVIDIA Turing.
