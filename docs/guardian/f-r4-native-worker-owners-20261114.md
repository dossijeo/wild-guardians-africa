# f-R4 parcial: rutas nativas en los propietarios normales del trabajador

14 de noviembre de 2026. Base: `fdf4be049`, rama `codex/guardian-3d-animation`.
Referencia: [plan integrado](integrated-gpu-migration-plan-20261104.md),
[corrección de A6](intent-route-architecture-correction-20261108.md) y
[checklist](A6-CHECKLIST.md). No se cierra e-R3/e-R4/f-R4 ni A/B/C.

## Problema e investigación aplicada

El componente anterior probaba el shader del personaje original, pero su montaje
lo conectaba desde QA. Faltaba preparar y sustituir rutas usando el roster,
superficie, Worker y cliente existentes. Reemplazar el rig o reconstruir el
mundo habría repetido el problema de los 3123 recursos.

Se consultó código fuente real antes de diseñar el reemplazo:

- [Three r180, RenderObjects.get](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/RenderObjects.js#L85): la caché distingue objeto,
  material, contexto y luces; una variante de material permite conservar la
  geometría y preparar su programa antes de cambiar la referencia visible.
- [Godot 4.5.1, ShaderMaterial.set_shader](https://github.com/godotengine/godot/blob/4.5.1-stable/scene/resources/material.cpp): separa el recurso material de
  su shader y de los parámetros cacheados. Se adapta la sustitución de la
  referencia preparada, sin importar el motor ni añadir dependencias.
- [Three r180, AnimationMixer](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationMixer.js#L117): activación/restauración del estado
  original con propietarios y referencias. El binding conserva la restauración
  original incluso tras varios relevos; la retirada del anterior no deshace el
  nuevo. [SkinnedMesh.applyBoneTransform](https://github.com/mrdoob/three.js/blob/r180/src/objects/SkinnedMesh.js) separa la base del root de la pose:
  el origen de la ruta nueva no puede sustituir la base del rig retenido.

Se reutilizan la admisión asíncrona, variantes de material, registro de recursos,
réplicas de texturas y fences del producto. La retención de uploads ante una
revocación reutiliza el rechazo ya aplicado al cambio de mundo; no se crea otro
planificador, renderer, reloj ni registro de permisos.

## Implementación conectada

`WorldClient.prepareNativeRoute` solicita recursos por el Worker normal;
`WorldSurface` certifica la ruta completa contra el terreno residente y llama al
roster normal. El roster reutiliza su banco, actor y bake. Prepara alternativas
de fase/posición/normal sobre las mismas mallas y geometrías. Comprueba vigencia,
soporte, propiedad y matriz del root antes de activar todas las referencias.

La referencia de restauración y el raycast proceden del propietario original,
no del wrapper anterior. Los proxies CPU de picking no entran en el nuevo grafo
GPU. El picking toma una muestra del último frame del consumidor únicamente al
recibir entrada; no alimenta posiciones ni tiempo de dibujo periódicamente.

La raíz CPU queda inmóvil mientras la GPU consume la ruta; una publicación
confirmada puede actualizar la entidad sin escribir ese root. Al retirar la
asignación exacta se aplica una vez el endpoint confirmado. Recursos retirados
se liberan por el fence existente. Una retirada antigua no desmonta el relevo.

Una asignación idéntica reutiliza sus recursos y rechaza datos distintos bajo la
misma identidad. La preparación cancelada mantiene el actor anterior. Este
incremento admite sólo intervalos Walk ya soportados; rechaza Run/Carry/esperas
sin su variante preparada, en lugar de presentarlos como caminar.

La petición termina después del recibo de `endFrame` del consumidor, no al
terminar la compilación. Sólo se resuelven las peticiones incluidas antes de
registrar ese frame: un ACK de un dibujo anterior no acredita el reemplazo.
La descripción pausada de cobertura gráfica no concede tiempo; el canal directo
C++ sigue fijando el tiempo causal y la revocación. Para varias rutas, el inicio
mínimo admisible del paquete cubre el mayor inicio entre sus bindings.

Si una revocación adelanta a un paquete por el otro canal, se rechazan sus
comandos y se retienen sus uploads válidos en el mismo dispositivo. La revisión
local de recursos impide que un rechazo tardío de un frame anterior bloquee un
reemplazo que ya está preparado; no modifica identidad física ni permisos.

## Validación

[Recibo de hardware](performance/native-worker-world-owner-20261114.json) y
[captura del mundo](performance/native-worker-world-owner-20261114.png).
El ensayo usa WorldClient, WorldWorker, WorldSurface, roster y draw Worker de
producción; únicamente la autoridad de prueba y la inyección del bloqueo son QA.
WASM real, Edge sin interfaz y adaptador NVIDIA Turing, perfil `olderFemale`
texturizado, nueve chunks residentes:

- Misma generación de superficie antes, durante y después del relevo/retirada.
- Asignación idéntica: 1939 recursos creados antes y 1939 después; cero creación
  adicional. Es el total de arranque de este mundo, no una reconstrucción.
- Primer render de ruta inicial y reemplazo: cero llamadas a las once fábricas
  instrumentadas de buffers, texturas, samplers, bindings, shaders y pipelines.
- Bloqueo síncrono real de 500 ms en el preparador: 15 dibujos independientes y
  avance visual limitado por el reloj nativo confirmado.
- Relevo por otra identidad nativa, retirada antigua ignorada y retirada exacta
  después de publicar el endpoint confirmado: correctos; cero errores GPU/HTTP/JS.

Las pruebas unitarias usan WASM, GLB y bake originales: identidad del rig y
geometría retenida, materiales antiguos visibles durante preparación, cancelación,
matriz modificada antes de publicar, retirada con fence, datos inmutables,
rechazo de clips incompletos y WGSL real con sólo el reloj del relevo. La prueba
remota fuerza un paquete revocado tardío y verifica la retención de uploads,
continuación con otro frame y ausencia de reinicio del dispositivo.

Los comandos y resultados de regresión/build se registran en
[validación del incremento](performance/native-worker-owner-validation-20261114.json).
209 pruebas dirigidas aprobadas. Regresión: 88 archivos, 928 casos, 871
aprobados, siete fallos y 50 omisiones. Los mismos siete fallos se reprodujeron
con las fuentes de `fdf4be049` mediante un loader de Node en sus URLs originales,
sin sustituir archivos del checkout: 92 casos, 66 aprobados, siete fallos y 19
omisiones. Son el mock de ABI nativa, cuatro fixtures de incursión con plan
incoherente al guardar y las expectativas históricas de carry/harvest ya
registradas. No se modificaron para volver verde la suite. Build aprobado en
45,69 s, con el aviso habitual de tamaño de chunks de Vite.

No es una campaña de rendimiento ni aceptación de fluidez de una partida.

## Pendiente inmediato

La API de recursos ya es de producto y usa sus propietarios; su productor aún
es explícito en el ensayo. Falta transportar automáticamente las asignaciones
completas desde la autoridad ordinaria, incluyendo su preparación y revocación,
sin duplicar movilidad JS. Falta conectar las transiciones Run/Walk/Carry/espera/
acción a esta misma ruta, el animal AttackCrops y la misma mutación de terreno/
props con personajes en movimiento y efectos activos. Continúan pendientes
tráfico móvil, puertas, recuperación/guardado/device loss y aceptación A–F/B/C.
El montaje nuevo no equivale a activar locomoción nativa ordinaria en todas las
intenciones; se conserva el ejecutor protegido hasta cerrar esos criterios.
