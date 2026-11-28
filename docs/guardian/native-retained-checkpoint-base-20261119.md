# Base completa de recursos sobre los propietarios retenidos — 2026-11-19

Continúa `28b430c5a`, A4/e-R3/f-R4 y la recuperación incremental pendiente. El preparador existente de checkpoints admite ahora **retención explícita**: compara el checkpoint completo con los propietarios de terreno y biome, conserva las revisiones idénticas y prepara únicamente cambios, incorporaciones y retiradas autoritativas. El modo predeterminado sigue exigiendo propietarios vacíos. **Esta entrega prepara recursos; todavía no conecta recuperación completa ni concede una frontera/reloj nativos a la Surface retenida.**

## Referencias de código y decisión

Se inspeccionó código real de [React v19.2.0, `ReactChildFiber.js`](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/ReactChildFiber.js): `mapRemainingChildren`, `updateFromMap`, `deleteChild` y `reconcileChildrenArray` conservan identidades por clave y eliminan únicamente las no reconciliadas. Se aplica esa separación por coordenadas dentro de nuestros propietarios existentes, contrastando además revisiones y contenido canónicos; no se introduce React ni otro reconciliador.

También se revisaron [Three r180, `Renderer.compileAsync`](https://github.com/mrdoob/three.js/blob/0af9729d0c143a86a1d725d6e2c3ad83301f3f34/src/renderers/common/Renderer.js) y [`Pipelines.getForRender`](https://github.com/mrdoob/three.js/blob/0af9729d0c143a86a1d725d6e2c3ad83301f3f34/src/renderers/common/Pipelines.js): compilación asíncrona con restauración de contexto y reutilización por claves de programa/pipeline. Se mantienen renderer, escena, cachés y coordinador actuales. Los snapshots upstream y los de Three instalado, que ya contiene parches del repositorio, están separados y fijados por hash en la evidencia.

## Comportamiento implementado

- `captureCheckpointState` pertenece a los propietarios existentes y captura todo su conjunto lógico, incluidos chunks fuera del frustum. Exige admisión real y retiene un conjunto de lectura de raíces, padres, transformaciones, materiales/versiones, geometrías, atributos/arrays/versiones e instancias. Cambios durante una espera invalidan la preparación.
- La coincidencia exige época y revisión, contenido de terreno/agua/máscaras y slots de biome realmente retenibles, con la supresión del estado confirmado. Un checkpoint idéntico no solicita tickets ni llama a las fábricas. Una revisión igual o anterior con datos distintos se rechaza.
- Cambios e incorporaciones usan la preparación y transacción atómica existentes. Una retirada exige el tombstone exacto del `terrainHandoff` de la fuente, con época, secuencia, revisión posterior y tiempo válidos. La ausencia de una clave no permite inventar una revisión de borrado.
- El llamador debe comprobar el estado semántico actual mediante `assertCurrent`. Se revalidan metadatos, conjunto retenido y contenido antes/después de las esperas y del commit. La frontera devuelta es una copia congelada, disponible solo tras commit; no es un permiso de render nativo.

No hay nuevo propietario, caché persistente, dependencia, renderer, autoridad ni cambios WASM. Los conjuntos de lectura y el mapa temporal existen durante la preparación del checkpoint, no por fotograma de locomoción.

## Validaciones

El baseline significativo anterior a producción conserva **8 fallos nuevos y 1 pase heredado**. El primer fixture tenía un error de sintaxis y no se cuenta como baseline funcional. Después se añadieron dos negativos para atributos versionados y metadatos/frontera: pasan las **11 pruebas del archivo, 10 nuevas**. Cubren identidad/tickets cero, mezcla atómica de conservar/cambiar/añadir/retirar, handoffs inválidos/ausentes, revisiones en conflicto, estado o propietario obsoletos, rollback de finalize y certificado inmutable. Three/propietarios/coordinador reales; admisión/IO simulados en Node.

Pasan **219 dirigidas/10 archivos**, **3.673 de 3.674 seleccionadas/295 archivos**, cero fallos/cancelaciones y una omisión opcional del comparador de dos WASM candidatos. La selección amplía la anterior de 288 archivos con los casos de checkpoint y fronteras; no se presenta como suite universal ni elimina las exclusiones históricas de aquella selección. Build Vite **48,99s**. Se fijan **503 inputs**, **64 archivos nativos intactos y 16 ajenos exactos** durante tests/build y después de GPU. Cuatro módulos propios y cuatro fuentes del auditor servido se parsean sobre sus bytes finales. Ningún cambio de producción posterior a las validaciones.

## Comprobación NVIDIA sobre la Surface real

Una ruta de auditoría en caché reutiliza el Worker y fixture existentes, con WASM, autoridad, puertos, Host y Surface reales, un dispositivo y un actor estacionario a tiempo 10. Antes de ejecutar GPU terminaron todos los tests/build; no hay profiler concurrente. El checkpoint autoritativo incorpora el chunk `(4,4)` a los nueve residentes. La auditoría invoca el preparador de recursos mediante un método inyectado, sin cambiar la API de producción ni marcar la Surface con la frontera nueva.

La ejecución final conserva **175 nodos, los nueve chunks originales, renderer/dispositivo/escena/raíz del actor y 180 generaciones nativas vivas de vértices/índices/texturas**. Añadir el chunk prepara **79 objetos de protocolo**: 33 buffers, 14 bind groups, 12 bind group layouts, seis pipeline layouts, seis shaders, seis pipelines asíncronos, un sampler y una textura. No hay pipeline síncrono. Además se contabilizan **1 fork de uniforme y 1 de binding**, **0 forks de buffers no uniformes/texturas**. Conservar IDs no se presenta como cero asignaciones físicas. El segundo checkpoint idéntico crea **0 objetos**, conserva todas las generaciones nativas y no cambia las raíces. Cero errores GPU/consola/red y retirada con drain real, sin fences pendientes.

Se registran dos excepciones de observación: el callback existente `blessingVfx.terrainChanged()` reemplaza `aBase/aSource` CPU vacíos, invisibles y nunca subidos, sin fuentes/partículas; dos targets temporales de sombra ya estaban destruidos antes de la captura y no se cuentan como generaciones vivas retenidas. Ninguna excepción permite reemplazar geometrías/buffers de terreno, biome o actor ni generaciones GPU vivas. Las identidades y ambos inventarios completos quedan en el raw.

Se conservan las ocho tentativas: comparador inicial `null/undefined`, un error de sintaxis del diagnóstico, diagnóstico detallado del mismo comparador, dos controles que localizaron los atributos vacíos de bendiciones, inventario que incluía sombras ya destruidas, pase funcional con error de doble `dispose` en el cleanup y ejecución final limpia. No se usan los fallos como aceptación. Un assert de caché de la corrección de cleanup también detectó dos anchors en el Worker completo; el fragmento ya estaba corregido y las cuatro fuentes finales servidas se parsearon después. Ninguno de esos ajustes cambia producción o debilita la comprobación de generaciones vivas.

Los frames nativos no avanzan durante la preparación: la Surface conserva su marcador anterior `null`, aunque la autoridad exige la frontera 1. **No se acepta una imagen nueva, replay, recuperación saludable ni cadencia.** Los 79 objetos corresponden a una incorporación concreta, no a una medición nueva de la recuperación integral. El último rebuild de 1.893 y el histórico de 3.123 siguen siendo evidencia heredada de la ruta de reemplazo.

Resultados originales sin pérdida, fuentes consultadas, auditor reproducible, hashes y listas exactas: [recibo de validación](performance/native-retained-checkpoint-base-validation-20261119.json).

## Siguiente punto

Integrar esta base completa en el controlador de recuperación y la Surface existentes, verificando estado/presentación/efectos, reproducción ordenada y admisión de la frontera nativa final. Una delta viva parcial no demuestra que se hayan aplicado los cambios anteriores y no sustituye ese contrato. Después siguen productor/cohort/paradas/relevos ordinarios y cadencia/plataforma. A6/e-R3/e-R4/f-R4/A/B/C continúan abiertos; f-R3 seguridad conserva su cierre; D no iniciado.
