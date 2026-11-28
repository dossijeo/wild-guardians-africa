# f-R4: ruta nativa completa en GPU sobre el trabajador original

14 de noviembre de 2026. Continúa el [recurso nativo y apoyo 3D](f-r4-native-route-support-20261114.md).
**f-R4 y e-R3/e-R4 permanecen abiertos, al igual que los once padres de A6.**
La prueba de componente ya utiliza el rig, materiales, texturas y bake originales,
el control causal nativo y el Worker de dibujo de producción. Falta llevar la
alimentación de asignaciones a los propietarios ordinarios de la partida y cerrar
sus transiciones, invalidación y recuperación. No se activa autonomía ordinaria.

## Fuentes consultadas y adaptación

- [Godot 4.5.1, Curve::get_index](https://github.com/godotengine/godot/blob/4.5.1-stable/scene/resources/curve.cpp): búsqueda binaria en los nudos ordenados. Se adapta a upper-bound para respetar los estados categóricos del intervalo derecho que ya define C++; no se recorre toda la polilínea por vértice.
- [Three r180, StructNode](https://github.com/mrdoob/three.js/blob/r180/src/nodes/core/StructNode.js) y [TextureNode/textureLoad](https://github.com/mrdoob/three.js/blob/r180/src/nodes/accessors/TextureNode.js): una consulta TSL devuelve posición/yaw, fases y modo; lectura de texels sin filtrado. Se usan estas primitivas existentes, sin otra biblioteca ni renderer.
- [Three r180, WebGPUAttributeUtils::createAttribute](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/utils/WebGPUAttributeUtils.js): el backend promueve índices Uint16 a Uint32. El apoyo se certifica después de admitir el terreno y completar esa normalización. Se conservan las comprobaciones estrictas de identidad/versiones; no se admite un certificado obsoleto.
- Se reutilizan los propietarios existentes `webgpu-actor-motion-binding`, `webgpu-baked-walk`, la admisión, el banco original del trabajador, `NativeRouteControl` y el canal directo. El transform y la exclusión de materiales del movimiento histórico pasan a un helper compartido. La regresión WebGPU compara también normales y sombras contra su referencia anterior.

## Implementación

`prepareNativeRouteGpuTable` empaqueta el recurso completo de C++ y los cortes de
apoyo en cinco texels RGBA por nudo: X/Y/Z, yaw, distancia, fases, cursores,
llegada, presupuestos y modo. La textura distribuye hasta 16.385 filas lógicas
en columnas de 256 registros, sin suponer una textura de esa altura ni recortar
la ruta a 64/256 intervalos. Cada preparación falla completa si supera límites,
si el apoyo ha cambiado, si falta el tramo final o si colapsan nudos en float32.

`createNativeGpuMotion` usa un uniform relativo etiquetado con la asignación
inmutable: actor nativo, secuencia y handle de época/sesión/slot/generación. El
mismo parser del bridge comprueba que el ID gráfico corresponda a ese actor.
El preparador conserva ese uniform en cero; `NativeRouteControl` del dibujante
aplica el tiempo ejecutado, pausas y revocaciones directamente al buffer físico.
No se añade un temporizador ni se envían posiciones periódicas desde JS.

La búsqueda binaria usa índices enteros y como máximo quince iteraciones. Los
nudos se redondean conservadoramente y el tiempo se acota al intervalo del
recurso; el permiso finito sigue perteneciendo al control nativo. El recurso no
se retaggea para otro handle. Su textura tiene lease en el registro existente;
la retirada del actor debe seguir usando los fences del propietario de admisión.
El muestreo CPU sólo sirve a picking/diagnóstico sobre los mismos datos empaquetados.

El material conserva el transform previo y las normales; se restaura al retirarlo.
La exclusión compartida impide que un replay histórico y una ruta nativa posean
el mismo material. Los materiales de otros actores conservan su propietario.
`webgpu-baked-walk` comunica el clip a su fuente de fase: Walk_Skip, Run y
Carry_Crate pueden leer sus fases nativas distintas. Esto no implementa aún el
cambio automático entre clips ni autoriza las otras acciones. La prueba utiliza
Walk_Skip, con el offset de pie original de 0,025 m.

## Evidencia con hardware y alcance

[Recibo corto](performance/native-gpu-character-20261114.json) y
[recibo largo](performance/native-gpu-character-long-20261114.json), NVIDIA Turing,
Edge headless, WASM y los módulos originales. Terreno nativo residente, perfil
`olderFemale` completamente texturizado y 29 nodos de rig CPU comprobados.
La prueba usa un bootstrap de mundo con su target de profundidad antes de
admitir el personaje, como la presentación existente. Conserva el espacio de
color lineal de WorldSurface; no se atribuye al shader nuevo el pase de salida
que Three crea si se usan opciones distintas en una prueba mínima.

| Comprobación | Evidencia |
| --- | --- |
| Recurso completo | Ruta corta: 26 nudos/2.080 bytes. Ruta de 130 puntos: 2.971 nudos/245.760 bytes, 256 columnas. |
| Consulta lejana | El reloj causal se lleva a un tiempo ya ejecutado por C++, más allá del cursor 106. Los píxeles siguen la posición proyectada de C++ después de cruzar varias filas físicas de la textura. |
| Preparación bloqueada | Dos escenarios con bloqueo síncrono real de 500 ms. En cada uno el dibujante presenta 15 frames, sin otro paquete de escena; el rig y el uniform CPU permanecen inmóviles. No son cifras de rendimiento del juego completo. |
| Frontera temporal | Cada frame del bloqueo se contrasta con el watermark nativo que ya existía al dibujarlo; no supera committedThrough. |
| Incorporación preparada | Cero llamadas a las fábricas GPU instrumentadas durante la primera presentación del personaje, después de la admisión. No hay reconstrucción del mundo en el bloqueo. |
| Revocación/retirada | Recibo GPU de cancelación antes de terminar otro bloqueo de 500 ms; retirada con recibo de drenaje ligado a esa conexión. |
| Comprobación visual | PNG de inicio, tiempo lejano y avance; actor visible con posición de pie proyectada desde C++. El filtro diagnóstico descarta cuatro píxeles del borde del compositor y exige una región de personaje acotada. No prueba igualdad de cada píxel/pose con todo el gameplay. |
| Regresión compartida | [Normales y sombras](performance/native-gpu-shared-material-regression-20261114.json): cero píxeles distintos respecto a la referencia; 361 píxeles de sombra visibles. |

Comandos reproducibles con el Vite de la rama en `QA_BASE_URL` (por defecto 5181):

```powershell
$env:PLAYWRIGHT_MODULE = 'C:/Users/Gabriel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:QA_LONG_ROUTE = 'false'
.cache/tooling/node20.exe tools/guardian/audit_native_gpu_character.mjs
$env:QA_LONG_ROUTE = 'true'
.cache/tooling/node20.exe tools/guardian/audit_native_gpu_character.mjs
.cache/tooling/node20.exe tools/guardian/audit_native_gpu_shared_motion.mjs
```

Las regresiones y el build se registran en el
[recibo de validación](performance/native-gpu-motion-validation-20261114.json).
Build WebGPU/remote aprobado en **44,89 s**, con los avisos habituales de imports
mixtos y chunks grandes.

Regresión dirigida: **60/60 aprobadas**, sin fallos/skips. La ampliación a 45
archivos conserva 348 aprobadas, tres fallos y 23 omisiones por selección opcional
de WASM. Los tres fallos se reprodujeron con los archivos de producción de esta
refactorización en `750d4c98f`: el mock de puerta no implementa el layout nativo
actual, una admisión tardía de caja espera 1 y obtiene 0, y la preparación de
harvest espera true y obtiene false. Comparación de base: 52 aprobadas, tres
fallos y 19 omisiones en 74 casos.

Se seleccionó además el WASM real mediante `WILD_ENGINE_NATIVE_ROUTE_WASM` para
bridge/differential/index: 20 aprobadas, tres fallos y cero omisiones. Los tres
se reprodujeron también en la base: el mismo mock de ABI, una igualdad de
snapshot que no contempla `event.presentation.elapsed` y el contador de entidad
incoherente al serializar la prueba de eventos. No se alteran fixtures para
ocultarlos. Los seis fallos anteriores de la suite ampliada conservan su propio
diagnóstico. Estas cifras no son una declaración de suite global verde.

## Siguiente integración pendiente

Consumir las asignaciones completas en los rosters/WorldSurface ordinarios,
preparar y sustituir sus alternativas de material/animación de forma reversible,
y conectar su vigencia al cambio físico y a la recuperación. La prueba utiliza
esos componentes originales en un montaje de QA y no acredita su alimentación
ordinaria. El siguiente [incremento conecta los propietarios de producto](f-r4-native-worker-owners-20261114.md); su productor automático continúa pendiente.

También quedan cambios Run/Walk/Carry/espera/acción en una ruta completa,
animal AttackCrops, puertas y conflictos móviles con personajes, mutaciones con
efectos activos, guardado/device loss y todas las intenciones/entidades. Se
conserva el orden A → B → C → D y la aceptación A–F/B/C exigida por el plan.
