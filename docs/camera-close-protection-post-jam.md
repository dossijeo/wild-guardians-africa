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
