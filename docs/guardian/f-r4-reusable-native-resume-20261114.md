# f-R4 parcial: renovar datos de reanudación sin reconstruir recursos

Fecha: 2026-11-14. Base: `fb7b6b162`. Rama: `codex/guardian-3d-animation`.
Continúa la [revalidación nativa](f-r4-native-resume-revalidation-20261114.md)
y el [plan integrado](integrated-gpu-migration-plan-20261104.md).
Todos los padres A6 y e-R3/e-R4/f-R4 siguen abiertos.

## Cambio y propiedad

Una preparación de reanudación puede terminar después de avanzar el reloj
nativo. Ahora conserva su grafo, textura de datos, materiales y buffers para
preparar otra propuesta compatible del mismo cuerpo suspendido. La preparación
del paquete es elegibilidad de datos; no concede movimiento ni tiempo de dibujo.
El núcleo sigue rechazando el commit de una propuesta con frontera caducada.

El propietario existente de recursos ofrece `invalidate` y `refresh` sobre la
misma petición retenida. Invalida el paquete anterior y revierte sus participantes
antes de cambiar datos; captura otro paquete que nombra el ticket nuevo.
No cambia la frontera de un paquete ya capturado. El dibujante independiente
conserva mientras tanto su mundo anterior, con el personaje suspendido.

La reutilización exige mismo cuerpo, detención, asignación y generación de
origen, generación candidata, perfil, flags, radio, capacidad de textura y
geometría de puertas, con ticket posterior. Los intervalos y datos se vuelven
a obtener de la propuesta nativa y del soporte residente. Datos idénticos no
incrementan la versión de textura; datos distintos de la misma capacidad se
suben a la textura existente. Una incompatibilidad cancela el candidato;
requiere preparar la representación que haya cambiado.

Los relojes conservan sus nodos y buffers físicos. El adaptador actualiza su
metadato mediante comparación de la referencia anterior con la nueva y vuelve
a registrar offsets incluso cuando Three no necesita escribir el uniforme.
Las referencias a grupos son débiles. La selección usa la referencia y época
nuevas; las curvas de puerta actualizan sus seis filas de uniformes existentes.
Publicar sella los recursos y bloquea posteriores cambios de datos. Cancelación,
fallo y reemplazo de propietario mantienen el descarte del candidato.

## Código fuente consultado y decisión

Se leyó la implementación real de Three **r180**, también instalada en el repo:

- [Bindings.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Bindings.js),
  `_update`: distingue actualizar uniformes/contenido de reemplazar bindings por
  una generación de textura diferente.
- [Textures.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Textures.js),
  `updateTexture`: las texturas de datos inicializadas actualizan contenido sin
  recrear textura y sampler. Conservar capacidad evita cambiar representación.
- [WebGPUBindingUtils.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/utils/WebGPUBindingUtils.js),
  `createBindings` y `updateBinding`: mantiene layout/buffer y escribe sus datos.

Se adapta esa distinción contenido/identidad dentro de los propietarios
existentes. No se añade dependencia, cache global, temporizador, planner ni ABI
nativo. La revalidación física sigue usando el constructor C++ existente y el
commit condicionado; mantener recursos no mantiene permisos caducados.

## Evidencia y límites

El [recibo de validación](performance/native-resume-refresh-validation-20261114.json)
registra pruebas dirigidas, regresión, build, sintaxis y hashes del código.
Pasan 138 pruebas dirigidas. La regresión de 152 archivos registra 1713 casos:
1711 aprobados y los dos fallos heredados Carry/Harvest, sin omisiones ni
cancelaciones. Build y sintaxis pasan; no cambian los binarios nativos.
La [prueba hardware](performance/native-worker-world-owner-refreshed-20261114.json)
prepara el candidato anterior mientras avanza el reloj, revalida y renueva sobre
el mismo propietario. Comprueba cero factories adicionales durante esa renovación,
adopción directa durante 1800 ms de bloqueo del preparador, selección normal,
geometría/rig retenidos, cero recursos posteriores a preparado y drenaje real.
En NVIDIA Turing registra 54 dibujos durante el bloqueo. La preparación inicial
del relevo crea 70 recursos (36 buffers, 16 grupos, 16 layouts, una textura y
su sampler); renovarla crea cero recursos de cualquier clase, incluidos pipelines.

La escena hardware contiene un trabajador original; no acredita el movimiento
de un segundo trabajador durante la preparación. La prueba de datos de terreno
alterados tampoco autoriza una mutación física del apoyo actual.

**Sigue pendiente la admisión ordinaria bajo avance continuo durante toda la
preparación y el drenaje.** Cada propuesta conserva su frontera exacta y puede
caducar de nuevo. Este incremento evita reconstruir recursos compatibles al
renovarla; no justifica parar la simulación ni garantiza que reintentar alcance
una frontera válida. Falta resolver esa adopción y conectar productor/ejecutor
ordinarios, todas las intenciones, acciones, consecuencias, persistencia y
aceptación integrada A/B/C. No se declara ausencia global de tirones.

### Comprobación del siguiente mecanismo

Se ensayó después una coordinación con reintentos acotados y los recursos
retenidos. La prueba nativa pasó, pero la prueba real WebGPU con reloj cada
20 ms agotó 16 intentos: una preparación y 15 renovaciones, todas caducadas
antes del commit. Se retiró el mecanismo provisional y su fixture; no se entrega
como solución. El resultado confirma que reintentar la misma frontera exacta no
garantiza admisión bajo avance continuo.

También se leyó [React 19.2, ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/v19.2.0/packages/react-reconciler/src/ReactFiberWorkLoop.js),
`performWorkOnRoot` e `isRenderConsistentWithExternalStores` (1081–1108 y
1534–1587): compara snapshots después del trabajo concurrente y rehace un
resultado inconsistente. Su fallback síncrono bloquea nuevas mutaciones; no
se traslada a la simulación de Wild Guardians. El siguiente mecanismo debe
permitir fijar el instante definitivo sobre datos gráficos compatibles,
con prueba física actual y nueva confirmación directa, sin parar otros cuerpos.
Ese mecanismo aún no está implementado ni validado.
