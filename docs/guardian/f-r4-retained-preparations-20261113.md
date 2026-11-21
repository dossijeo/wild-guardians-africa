# f-R4: conservar uploads y recursos tras rechazar un frame

Continuación de 6dd575bed, 13 de noviembre de 2026. **f-R4 sigue parcial**.
Se mantiene el orden A → B → C → D y la exigencia de conservar el dispositivo
sano y los recursos sin cambios. No se declara resuelto el problema de tirones.

## Qué cambia en el transporte existente

El host conserva ahora las inicializaciones de recursos que Three ya contabilizó
como enviadas cuando un cambio nativo invalida el frame antes de presentarlo.
Retiene writeBuffer, writeTexture, imágenes externas y los filtros/borrados de
textura declarados por el contrato existente. Descarta los comandos de dibujo
obsoletos; el propietario debe registrar pases nuevos para el mundo admitido.
No retaggea comandos antiguos ni concede tiempo o vigencia a una ruta.

La retención preserva la cola en orden, los bytes/bitmaps y las referencias a las
generaciones concretas del host, incluso si el productor libera un recurso.
Una instantánea enviada por el productor no elige qué generación nativa retener.
El siguiente paquete válido incorpora únicamente las inicializaciones cuyos
recursos todavía necesita, seguidas de las escrituras posteriores. Lo que deja
de usarse se libera sin subirlo. Las imágenes se cierran al consumirse o
abandonarse; una inicialización se ejecuta una vez, nunca como trabajo de rAF.

Un commit nativo cancela también la espera de admisión del paquete obsoleto.
Un pipeline que ya no se utiliza puede seguir compilándose en el driver, pero
su promesa no bloquea el siguiente paquete que usa recursos ya preparados.
Los waiters de control y sus timers se desligan al cancelar esa admisión.
No se cancela ficticiamente trabajo nativo ya iniciado ni se debilitan las
comprobaciones de mundo, reloj, cobertura, drenaje o replay.

La retención usa los límites existentes de operaciones y bytes del frame,
incluido el tamaño RGBA estimado de ImageBitmap y el número agregado de comandos.
Compute, readbacks/copias sin un contrato repetible, mezcla de generaciones o
capacidad agotada no se convierten en una reparación parcial silenciosa. El host
marca recuperación requerida; las generaciones retenidas se liberan. Retirar un
consumidor descarta primero sus inicializaciones aún no enviadas, y luego prueba
el drenaje real de la cola. Un ACK de rechazo no equivale a ejecución GPU.

El mensaje frame-obsolete incluye resourcePreparationsRetained, y el cliente
remoto lo conserva en el error tipado. Esta propiedad acredita los uploads, no
la validez del estado de Three o de todos sus targets intermedios. El propietario
del mundo sigue siendo responsable de aplicar el delta y regenerar sus pases.

## Evidencia GPU de conservación

[Recibo NVIDIA/Turing](performance/native-retained-preparations-20261113.json):
se reutiliza el harness nativo y el Worker de dibujo de producto. El preparador
abre un paquete, incluye un upload de 16 bytes y queda bloqueado 500 ms. La
mutación real invalida ese paquete. Su sustituto registra comandos nuevos con
el ticket correcto y usa el upload retenido sin reenviarlo.

| Dato | Antes | Después |
| --- | --- | --- |
| ID del buffer | Buffer:5 | Buffer:5 |
| Recursos creados por el proxy | 18 | 18 |
| Forks nativos de buffers/bindings | 0 | 0 |
| Readback tras el paquete válido | — | 123 |
| Recursos retenidos pendientes tras presentarlo | — | 0 |

El contador excluye los views/transitorios del swapchain y no mide bytes GPU ni
latencia. Se conserva el mismo Worker/dispositivo/pipeline/grupos/buffers; no se
reconstruye un renderer en este ensayo. Cero errores GPU capturados y ninguna
excepción de página. La consola conserva un 404 sin URL atribuida; no se presenta
como ausencia global de avisos.

El dibujo usa un triángulo que consume la tabla nativa. La mutación afecta un
chunk fuera de su vista. No acredita personajes, cambio visible de terreno,
reutilización de toda la escena de producto ni continuidad del dibujo después
del efecto físico durante un preparador bloqueado. El paquete anterior sigue
protegido/congelado por la frontera nativa hasta su sustitución.

Reproducción: QA_AUDIT=retained-preparations, QA_BASE_URL apuntando al Vite local
y PLAYWRIGHT_MODULE a la instalación externa de Playwright; ejecutar
.cache/tooling/node20.exe tools/guardian/audit_native_control_lifecycle.mjs.

## Validación y siguiente punto real

**871 pruebas de 74 archivos**, cero fallos/skips:
.cache/native-retained-preparations-selection.json y
.cache/native-retained-preparations-regression.tap. Nueve pruebas nuevas del
host cubren uploads sin reenvío, pipeline no utilizado sin resolver, paquete ya
admitido, orden posterior, retirada de recursos, textura/filtro una sola vez,
compute no reparable, capacidad y retiro del consumidor, y metadatos ajenos.
Tres pruebas del selector cubren el orden, comandos excluidos e imágenes.
Build WebGPU aprobado en **1 min** (.cache/native-retained-preparations-build.log).

La [regresión de producto](performance/native-retained-preparations-product-fallback-20261113.json)
conserva checkpoint/replay, trabajador estacionario, seis dibujos y cero errores
GPU. También confirma la brecha: aunque los uploads ya están retenidos, ese
harness/coordinador todavía elige fresh-surface y crea **3123 recursos nuevos**.
No se ha eliminado aún ese fallback de la ruta de producto.

El siguiente trabajo es conectar la propuesta nativa previa al preparador de
producto y consumir los deltas/pases preparados en el mismo surface/dispositivo.
El Worker debe distinguir la retención disponible y resolver la invalidación sin
reiniciar su renderer, conservando estado de recursos y targets y sin aceptar
una etiqueta nueva como sustituto de la aplicación real del cambio. Validar con
los propietarios reales y sus materiales antes de activar esa vía normalmente.

Después siguen la aceptación con autoridad/interfaz normales y personajes con
planes nativos completos, bloqueo de preparación, pausa/velocidad y revocación.
Los once padres A6 y e-R3/e-R4/f-R4 permanecen abiertos.
