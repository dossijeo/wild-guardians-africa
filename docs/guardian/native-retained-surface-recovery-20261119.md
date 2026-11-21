# Recuperación retenida en la Surface existente — 2026-11-19

Continúa `8bbf5daa7`, A4/e-R3/f-R4. La Surface existente puede reconciliar un checkpoint completo, reproducir su diario y admitir la frontera nativa final conservando renderer, dispositivo, escena, actores y recursos sin cambios. El checkpoint idéntico no crea objetos ni generaciones nativas. Esta entrega cierra esa integración de componente; **el handoff ordinario de WorldWorker/cliente/UI/productor todavía no selecciona el modo retenido y la cadencia sigue abierta**.

## Referencias de código y decisión

Antes de implementar se inspeccionaron las fuentes fijadas de [React 19.2, `ReactFiberHooks.js`](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/ReactFiberHooks.js), [fast-deep-equal 3.1.3, `src/index.jst`](https://github.com/epoberezkin/fast-deep-equal/blob/d807ffc5013e710deb1c63d463a03f729bcd144d/src/index.jst) y [Three r180, `Pipelines.js`](https://github.com/mrdoob/three.js/blob/0af9729d0c143a86a1d725d6e2c3ad83301f3f34/src/renderers/common/Pipelines.js). Símbolos, snapshots y SHA-256 constan en el recibo. React vuelve a contrastar el snapshot después de una espera/commit; el comparador recorre claves propias y arrays ordenados; Three reutiliza pipelines solo mientras sus predicados de actualización lo permiten.

Se adaptan esos patrones a los propietarios existentes: igualdad semántica de los DTO de presentación/trabajo, revalidación tras preparar/commit/admisión asíncrona y conservación de la última prueba real de admisión de escena mientras siguen válidos su frontera exacta, propietario, materiales, geometrías, pases y readiness. No se añade una dependencia, otro propietario de estado ni un banco de recursos. También se contrastó el runtime realmente importado (`build/three.webgpu.js`, parche local de `compileShadowAsync`), además del código `src` de Three.

## Implementación

- La capacidad ya negociada de checkpoints/presentación/terreno coordinado habilita recuperación retenida en el mismo controlador. La opción estricta por operación conserva la recuperación fresca y permite fresca→viva→retenida y nuevos ciclos retenidos sobre los mismos receptores.
- Se mantienen las comprobaciones de sesión, secuencia, tiempo, snapshot completo, poses, headings y época. Guardian, bendiciones e historias de agricultura/trabajo deben coincidir con los exports actuales, incluidos campos adicionales y orden de arrays. No se importan de nuevo ni se duplican efectos. Datos no finitos, DTO incompatibles y cambios durante las esperas provocan fallo.
- Mientras se recupera se bloquean nuevos dibujos y picking. Se reutiliza la reconciliación completa de recursos y sus participantes de terreno/bioma/soporte; el diario sigue el controlador/receptores existentes. Solo `finishTimelineRecovery` libera la Surface tras completar replay y contrastar la frontera requerida por el control nativo real. Un checkpoint de recursos no se transforma por sí solo en permiso físico o de reloj.
- Un checkpoint idéntico reutiliza la prueba existente únicamente si `valid()` conserva todos sus read sets. Cambiar `material.version` exige una nueva admisión de escena; los dibujos posteriores siguen sin fábricas de recursos dentro de `render`.

## Validación

Baseline antes de producción: **13 pases existentes/7 fallos nuevos**; resultado **20/20**, siete nuevas. Se extendió el fixture existente para la transición fresca→retenida; los trece casos anteriores siguen pasando. Se comprueban guardian activo, bendición pendiente, presentación real de agricultura, orden/campos del DTO, mutación durante commit/admisión y tipos estrictos. Suplemento **9/9**: cuatro casos nuevos de dig/water/harvest/dust con `createNativeVfx` real, partículas/cuerpos activos, RNG/reloj conservados y rechazo de cambios, más cinco casos anteriores. El suplemento es ejecución JS de efectos, no prueba GPU de trabajo activo.

Pasan **344 dirigidas/23 archivos**. La regresión seleccionada obtiene **3954 de 3955/311 archivos**, una omisión opcional del comparador de dos WASM candidatos, cero fallos/cancelaciones; build Vite **48.72s**. Después solo cambiaron los dos archivos de QA para verificar píxeles/hash del PNG: cinco sintaxis, 344 dirigidas y 9 del suplemento repetidas, seguidas de cuatro casos GPU secuenciales. Producción, pruebas CPU y los inputs restantes son exactamente los del build/regresión. Se congelan **526 inputs + 4 suplementarios, 64 nativos intactos y 16 ajenos exactos**. No hay compilación nativa nueva.

Los dos fallos separados documentados en `8bbf5daa7` siguen fuera de esta selección: negociación timeline 19/20 con timeout y host timeline que no termina en 25 segundos, reproducidos con código anterior y actual en aquella entrega. Sus recibos y selección se conservan; no se proclama suite universal.

### GPU NVIDIA: checkpoint completo y replay reales

La autoridad C++ añade `(4,4)` en mundo1/checkpoint1 y lo retira en mundo2/replay2. Puertos, cohort/control, draw Worker, Surface, preparación y admisión son reales. Tiempo10 y un trabajador quieto en desierto. No se alteran métodos de producción para conceder permisos. La única instrumentación del Host enumera identidades nativas sin crear recursos GPU.

| Caso | Resultado |
|---|---|
| Recuperación retenida | 9 chunks originales, 175 nodos y 180 generaciones inmutables vivas conservadas. 80 objetos lógicos/protocolo nuevos por el chunk transitorio, frente a 1.893 del control fresco. 59 COW uniformes/65 bindings; 0 forks de vértices/índices/texturas. Frontera intermedia sin imagen nueva; replay final mundo2/seq2 y dibujos nativos admitidos. |
| Checkpoint idéntico | 0 fábricas/objetos lógicos y 0 COW uniformes/bindings/buffers/texturas. Misma prueba real de escena, con validación viva; conserva recursos e imagen. |
| Material cambiado | Versión0→1 invalida la prueba; compiles54→56. Nueva admisión antes de dibujar, 0 fábricas lógicas nuevas y 0 dentro del dibujo. COW nativos se informan aparte. |
| Efectos incompatibles | Bendición pendiente distinta: rechazo semántico antes de fábricas, un error esperado, imagen anterior conservada y dibujo bloqueado. No se acepta como recuperación saludable. |
| Reemplazo fresco | 1.893 recursos recreados, seis frames nativos/tres paquetes, 0 errores GPU y retirada/drain real. Es control de reemplazo, no incremental. |

Los cuatro casos verifican disposición y finalización GPU reales, sin errores inesperados de consola, HTTP o red. Las capturas retenidas tienen SHA-256 `2b37183648a9a4560cb6c8c78aa32b28dc368ce7f1578ab3683a85fcf1a46682`: 58.104 píxeles diferentes del fondo y 2.316 de contraste alto dentro de la caja proyectada del trabajador; el control PNG uniforme se rechaza. Una sonda separada capturó antes/después del replay/después del noop: **archivos idénticos byte a byte**.

Se registran los dos atributos CPU vacíos/ocultos de bendiciones, sin buffer GPU, y los targets de sombra ya destruidos antes de medir: no se presentan como generaciones vivas conservadas. Los readbacks GPU adicionales son solo diagnósticos y sus asignaciones no participan en las cifras de aceptación.

## Intentos y corrección del diagnóstico

La primera sonda mostró cero objetos lógicos para el noop pero aún repetía COW de uniformes/bindings. Reutilizar la prueba real válida elimina esas copias; el cambio deliberado de material demuestra que no se acepta una prueba obsoleta. Se conservan todos los raws y el fallo inicial de anchor antes de escribir la implementación.

Una interpretación errónea de la vista previa llevó a diagnosticar desaparición del personaje. **Los PNG originales ya eran idénticos al correcto**; no hubo un fallo visual reproducido ni se modificó producción para ocultarlo. Se corrigió el diagnóstico con SHA-256, lectura de píxeles y capturas por etapa, y se incorporaron esos controles al auditor. Las sondas de matrices/visibilidad, bindings nativos, uniformes por pase, hashes de geometría/texturas y sus scripts se conservan como diagnósticos. Una lectura de texturas falló por offset de readback sin alinear; la siguiente respeta 256 bytes y pasa. Ese error pertenece exclusivamente a la sonda, no a producción.

Logs completos, listas exactas, snapshots, PNG y raws sin pérdida: [recibo de validación](performance/native-retained-surface-recovery-validation-20261119.json).

## Siguiente punto

Conectar el handoff existente de WorldWorker/cliente/UI/productor con este modo retenido, manteniendo checkpoint completo, efecto/estado coherentes y control nativo directo. Después productor/cohort/paradas/relevos ordinarios y validación de cadencia/plataforma. Estos números prueban reutilización y admisión de componente; **no demuestran ausencia de tirones**. A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos; f-R3 seguridad conserva su cierre y D no iniciado.
