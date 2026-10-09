# POST-JAM — Protección de cámara en primeros planos

Petición del usuario del 6 de octubre de 2026. **Pendiente; no implementar si interfiere con las prioridades actuales.** Tarea independiente de [distancia de dibujado, impostores y horizonte](far-vegetation-impostor-system.md). No queda resuelta por cambiar LOD, reducir resolución, ocultar modelos o elevar una distancia mínima global.

## Problema y objetivo visual

La cámara libre puede acercarse demasiado a edificios y modelos grandes, incluso penetrar su geometría. Esto expone triángulos enormes, texturas ampliadas/lavadas y detalles para los que los assets no se diseñaron. Conservar la libertad de cámara dentro del rango en que Wild Guardians se ve bien: rotación360°, desplazamiento, zoom, inclinación y sobrevuelo de estructuras.

No exigir libertad para posiciones desde las que el asset deja de funcionar visualmente. Buscar experimentalmente el punto más cercano en que cada categoría/modelo conserva un acabado correcto.

## Diseño solicitado

1. **Soft camera collision.** Raycast/spherecast entre el objetivo y la posición deseada para evitar penetraciones. Corrección suave, sin saltos ni sensación de pared invisible. Mantener intención de cámara del jugador y distinguirla del desplazamiento correctivo; evitar oscilaciones acumuladas del damping.
2. **Camera Exclusion Volumes.** Edificios/estructuras grandes disponen de un volumen invisible ligeramente mayor que la geometría, con una distancia visual mínima segura. Desacelerar progresivamente movimiento/zoom al aproximarse. Volúmenes/configuración por categoría o modelo; dimensiones coherentes con escala y estado del objeto.
3. **Restricción contextual.** Cultivos, NPC, animales y objetos pequeños se pueden observar mucho más cerca que casas, árboles grandes y centros urbanos. No resolverlo con una distancia mínima universal más alta.
4. **Libertad vertical.** Volúmenes finitos que permiten cruzar por encima con altura suficiente; no columnas invisibles infinitas. Conservar inclinación y desplazamiento vertical de la cámara actual y su protección ante el terreno.
5. **Fade secundario.** Si excepcionalmente una geometría queda demasiado cerca, aplicar fade temporal para evitar clipping/triángulos gigantes. Último recurso, no mecanismo principal; restaurar la apariencia al salir y respetar coherencia de materiales/sombras/selección.
6. **Ajuste experimental.** Distancias/márgenes configurables por categoría/modelo, validados mediante imágenes y recorridos de cámara. No fijar aquí valores definitivos sin comprobar assets/culturas/escalas reales.

## Casos a contemplar

- Objetivo dentro de un edificio, cámara ya dentro de un volumen, carga/streaming de un modelo junto a la cámara y cambios por construcción, daño, colapso o eliminación. Evitar atraparla u obligarla a atravesar geometría para recuperar una posición segura.
- Zoom rápido, pan con ratón/touch, gestos simultáneos, órbita completa, inclinación, movimiento diagonal y subida/sobrevuelo/bajada por ambos lados de tejados.
- Continuar partida, botón Volver y desplazamiento automático hacia incursiones: integrar la protección con esas rutas sin perder su destino lógico ni introducir saltos.
- Volúmenes de varias estructuras próximas, árboles grandes, laderas/Gran Cañón y alturas de terreno variables. No hacer inaccesibles visualmente cultivos/personajes cercanos a edificios.
- Perfiles desktop/móvil y costes de consulta: broad phase/volúmenes simples y cachés invalidadas por cambios antes de raycasts costosos contra todas las geometrías cada frame. Medir coste, no asumirlo despreciable.

## Criterios de aceptación

- No hay penetraciones ni primeros planos que expongan triángulos/texturas problemáticos en los modelos revisados.
- Se conservan360°, pan, zoom, inclinación y sobrevuelo; los controles desaceleran y corrigen suavemente, sin saltos, jitter, bloqueo o paredes invisibles arbitrarias.
- Modelos grandes y pequeños tienen rangos distintos; se puede inspeccionar un cultivo, NPC o animal sin imponer el margen de un centro urbano.
- Se puede cruzar sobre edificios con altura suficiente y salir de estados iniciales dentro de un volumen.
- Volver/continuar/incursiones y cambios de estructura/streaming mantienen la protección y el destino esperado.
- Fade solo excepcional, temporal y reversible, sin agujeros permanentes ni artefactos de sombra/selección.
- Registrar capturas/recorridos para categorías, culturas/escalas relevantes y móvil físico; medir CPU/GPU/frametime antes/después. No acreditar toda la tarea con una sola casa o un test geométrico aislado.

La [cámara cercana del diagnóstico de cultivos](qa/crop-frustum-prototype/NEAR.md) ilustra un encuadre centrado en el edificio con gran ampliación. Es contexto del problema, no prueba de esta protección ni un ajuste aprobado de distancias.

## Estado de implementación

Base geométrica, índice espacial, volúmenes derivados de edificios y corrección suave preparados en un prototipo opcional de diagnóstico: [evidencias y límites](qa/camera-volume-foundation/README.md). La actualización de ancestros compartidos se mide en [PARENT-CACHE](qa/camera-volume-foundation/PARENT-CACHE.md), y la recuperación conjunta frente a terreno/edificios en [TERRAIN-RECOVERY](qa/camera-volume-foundation/TERRAIN-RECOVERY.md). La protección sigue desactivada en el gameplay normal. No están aprobados los márgenes visuales por modelo/cultura, la aceptación de controles y streaming, los árboles grandes, el fade secundario ni la validación móvil completa.

El prototipo opcional incorpora ahora [volúmenes de árboles grandes residentes](qa/camera-tree-exclusion/README.md), con posición/escala nativa, actualización por revisiones y propiedad aislada. La extensión está desactivada por defecto y no acredita márgenes visuales, controles, coste GPU ni móvil; esas condiciones de aceptación siguen pendientes.

### Límite vertical identificado antes de activar el prototipo

La reconciliación actual de `camera-terrain-exclusion.js` conserva el rango de
altura nativo de 2–20 metros sobre el terreno. Las pruebas de
`camera-terrain-exclusion.test.js` cubren sobrevuelo de un tejado de 15 metros,
pero para una casa de 30 metros verifican una salida lateral dentro de ese rango.
Esto prueba recuperación geométrica, no libertad de sobrevuelo de todas las
estructuras. Incluso una pose inicialmente por encima del tejado se limita antes
de consultar el volumen.

Antes de activar la protección, resolver este conflicto de forma contextual con
la intención y controles de cámara: los edificios altos deben poder sobrevolarse
con altura suficiente y permitir bajar por ambos lados. No basta con ampliar
globalmente los márgenes ni aceptar la salida lateral como equivalente al
requisito. Verificar aproximación, subida, cruce, descenso y recuperación sobre
modelos/culturas reales, manteniendo seguridad de terreno y suavidad. El
prototipo continúa desactivado y esta revisión no cambia la cámara de producción.

La revisión de fuentes del 9 de octubre identifica una limitación anterior al
resolver: `terrain-camera.js` reduce primero la distancia orbital a
`20 / max(.19, cos(phi))` y después limita la altura de la pose a terreno +20.
`constrainCameraToTerrain` vuelve a aplicar ese techo. Por tanto, modificar sólo
la recuperación de colisiones no permite al usuario solicitar un sobrevuelo alto.
En una consulta directa a `nativeCameraPose`, sobre terreno plano, una distancia
solicitada de65 metros con inclinaciones .065, .5 y1.16 produce en los tres casos
una altura final de20 metros. Es evidencia geométrica, no una prueba de controles
interactivos ni una aprobación visual.

La futura corrección debe negociar el rango vertical contextual antes de ambas
limitaciones y conservar la intención orbital sin incorporar la corrección de
colisión como entrada del jugador. Al cruzar el límite horizontal de un edificio
alto, no debe restablecer bruscamente el techo habitual y empujar la cámara hacia
su tejado. Verificar subida, cruce, salida y descenso por ambos lados con edificios
solapados y terreno variable, además de los gestos y recorridos ya enumerados.
El alcance de esta revisión es documentar la dependencia; no se ha alterado el
rango de cámara ni activado el prototipo.
