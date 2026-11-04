# Plan de cierre de la migración de Wild Guardians

Revisión: 4 de noviembre de 2026. Rama: `codex/guardian-3d-animation`, base `be7eb9b19`. Este documento es un plan, no una declaración de funcionalidades terminadas. Se ha contrastado el código con los informes existentes mediante tres revisiones por subsistema. No se han ejecutado nuevos benchmarks ni modificado el renderizador durante esta auditoría. Los cambios locales anteriores se conservan.

El objetivo es una partida completa con Wild Engine y física autoritativa fuera del hilo principal, presentación WebGPU en OffscreenCanvas, un material lógico universal con interfaces GPU estables, movimiento y animación visual autónomos, recursos progresivos y recuperación de errores. Primero se termina esa integración; las optimizaciones que no bloqueen su funcionamiento se aplazan.

## 1. Punto de partida comprobado

La partida estándar todavía utiliza `Game.advanceReal` en el hilo principal. `main.js` instala la simulación Worker solamente con `import.meta.env.DEV && qa-worker-game`; el mundo WebGPU requiere además `qa-webgpu-world`. Es una integración en la partida real de desarrollo, no el backend del producto distribuido.

`qa-webgpu-skip-legacy-draw` evita un segundo dibujo, pero agota `WorldScene.renderFrameUpdates()` en el hilo principal. La escena anterior conserva cámara, selección, actualizaciones y otras dependencias. No basta con quitar los flags para terminar la migración.

| Área | Qué existe y se reutiliza | Qué falta para darla por migrada |
| --- | --- | --- |
| Simulación | Host Worker, Worker autoritativo, Wild Engine, reloj, lotes de ticks, órdenes y Rapier dinámico conectados en QA | Arranque de producto sin construir primero WorldScene; cierre de todas las acciones, restauración y fallos; ninguna segunda autoridad |
| Publicaciones | Puertos directos de estado/terreno, secuencias, eventos, poses e invalidaciones; fusión de publicaciones compatibles | Eliminar snapshots completos como transporte recurrente; eventos autocontenidos; evitar que el ACK gráfico frene la autoridad; resincronización |
| Saturación | Cola acotada y salvaguarda a 128 pendientes | La salvaguarda puede retrasar el despacho de la simulación; no es desacoplamiento temporal completo |
| Mundo WebGPU | Terreno nativo, agua, vegetación, objetos, poblados, centros, muros y cultivos conectados | Agua y gran parte del terreno son provisionales; faltan cobertura artística, viento y selección LOD/impostores/near-textures de vegetación |
| Recursos | Vertex Colors y textura diferida para cinco bestias, cuatro trabajadores y estructuras; BC7 KTX2 con alternativa WebP en paquetes compatibles | Registro común de recursos/bindings; estabilidad de pipelines en ambos formatos; memoria, cancelación y residencia de todo el mundo |
| Estructuras | Centros, muros y poblados originales; cinco culturas/materiales con rutas progresivas | Completar interacción, destrucción y paridad. Muros/poblados usan atlas originales: no afirmar que todo está convertido a KTX2 |
| Materiales | Fórmulas TSL, algunas recetas compartidas y transición paramétrica Vertex Colors→textura | Contrato universal; evitar variantes por chunk/instancia/rig; incluir sombras, profundidad y VFX |
| Animación | Rigs, clips, poses físicas y bibliotecas precocinadas | Mixers CPU por actor todavía predominan; Walking de hiena GPU es un flag, no la solución general |
| Movimiento GPU | Helpers de laboratorio y observación de rutas confirmadas | No dirige actores reales. Las observaciones son históricas y no certifican un horizonte futuro seguro |
| Guardián y VFX | Ataque, agricultura, despertar, bendiciones, parte de Shield y destrucción en QA | Paridad completa, narración facial, capas de efectos, integración de provisionales, eliminación de dependencia del espíritu/UI anterior |
| Interacción | IDs provisionales y confirmación/rechazo en rutas existentes; picker WebGPU asíncrono de QA | Clics, construcción y selección siguen dependiendo de WorldScene; falta vincular selección a cámara, geometría GPU y tiempo presentado |
| Carga/cinemáticas | Sistemas existentes de transición, relato y lápiz | LoadingCinematic invoca render anterior; PencilBackground y el guardián de UI mantienen contextos WebGL propios |
| Recuperación | Detección de device loss y retorno al dibujo anterior mantenido vivo | Reconstrucción independiente del Worker gráfico, recuperación de canales y fallback de producto sin dos escenas permanentes |

Los documentos antiguos son históricos: por ejemplo, algunos dicen que terreno/agua aún no están conectados y el código actual ya los conecta. La matriz anterior describe el estado revisado; las pruebas aisladas no certifican paridad global.

Evidencia principal: [integración actual](webgpu-game-integration.md), [diagnóstico de bloqueos](raid-stall-diagnosis-20261104.md), [contrato de movimiento pendiente](gpu-animation/confirmed-motion-feed-qa.md), [estructuras progresivas](webgpu-progressive-all-structures.md) y [picking](webgpu-picking.md).

## 2. Arquitectura que debe quedar

### Autoridad y propiedad

| Propietario | Responsabilidades | No debe depender de |
| --- | --- | --- |
| Worker autoritativo | Reglas, intenciones, movilidad, colisiones, Rapier, reservas, economía, tiempo, comandos, checkpoints | rAF, cámara dibujada, carga de texturas, ACK del dibujo |
| Host Worker existente | Admisión/orden de comandos, reloj y transporte; retención y recuperación de publicaciones | Ejecución de reglas duplicadas o permiso por cada fotograma |
| Worker gráfico | Escena WebGPU, contexto/dispositivo, recursos GPU, cámara de presentación, selección visual, efectos y fallbacks visuales | WorldScene anterior, consultas síncronas al Worker autoritativo |
| GPU | Evaluación visual de trayectorias autorizadas, poses precocinadas, deformaciones y dibujo | Actualizaciones JS individuales de cada actor en cada fotograma |
| Hilo principal | DOM, entrada, HUD, audio del navegador y coordinación ligera | Wild Engine, Rapier, carga/compilación gráfica, actualización completa de escena o rigs |
| Preparación auxiliar existente | Descarga, decodificación, conversión y datos transferibles, cuando procede | Crear recursos de otro contexto WebGPU ni duplicar el catálogo |

Se reutiliza el host actual. No se añade un Worker nuevo por subsistema. La propiedad del dispositivo WebGPU permanece en el Worker gráfico; preparar bytes en otro Worker no evita que el proceso gráfico comparta compilador/controlador con la presentación.

### Material universal: definición concreta

Un único sistema lógico de material, una biblioteca TSL estable y parámetros por objeto/instancia. Pueden existir wrappers de Three.js o bindings diferentes; no se persigue el número de objetos JavaScript `Material` como métrica de éxito.

- `FrameData`: tiempo de presentación ligado a simulación, cámara, luces, día/noche.
- `ObjectData`: ID/generación, transformación o trayectoria, índices de material y geometría, offsets de animación, modos y visibilidad.
- `MaterialData`: color, intensidad de mapas, textura/UV, transición desde Vertex Colors, rugosidad, emisivo, viento, crecimiento, bendición, disolución y otros parámetros de las recetas existentes.
- Interfaces de atributos y buffers estables; datos neutros para características ausentes. No aumentar innecesariamente geometría ni obligar a objetos estáticos a ejecutar skinning completo.
- Slots permanentes para color, normal y propiedades utilizadas; textura provisional y final con binding compatible. La textura 1×1 transparente puede ocupar el slot de color, pero su alfa no hace desaparecer el modelo provisional. Normal plana y otros valores neutros se definen por semántica.
- Texturas distintas se seleccionan por bindings o índices de recursos. Un solo `material.map` global no permite que todos los objetos tengan imágenes independientes. No imponer un atlas gigante; conservar compresión, mipmaps y streaming.
- Un catálogo pequeño y explícito de pipelines por estado/pase necesario: opacidad/transparencia, mezcla, profundidad, culling, formatos y muestras. Su número no crece con IDs, cantidades de instancias o variedad de texturas compatibles. Color, sombras y profundidad comparten deformación y cobertura alfa.
- El catálogo contempla también topología, formatos/layouts de vértices y bindings, y especializaciones de deformación/luces que aún no se hayan convertido en datos. La estabilidad se verifica por clase de compatibilidad y límites del dispositivo; no se promete un pipeline idéntico para interfaces incompatibles.
- La residencia de programas/pipelines compartidos pertenece al catálogo, no a la vida de una instancia. Desaparecer una bestia o expulsar un chunk no debe destruir accidentalmente los programas esenciales que reutiliza el resto del mundo.
- Registrar claves, shaders y descriptores estructurales, no solo etiquetas de material. Una etiqueta repetida no demuestra un pipeline idéntico.

Los estados fijos de WebGPU no se convierten en uniforms. Se unifica el material lógico sin forzar agua, humo y sólidos a usar reglas de profundidad/mezcla que cambien su apariencia. La representación exacta de buffers se fija en la primera integración, respetando límites del dispositivo.

### Transporte y tiempo

El contrato versionado debe distinguir:

1. Estado acumulable: últimos valores por entidad, altas/bajas con generación, revisiones de mundo y cambios parciales.
2. Eventos ordenados: ID, tick/tiempo, secuencia, comando causante y datos suficientes para representarlos sin consultar un snapshot posterior incompatible.
3. Barreras que no pueden desaparecer al acumular: cambios de propiedad física, invalidaciones, pausas, discontinuidades, revisiones de terreno/estructuras y terminales de acciones.
4. Ventanas de movimiento/pose: intervalos autorizados con todos los datos y revisiones necesarios para presentarlos de forma coherente.
5. Checkpoints para arranque, guardado y resincronización; no una instantánea completa por tick como contrato normal.

El ACK controla la retención y el envío al consumidor; no debe convertirse en permiso gráfico para avanzar la autoridad. No se elimina simplemente la salvaguarda actual: primero se implementan el transporte acumulado, la retención y la resincronización.

Con memoria finita no se pueden conservar infinitos eventos ante un consumidor ausente indefinidamente. Se define una política explícita: journal acotado, persistencia/segmentación cuando sea necesaria, reconstrucción desde checkpoint y, ante límites de seguridad irrecuperables, pausa controlada notificada. Nunca descartar silenciosamente resultados lógicos ni crear una cola ilimitada. Esa excepción de seguridad no es el presupuesto gráfico de 16,67 ms.

## 3. Decisiones arquitectónicas y alternativas

Estas decisiones son propuestas de implementación; no se presentan como mejoras medidas. Se comparan tres opciones por bloqueo principal antes de programar su solución.

| Problema | Alternativas | Elección inicial y motivo |
| --- | --- | --- |
| Explosión de pipelines | Compartir solo Material; capacidades fijas por lote; buffers compartidos con offsets/contadores y shader estable | Reutilizar la biblioteca universal y representación estable con offsets. Capacidades fijas son puente reversible si eliminan variantes sin malgastar memoria. Compartir solo Material ya no resuelve la traza |
| Transporte saturado | Snapshots estrictos actuales; deltas acumulados más journal autocontenido; memoria compartida de último estado | Deltas/journal sobre MessagePort existente. Mantener checkpoints. Memoria compartida no elimina por sí sola eventos, coherencia ni necesidad de sincronización |
| Movimiento autónomo | Extrapolar rutas actuales; ventana histórica confirmada de todo el mundo; reservas futuras espacio-temporales | Ventana confirmada coherente como primera integración, con latencia acotada y parada al agotarse. Extrapolar no es seguro; reservas futuras quedan fuera del modelo A salvo necesidad demostrada |
| Entrada sin WorldScene | Mantener escena anterior; consultas visuales asíncronas del Worker con cámara/tiempo versionados; picking GPU por IDs | Conectar consultas existentes y proxies compatibles con la presentación; GPU IDs solo donde la deformación/oclusiones lo exijan. No mantener una escena completa para picking |
| Coste visual de contactos | Muestrear piel/triángulos siempre; apoyo/envolventes precalculados; recalcular exacto en GPU | Datos precalculados y muestreo acotado de superficie común para lo visual; exactitud autoritativa permanece en Wild Engine/Rapier. No trasladar trabajo innecesario a GPU |

Las rutas antiguas siguen disponibles como alternativa de ejecución. Reversión significa seleccionar una implementación completa compatible; no mantener ambas simulaciones ni ambos mundos actualizándose por defecto.

## 4. Secuencia de implementación

### Etapa 0 — Fijar contratos y una línea de integración

**Entrega:** contrato mínimo de publicación/eventos/tiempo, interfaz de presentación, tabla de propietarios y catálogo inicial de pipelines. Mantener una configuración reproducible de incursión y una prueba de arranque de paquete distribuible, además de Vite.

Crear una selección de backend al arrancar, todavía reversible, sin activar WebGPU como producto antes de sus controles. Separar la API mínima de cámara, selección, previews, audio/HUD y lifecycle de `WorldScene`. Inventariar cada llamada restante a render, animación, navegación y física en el hilo principal. Eliminar la dependencia de bootstrap que obtiene plantillas físicas construyendo meshes de centros en `installWorkerGame`: reutilizar datos de autoría o cargarlos en el Worker propietario.

**Aceptación:** se puede localizar el propietario de cada estado y no hay una nueva autoridad implícita. Las capacidades declaradas separan recurso descargado, preparado, pipeline disponible y primer uso validado; un simple `ready` no promete finalización GPU.

**Dependencias:** ninguna. **Reversión:** interfaces adaptan primero la ruta existente sin sustituirla.

### Etapa 1 — Corregir materiales, instancing y sombras sobre la escena existente

**Entrega:** primera versión del material lógico universal y recursos con interfaces estables, conectada a la vegetación/objetos que dominan la traza. Incluir el pase de sombras en el mismo cambio vertical. No crear otro laboratorio.

1. Reutilizar fórmulas TSL/Vertex Colors y sacar las propiedades de cada modelo de la construcción del grafo.
2. Sustituir capacidades que alteran shaders por buffers/offsets/contadores estables. Revisar la interacción con las cachés de Three.js 0.180.0; no falsear claves para hacer coincidir layouts incompatibles.
3. Mantener compatibilidad de textura provisional/final, samplers y UV, tanto BC7 como WebP. El aumento de pipelines del fallback WebP es una regresión a resolver.
4. Registrar un conjunto esencial de configuraciones del renderer, independiente de cuantos modelos existan. No recorrer todas las escenas ni dibujar modelos fantasma para prepararlas.
5. Gestionar explícitamente las excepciones bajo demanda. Una promesa `compileAsync` no acredita ausencia de bloqueo: las trazas deben comprobar su efecto sobre el proceso gráfico y los fotogramas. No incorporar el objeto mediante el primer dibujo síncrono mientras su configuración está pendiente.

**Aceptación:** en la incursión usada para el diagnóstico, variar cantidad de chunks/instancias y sustituir texturas compatibles no multiplica shaders/pipelines. La sombra y el color respetan geometría, alpha cutout y deformación. No aparecen nuevas compilaciones de combinaciones ya cubiertas por el catálogo. Se captura una traza comparable que explique las creaciones restantes; no se exige optimizar todavía todos los costes GPU.

**Dependencias:** contrato gráfico de etapa 0. **Reversión:** selección de implementación de material/pases, sin modificar mecánicas ni convertir recursos irreversiblemente.

### Etapa 2 — Publicaciones acumuladas y desacoplamiento real de la autoridad

**Entrega:** varios ticks producen un estado acumulado más eventos ordenados completos; las actualizaciones visuales se aplican por cambios relevantes, no reconstruyendo todos los subsistemas por publicación.

1. Clasificar los observadores actuales: cuáles necesitan el estado exacto del evento y cuáles solo el último valor. Convertir eventos necesarios en payloads autocontenidos o adjuntar su pequeño contexto causal.
2. Acumular cambios por entidad y mantener orden de eventos, barreras de física y versiones de geometría. Conservar la ruta de snapshots para comparación y resincronización.
3. Mantener un único envío normal en vuelo o una ventana de transporte explícitamente acotada; no acumular snapshots completos en espera. La mejora viene de eliminar trabajo y datos repetidos, no de agrandar la cola.
4. Incorporar resincronización por epoch/checkpoint y cursores de eventos. Cada consumidor tiene su ACK; la UI/audio y el renderer no pierden eventos por el retraso de otro consumidor.
5. Retirar la dependencia `canDispatch → visualStream.blocked()` solamente después de demostrar esas garantías. Mantener prioridades, cancelación, control de admisión y límites de seguridad propios de simulación.
6. Aplicar cambios visuales una vez por lote cuando sea equivalente. Los VFX no deben recorrer geometría completa del terreno por partícula para alcanzar cada snapshot intermedio. Reutilizar la superficie publicada y su revisión; conservar la resolución exacta solo donde sea funcionalmente necesaria.

**Aceptación:** misma secuencia de comandos y mismos resultados/eventos autoritativos que la referencia; consumidores lento/ausente/reiniciado no causan duplicación ni pérdida de eventos; memoria y latencia no crecen sin límite. Las pruebas incluyen transiciones de poses, impactos y cambios de terreno entre ticks fusionados. No se contabiliza como éxito una reducción de envío acompañada de una segunda reconstrucción completa del mundo.

**Dependencias:** contrato temporal de etapa 0; puede implementarse en paralelo a etapa 1. **Reversión:** protocolo anterior seleccionable por sesión; no mezclar versiones dentro de un canal.

### Etapa 3 — Primera incursión jugable sin escena anterior

**Entrega:** un escenario real con simulación Worker y una única presentación WebGPU, incluyendo interacción. Es el primer hito de integración, no la declaración de paridad de todos los biomas.

- Arrancar la autoridad sin inicializar `WorldScene` ni otro mundo de navegación en el hilo principal. Los datos físicos/espaciales vienen de los propietarios existentes.
- Separar controles/cámara de WorldScene. Mandar cambios de cámara inmediatamente, reemplazando solo vistas obsoletas; nunca esperar a un tick lógico para mover la cámara visual.
- Conectar picking, construcción, plantación, agricultura, despertares y Attack al Worker gráfico y a sus comandos autoritativos. Las respuestas de selección incluyen cámara, tiempo presentado, generación de entidad y secuencia.
- Un objetivo visible puede haber cambiado en la autoridad. La orden conserva su ID/generación y contexto de selección, se revalida al ejecutarse y se rechaza/corrige explícitamente si ya no es válido. El timestamp visual no reordena comandos ya confirmados ni vuelve vulnerable a una bestia derribada. El feedback provisional no modifica el estado lógico ni rebobina el mundo confirmado.
- Migrar previews y reconciliación por ID: construcción provisional, plantas, gesto del guardián, efectos confirmados y rechazo. Ningún beneficio/recompensa se aplica antes de confirmación.
- El feedback local de entrada se emite desde el siguiente fotograma disponible y el inicio de gestos se envía directamente al Worker gráfico, sin esperar confirmación de la autoridad. No se promete una animación 3D instantánea si el propio Worker gráfico o el proceso GPU están bloqueados: esos bloqueos son parte de la aceptación de etapas 1 y 3.
- Mantener Attack encadenable según duración del gesto y vulnerabilidad de la bestia. La presentación no inicia otro disparo sobre una bestia pendiente o derribada. Confirmación y Rapier gobiernan daño/recuperación.
- Definir explícitamente orden temporal de comandos y confirmaciones. Si una mecánica exige corregir consecuencias ya confirmadas, usar checkpoint y reproducción determinista de todas sus dependencias; una corrección de mesh no cumple ese requisito. No prometer un retroceso causal que aún no está implementado.
- Eliminar la llamada a `renderFrameUpdates` del camino WebGPU. HUD/audio consumen una proyección ligera y eventos, sin sostener el renderer anterior para obtenerlos.

**Aceptación:** la incursión permite jugar, pausar y guardar mediante UI real; en esta ruta no se construye ni actualiza el mundo WebGL. Un fallo no produce una segunda simulación. Instrumentación verifica cero llamadas de movilidad/colisión/rig de personajes en el hilo principal. Las excepciones CPU visuales temporales viven en el Worker gráfico, están enumeradas y tienen salida prevista.

**Dependencias:** etapas 1 y 2 para que la escena sea operable; puede prepararse la interfaz y el input en paralelo. **Reversión:** reiniciar presentación usando el adaptador anterior desde estado confirmado, sin mantenerlo dibujando/actualizándose a escondidas.

### Etapa 4 — Trayectorias y animación autónomas sobre esa incursión

**Entrega:** primero una bestia real, después el roster, consumiendo datos temporales persistentes en GPU. No conectar la traza histórica aislada como si fuera una ruta futura segura.

Completar también el modelo A de propiedad de movilidad: reutilizar intenciones persistentes, reservas, rutas y revisiones de Wild Engine; retirar decisiones duplicadas de los controladores individuales conforme el controlador central asuma cada responsabilidad. Distinguir invalidación estructural de conflictos transitorios y conservar comprobaciones continuas autoritativas donde sean necesarias. Empezar por AttackCrop y extender la infraestructura a trabajo, retorno y huida. El batch nativo experimental no se activa como autoridad paralela; cada sustitución transfiere propiedad y mantiene la referencia comparativa.

1. Publicar intervalos ya ejecutados y coherentes de todo el mundo visible: movimiento, pares, poses físicas, eventos y revisiones de terreno/estructuras. Retener solo las revisiones necesarias para la ventana.
   Dos estados extremos y un reloj común no garantizan ausencia de cruces. Se necesitan los tramos ejecutados y las dependencias disponibles durante todo el intervalo; los eventos no reconstruyen por sí solos poses intermedias ausentes. Si no se puede validar la interpolación de un tramo, retener el último estado íntegro, sin completarlo mediante estimaciones.
2. Definir un reloj de presentación común dentro de ese intervalo. Su retraso objetivo se determina y mide; no se rellena avanzando artificialmente la simulación por delante del tiempo debido ni introduciendo otra simulación predictiva.
3. Enviar trayectorias por actor/versión con comienzo, fin seguro, offsets de segmentos y modo de movimiento. La GPU interpola; JS actualiza los registros afectados y el tiempo global, no `mesh.position` por actor/fotograma.
4. Al faltar datos, detener la presentación en su límite confirmado. No extrapolar a través de cuerpos/obstáculos ni avanzar efectos a otra cronología. Pausa, aceleración, restauración e invalidación deben cambiar todas las capas consistentemente.
5. Unificar clips precocinados y animación GPU mediante índices/offsets y mezclas. Ampliar desde locomoción real a cinco especies y cuatro trabajadores; incluir normales y sombras. Extender después acciones, expresiones, parpadeo y visemas del guardián.
6. Mantener la física autoritativa y las poses que necesitan Rapier/IK/lógica en CPU. Impactos, ragdolls y recuperaciones tienen una propiedad visual explícita; pasan a GPU o a fallback especializado del Worker, sin evaluar simultáneamente dos poses de presentación.
7. Activar LOD temporal/geométrico reutilizando el mismo contrato, sin convertir frecuencia, clip o cantidad de huesos activos en nuevas variantes de shader. No ampliar la biblioteca sin necesidad perceptible.

**Aceptación:** continuidad de impactos, pies, ataques y recuperación suficiente visualmente; no se exige equivalencia geométrica milimétrica. Las reglas, reservas y colisiones permanecen idénticas. Cero evaluaciones CPU individuales de desplazamiento/animación de presentación en régimen estable para los actores declarados migrados. Un pico inyectado de 30/50/100 ms en la autoridad no bloquea por sí mismo el render; el renderer continúa hasta su horizonte y se detiene con seguridad si se agota. Se mide por separado la latencia de respuesta y la falta de datos. Las inyecciones son pruebas, no presupuestos de navegación.

**Dependencias:** etapas 2 y 3; contrato de buffers de etapa 1. **Reversión:** reproducción CPU de presentación dentro del mismo Worker y sobre el mismo reloj/estado, nunca autoridad alternativa.

### Etapa 5 — Completar mundo, arte y mecánicas sobre la arquitectura común

Esta etapa se divide por subsistemas en paralelo desde que los contratos son estables. Ningún equipo introduce su propio sistema de materiales, transporte o tiempo.

| Frente | Entrega necesaria |
| --- | --- |
| Terreno y agua | Todos los biomas con sus fórmulas artísticas, orillas y efectos aplicables; manglar con islotes de Wild Engine; cobertura del slot especial de agua |
| Vegetación/streaming | Viento, LOD/impostores, texturas cercanas, culling, actualizaciones parciales y expulsión; árbol cercano 3D desde su primera presentación válida, sin sustitución masiva innecesaria |
| Cultivos/estructuras | Bridges de crecimiento, daño, poblados y culturas correctas, previews y texturas completas; geometría/materiales compartidos y KTX2 donde realmente esté disponible |
| Efectos/destrucción | Capas faltantes de magia/Shield, hojas/cintas/luces/profundidad según paridad; destrucción de centros y muros, humo, escombros y apoyos visuales acotados |
| Guardián y relato | Invocación, combate, agricultura, despertar, rostro/lipsync y tutorial, selección de ubicación y transiciones |
| Carga y cinemáticas | Render dentro de la arquitectura nueva, shader de lápiz, espíritu auxiliar y transición de carga; retirar barra/cancelar cuando corresponde al tramo del cielo |

**Aceptación:** comparación visual y funcional por frente en partida real, día/noche, cámaras/zoom, pendientes y obstáculos; ninguna mecánica depende del mundo anterior. Se preservan las texturas completas finales. Diferencias no perceptibles se aceptan; pérdida artística evidente o reglas cambiadas bloquean la integración.

**Dependencias:** interfaces de etapas 0–2; se integra por verticales en la misma partida de etapa 3 y utiliza etapa 4 cuando corresponde. **Reversión:** subsistema o backend completo con evidencia de paridad; no copiar silenciosamente la ruta antigua en el hilo principal.

### Etapa 6 — Guardado, pérdida de dispositivo y recuperación

**Entrega:** checkpoints autoritativos y reconstrucción de presentación independiente. Se desarrolla en paralelo al transporte, pero es obligatoria antes de habilitar producto.

- Guardar/restaurar durante movimiento, ataques, física activa, pausa y cambios de velocidad; conservar revisiones, reservas y poses necesarias. El flag actual de guardado físico no es aceptación final.
- Ante device loss o reinicio del Worker gráfico, descartar recursos GPU antiguos, incrementar epoch y reconstruir desde checkpoint más journal confirmado. No volver a emitir recompensas, audio ni VFX de eventos ya consumidos.
- Capturar checkpoint, revisión de mundo y cursores de eventos coherentemente. Podar el journal solo cuando los consumidores hayan reconocido el tramo o exista una recuperación explícita que conserve las garantías requeridas. Si falta el intervalo necesario, no prometer replay exacto: pasar a recuperación/pausa notificada conservando el estado recuperable, sin omitir silenciosamente eventos pendientes.
- Reconstruir Shield, bendiciones, destrucción y otros efectos persistentes todavía activos en su fase temporal correcta. Esa rehidratación es distinta de repetir un sonido, una recompensa o un efecto puntual ya consumido; sus cursores deben sobrevivir al reinicio del renderer.
- Ante fallo de autoridad, no continuar una simulación inventada. Recuperación desde checkpoint/log cuando sea segura; en caso contrario, pausa/error recuperable con el último guardado consistente.
- Cancelación de cargas y referencias de recursos por propietario; un recurso liberado no reaparece al acabar una promesa antigua.
- WebGL queda como fallback de compatibilidad seleccionado explícitamente. Se prepara cuando hace falta; no mantiene una segunda escena permanente. Si su arranque requiere tiempo, comunicar la transición, sin fingir recuperación instantánea.

**Aceptación:** pérdida/recreación gráfica, rechazo de mensajes de sesión antigua, guardado/restauración con física activa y cierre/reanudación pasan con mismo estado lógico. No se repite el problema de identidad nativa que alteraba las esperas de incursión en pruebas anteriores.

### Etapa 7 — Habilitación de producto y validación conjunta

**Entrega:** backend WebGPU/Workers seleccionable desde el arranque distribuido, sin depender de `import.meta.env.DEV`, endpoints QA o recursos fuera del paquete. Convertir los flags útiles en selección de capacidades/versiones y conservar la vía de reversión; no integrar en `main` sin autorización.

Pruebas obligatorias:

1. Nueva partida y partida restaurada; carga, cancelación, primer centro, primera muralla y primera aparición de los diez modelos principales.
2. Cultivar, Grow, Multiply, despertares, Shield, Attack encadenado y rechazado; recursos/daño/reservas sin duplicación.
3. Incursiones reales y multitudes, cruces, pasos estrechos, barreras cambiantes, distintos tamaños y cuerpos estacionarios; ragdolls y recuperaciones.
4. Todos los biomas y culturas, día/noche, movimiento de cámara, zoom, streaming y LOD; rostros, cinemáticas y efectos completos.
5. Pausa, velocidad, guardado físico, restauración, pérdida de dispositivo, cancelación, saturación y sesiones prolongadas.
6. Capturas deterministas y campañas de 100 noches usando los runners existentes, con el mismo conjunto de órdenes/semillas y condiciones. Comparar estados/eventos autoritativos, no fechas de llegada de mensajes ni píxeles entre fotogramas distintos.
7. Rendimiento conjunto en GTX 1660 y hardware integrado cuando esté disponible. Si falta el segundo dispositivo, declararlo pendiente; no presentar software rendering como sustituto de esa validación.

Medir carga, CPU por hilo, tiempo de GPU cuando sea medible, intervalos de presentación, p95/p99/máximos, latencia input→confirmación→presentación, horizonte disponible, cola/journal, memoria, bytes transferidos, buffers actualizados y pipelines solicitados/creados. Excluir correctamente el intervalo previo al inicio de cada ventana y conservar trazas ante máximos largos. Las pruebas instrumentadas diagnostican; las comparaciones de rendimiento se repiten sin el coste fuerte del perfilado.

**Aceptación global:** partida distribuida jugable y completa; autoridad única fuera de main; presentación independiente hasta el horizonte seguro; ningún mundo anterior actualizado por debajo; GPU autónoma para las rutas declaradas; excepciones físicas/visuales limitadas y documentadas; biblioteca de pipelines estable ante variación de contenido compatible; calidad y mecánicas conservadas. Entonces empieza la optimización profunda de los costes restantes.

## 5. Dependencias, reparto y entregas pequeñas

Camino crítico: **contratos → material/pipelines y transporte → incursión sin WorldScene → movimiento/animación autónomos → cobertura y recuperación completas → producto**.

Trabajo paralelo útil, con un único integrador y sin crear ramas/worktrees adicionales por defecto:

- Gráficos: etapa 1, y luego mundo/arte de etapa 5. Propietario único del material universal y del catálogo de pipelines.
- Autoridad/transporte: etapa 2 y checkpoints/recovery de etapa 6. Mantiene equivalencia funcional.
- Entidades: contrato temporal y etapa 4; no conecta GPU a observaciones históricas inseguras.
- Integrador: arranque, interfaz de presentación, input/HUD/audio, retirada de WorldScene, pruebas de partida y revisiones cruzadas. Con tres slots de trabajo auxiliares, rotar especialistas en lugar de editar todos los archivos comunes simultáneamente.

Primeros cambios revisables:

1. Contratos e inventario ejecutable de propietarios/variantes sobre el flujo actual.
2. Una vertical de instancing y sombras estable en la incursión del bloqueo, con captura antes/después.
3. Journal/eventos autocontenidos y acumulación en modo comparativo, con estados/poses verificados antes de conectar consumidores nuevos.
4. UI/picking/previews detrás de la interfaz de presentación; arranque sin capturar plantillas mediante la escena anterior.
5. Incursión WebGPU sin actualizaciones WebGL, todavía con excepciones CPU declaradas dentro del Worker.
6. Ventana confirmada común y una bestia GPU real; ampliar por especies/acciones y después cerrar los demás frentes.

Cada commit debe indicar qué funciona en la partida, qué sigue dependiendo del hilo principal y cuál es el próximo bloqueo imprescindible. Añadir prueba representativa y mecanismo de reversión; hacer commit y push en la rama actual. No mezclar refactor de transporte, nuevo shader y cambio de mecánica en un mismo commit.

## 6. Verificación existente que se debe reutilizar

No se han vuelto a ejecutar estas pruebas para redactar el plan. Son puntos de partida, no certificación de etapas futuras:

- Autoridad/transporte: `tests/worker-game-runtime.test.js`, `tests/worker-hosted-runtime.test.js`, `tests/host-publication-queue.test.js`, `tests/visual-publication-stream.test.js`, `tests/confirmed-presentation-stream.test.js` y `tests/terrain-publication.test.js`.
- Guardado/física: `tests/worker-save.test.js`, fixtures `simulation-authority-dynamic-physics.html`, `worker-hosted-physics-coalesce.html`, `worker-save-checkpoint.html` y `tools/experiments/audit_live_webgpu_physics.mjs`.
- Movimiento/animación: `tests/confirmed-gpu-motion.test.js`, `tests/webgpu-baked-walk.test.js`, `tests/webgpu-confirmed-animal.test.js`, `tests/webgpu-animal-roster.test.js`, auditorías de hiena y reconciliación existentes. Añadir validación conjunta de tiempo, pares y mundo; los helpers aislados no la sustituyen.
- Intenciones/colisiones: pruebas `spatial-native-animal-intent`, `spatial-native-intent-bridge`, `spatial-native-intent-index` y campañas nativas. No activar la movilidad central experimental como otra autoridad paralela.
- Mundo y recursos: auditorías existentes de WebGPU world, settlements, progressive center, worker roster, crop roster y picking; comparación del mismo recurso en BC7 y WebP.
- Campañas: `tools/run_native_campaign.mjs`, `tools/replay_campaign.mjs` y verificadores existentes, configurados de forma reproducible para el alcance de 100 noches.
- Bloqueos: `tools/experiments/measure_webgpu_stable_raid.mjs`, `raid-stall-trace.mjs` y `analyze-raid-stall-trace.mjs`; añadir pruebas de presupuesto estructural de pipelines, no una nueva colección independiente de laboratorios.

## 7. Límites y tareas que se aplazan

No se introduce D* Lite, predicción modelo B, una nueva cuadrícula, otro renderer ni un motor físico distinto. Se conserva lo que funciona de Wild Engine y se evita duplicar estado espacial. Se completa la propiedad central de movilidad del modelo A en la etapa 4; ampliar algoritmos de búsqueda o microoptimizar la implementación nativa se aplaza salvo necesidad funcional demostrada. Ejecutar reglas de juego en JS del Worker autoritativo no equivale a mantener movilidad de presentación en el hilo principal.

No se optimizan preventivamente todos los shaders, todos los apoyos o cada pico aislado. Sí se corrigen ahora los bloqueos que impiden jugar: multiplicación de pipelines, dependencia gráfica del avance lógico, actualizaciones del mundo anterior y trabajo visual incompatible con el nuevo transporte.

No se promete que WebGPU, `compileAsync`, KTX2 o OffscreenCanvas por sí solos eliminen los tirones. La arquitectura se considera terminada por su funcionamiento de extremo a extremo y por sus garantías verificadas; la mejora de rendimiento se declara únicamente donde exista comparación reproducible.
