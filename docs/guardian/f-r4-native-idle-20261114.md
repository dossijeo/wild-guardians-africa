# f-R4 parcial: Idle en esperas nativas sobre la misma malla

14 de noviembre de 2026. Base `ca35cde8d`, rama `codex/guardian-3d-animation`.
Continúa [Carry y selección de materiales](f-r4-native-selected-materials-20261114.md)
y la [reutilización de sombras](f-r4-native-shadow-source-20261114.md), dentro del
[plan integrado](integrated-gpu-migration-plan-20261104.md) y su corrección de A6.
Los once padres de A6 y e-R3/e-R4/f-R4 permanecen abiertos.

## Problema y referencias consultadas

El C++ existente ya publica los nudos de espera, posición fija, velocidad cero y
fases de locomoción detenidas. El roster gráfico rechazaba toda esa asignación.
Faltaba representar Idle durante el hold y retomar Run/Walk sin publicar un cambio
de clip desde JS. Carry debe seguir en su propia pose durante la espera, como
establece `workerPose`, conservando su fase y las nueve piezas de la caja.

Antes de extender el mecanismo se consultó código real:

- [Godot 4.5.1, AnimationNodeAnimation::process/_process](https://github.com/godotengine/godot/blob/4.5.1-stable/scene/animation/animation_blend_tree.cpp#L95)
  separa posición de reproducción, delta y política de bucle; calcula el tiempo
  de cada clip con su propia duración y `fposmod`. Se conserva la distinción entre
  fase de locomoción detenida y tiempo Idle, en lugar de crear un reloj por clip.
- [Babylon.js 8.0.0, bakedVertexAnimation.fx](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/Shaders/ShadersInclude/bakedVertexAnimation.fx)
  expresa rango, offset y velocidad como parámetros del shader y selecciona las
  matrices de la biblioteca baked. Se adapta el offset de periodo al tiempo
  relativo nativo; se reutilizan las texturas de Walk, Run e Idle existentes.
- [Three r180, ConditionalNode](https://github.com/mrdoob/three.js/blob/r180/src/nodes/math/ConditionalNode.js)
  mantiene las ramas del grafo; se amplía el mismo selector Run/Walk con la rama
  Idle. Posición y normal siguen la misma selección y la admisión existente.

No se incorpora un motor, dependencia, atlas nuevo, rig o state machine separado.
No se modifica C++ ni se reconstruye WASM: se consumen sus intervalos existentes.

## Implementación y propiedad

La velocidad categórica de la tabla nativa selecciona Idle cuando es cero.
El selector usa los bakes compatibles del mismo perfil/fuente, canales e inversas;
no interpreta los frames Idle con la duración de Walk. Si ya hay una presentación
Idle admitida, ésta sirve de base estática para el grafo Walk/Idle. Un actor que
ya espera solo entra por esta vía con una asignación nativa de cruce admitida;
recuperación, incapacidad y otras poses protegidas siguen rechazadas.

La política Idle de puerta ya existente usa tiempo lógico global. El shader
representa ese tiempo como `epoch % duración + tiempo relativo nativo`, con el
mismo clamp/margen finito que la posición. El offset se prepara como dato uniforme
por duración: no convierte todo el tiempo absoluto a float32 ni inventa horizonte
futuro. La fuente de tiempo sigue siendo el único clock marcado con su asignación
nativa. El sampler usado para una entrada replica esos datos y calcula el mismo
clip/fase; no se invoca por frame ni modifica la autoridad.

El roster espera también la admisión Idle que pudiera estar pendiente al iniciar
la ruta. Cargar ese bake puede desbloquear la instalación Walk; se espera ese
trabajo antes de capturar la variante. Una ruta con futuras esperas pide la
textura Idle directamente al banco existente, sin instalar otra malla de Idle.
La variante conserva visibilidad, rig y materiales anteriores hasta su admisión.

Los conjuntos de clips ya admitidos se conservan en los siguientes relevos de
locomoción del mismo actor. Que la nueva ruta no necesite Run/Idle no obliga a
eliminar sus ramas y recompilar el programa. Se mantienen las bibliotecas que ya
posee el banco, sin precargar variantes que nunca se han requerido. Carry usa su
grafo con attachments: durante el hold consume su fase C++ congelada y no pide
Idle ni sustituye la caja por otra presentación.

## Evidencia

[Recibo WebGPU](performance/native-worker-world-owner-gate-idle-20261114.json),
[Idle inicial](performance/native-worker-world-owner-gate-idle-20261114-start.png)
y [Walk posterior](performance/native-worker-world-owner-gate-idle-20261114-moved.png).
Se usan WorldClient/WorldWorker/WorldSurface/roster y draw Worker normales, autoridad
C++/WASM real del harness, GLB/texturas/bakes originales olderFemale y NVIDIA Turing.
La asignación explícita del harness no es todavía el productor ordinario del juego.

La admisión nativa de una puerta zarzas certifica una espera entre 10 y 10,6 s.
En ese intervalo las muestras C++ conservan posición, fases y presupuesto de
carrera. El presupuesto de 1 m se agota después, en 11,016666… s. Durante el bloqueo
real de preparación de 500 ms se registran cuatro dibujos en espera y once después;
la misma reproducción cubre Idle, Run y Walk sin cambios del rig CPU ni de clip
publicados desde el preparador. El shader real contiene las tres texturas.

El relevo de vuelta se admite otra vez con la API de cruce de C++; no se convierte
una ruta que atraviesa la puerta en una ruta estática. Conserva el conjunto de
tres clips y la malla/geometría existente. Cero shaders, pipelines y pipeline layouts
nuevos en la preparación del relevo. Su delta es 27 buffers, 12 pares de bind
groups/layouts y una textura/sampler de ruta; no se afirma reutilización completa.
El primer render inicial y del relevo mantienen cero fábricas GPU instrumentadas.
La misma asignación conserva el total de recursos, no cambia el dispositivo y
hay cero errores GPU/JS/consola/HTTP, con drenaje antes de liberar WASM.

Las pruebas usan rutas C++ con esperas iniciales y múltiples, un actor ya en Idle,
los cuatro perfiles originales, picking en ambos lados de los límites, rig y
geometrías conservados, y Carry con fase/caja congeladas. La falta de un bake
necesario sigue rechazando la asignación completa. Los resultados de regresión,
comparación con base y build se registran en
[validación](performance/native-idle-validation-20261114.json).
65 pruebas dirigidas aprobadas, sin omisiones. El oráculo de fase contrasta
`workerPose` y el final finito de la ruta: 11 pruebas aprobadas. Regresión de
130 archivos, concurrencia 2: 1.456 casos, 1.454 aprobados y los mismos dos
fallos heredados Carry/Harvest, sin omisiones. Build aprobado en 42,88 s y
sintaxis de scripts de navegador aprobada. Se mantienen los registros anteriores
de reproducción de base, sin modificar fixtures para ocultar esos fallos.

También pasan las regresiones GPU de [Run/Walk con su biblioteca conservada](performance/native-worker-world-owner-run-walk-retained-clips-20261114.json)
y [Carry](performance/native-worker-world-owner-carry-idle-20261114.json), con
cero shaders/pipelines nuevos en sus relevos y drenaje antes de cerrar WASM.

## Siguiente pendiente y límites

La puerta de esta comprobación pertenece a la autoridad nativa del harness: no se
incluye su hoja como malla animada en el mundo gráfico. Las capturas acreditan el
trabajador, no equivalencia física/gráfica de la puerta ni aceptación e-R4. Debe
conectarse la transformación de sus hojas al mismo estado nativo y comprobar su
admisión/invalidación sobre el propietario de muros existente.

Después continúan fases persistentes entre intenciones/guardados, acciones y sus
consecuencias, productor/ejecutor ordinarios, todas las intenciones, mutaciones con
personajes/efectos y aceptación A–F/B/C. No se retiran los movers JS protegidos ni
se declara autonomía de producto o ausencia completa de tirones por este ensayo.
