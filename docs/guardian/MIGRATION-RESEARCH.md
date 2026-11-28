# Consulta técnica antes del siguiente mecanismo

Procedimiento ligero exigido por el [objetivo](MIGRATION-OBJECTIVE.md). Primero
buscar en los incrementos existentes: ya contienen decisiones contrastadas con
fuentes. No volver a investigar sombras, fases o transacciones que ya se resolvieron.

```powershell
rg -n 'Código fuente|Godot|Detour|Babylon|Three|Jolt' docs/guardian -g '*.md'
rg -n 'startNativeTaskAction|completeTask|nativeTaskAction' src/world src/simulation
node tools/guardian/migration-support/cli.mjs research --topic 'Consecuencia Harvest tras acción ejecutada'
```

El último comando genera una [plantilla](MIGRATION-RESEARCH-TEMPLATE.md) en `.cache`,
con HEAD. En 10–15 minutos: delimitar una frontera, leer el código local y uno o
dos símbolos externos, registrar revisión exacta, proponer el patrón y sus
límites, y elegir pruebas reutilizables. Si falta evidencia, dejarlo explícito;
no prolongar una búsqueda abierta ni instalar el motor consultado.

Catálogo inicial de fuentes primarias verificadas el 15-11-2026 (tags fijados):

| Motor / fuente | Símbolo y uso de la consulta |
|---|---|
| [Three r180, RenderObject.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/RenderObject.js) | `getCacheKey`, `getDynamicCacheKey`: entender qué estructura determina reutilización; contrastar con el parche local de Three y material fuente ya documentado. |
| [Babylon 8.0.0, webgpuCacheRenderPipeline.ts](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/Engines/WebGPU/webgpuCacheRenderPipeline.ts) | `getRenderPipeline`: estado de vértices/texturas y caché de pipelines; distinguir un cambio estructural de datos/instancias. |
| [Godot 4.4, animation_player.cpp](https://github.com/godotengine/godot/blob/4.4-stable/scene/animation/animation_player.cpp) | `_blend_post_process`: comprueba identidad antes de terminar/encadenar una animación. La señal visual no se convierte en autoridad de gameplay. |
| [Recast/Detour 1.6.0, DetourPathCorridor.cpp](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourPathCorridor.cpp) | `trimInvalidPath`, `isValid`: conservar parte válida de corredor y reconocer invalidación. Consultar para reparación por evento, sin copiar sondeos de ruta por tick ni introducir otro planner. |
| [Jolt 5.3.0, BodyID.h](https://github.com/jrouwe/JoltPhysics/blob/v5.3.0/Jolt/Physics/Body/BodyID.h) | `GetSequenceNumber`, `GetIndexAndSequenceNumber`: identidad con secuencia frente a reuso de slots. Wild Engine además necesita `authorityEpoch` entre instancias. |

No son dependencias propuestas. Las conclusiones siguientes son adaptaciones
razonadas al contrato local, no garantías aportadas por esos motores.

## Primera ficha: fin de Harvest y consecuencia preparada

Problema: `Game.tick` proyecta una acción realmente ejecutada, pero finalizar su
edad no admite los recursos ni efectos de la cosecha. Hay que preservar la tarea,
cuerpo y reserva hasta una consecuencia válida, y luego permitir la siguiente
tarea. Referencia local: [proyección de acción](e-r3-native-action-game-projection-20261115.md)
y [admisión común](native-admission-vertical-20261115.md).

Fuentes leídas: Godot `_blend_post_process` (líneas 331 y siguientes) comprueba
que el objeto de animación sigue siendo el que terminó antes de avanzar cola o
emitir señal; Jolt `BodyID.h` (líneas 50–65) conserva índice y secuencia ante
reutilización. Three `getCacheKey` y Babylon `getRenderPipeline` separan las
claves de programa y estados estructurales del objeto que pide reutilización.

Patrón aprovechable: comprobar de nuevo identidad de tarea/objetivo/acción y
frontera ejecutada antes del efecto; reutilizar el coordinador de admisión y los
propietarios de recursos ya existentes. Un progreso completo es condición
necesaria, no permiso de efecto. La época de autoridad y el ticket de un uso
siguen siendo exigencias propias de Wild Engine. No usar callbacks de animación
como fuente de caja, economía o daño.

Condiciones: Sol aporta propuesta/commit nativos de la consecuencia y sus recursos
tipados; el perfil compartido no los inventa. La mutación visible usa la misma
identidad del commit. Un cambio compatible conserva dispositivo, geometrías y
materiales admitidos; la caché externa no demuestra por sí sola preparación GPU.

Límites y pruebas: objetivo desaparecido mientras prepara; cancelación tras
acción completa; recibo duplicado/antiguo; nueva época con slot repetido; fallo
antes y después del commit; caja aún no preparada; otra tarea que sigue moviéndose;
restaurar justo antes/después del efecto. Reutilizar `native-admission-vertical`,
`native-task-action-game-execution` y el escenario `harvest`, y añadir la aserción
del efecto y siguiente tarea al mismo harness cuando existan. La [matriz](MIGRATION-VERTICALS.md)
define la evidencia conjunta que falta. Esta ficha no implementa la consecuencia.

## Delegación opcional, de una sola consulta

Si el entorno permite un subagente, entregar la ficha así: «Investiga únicamente
<frontera> en HEAD <hash>. Lee <propietarios locales> y <fuentes fijadas>. Devuelve
problema, símbolo/revisión consultados, patrón, condiciones, límites y pruebas
en máximo 400 palabras. No edites producción, no compiles, no instales dependencias
ni abras un agente persistente». El implementador decide cuándo utilizarlo;
esta misión no crea agentes adicionales ni toca su trabajo activo.
