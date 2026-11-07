# Infraestructura que debe resolver el soporte de B

El agente de contenido se ocupa de modelos, texturas, recetas TSL, clips, parámetros artísticos y su conexión con los propietarios existentes. No le corresponde implementar transporte, gestionar carreras de admisión, reparar la autoridad, diseñar recuperación ni crear un coordinador por cada animación. Este documento separa responsabilidades; no declara cerrado B ni sustituye la validación integrada de C.

## Estado revisado y propiedad técnica

| Contenido | Infraestructura existente | Pendiente técnico a cargo de este trabajo |
| --- | --- | --- |
| B1 terreno, agua e iluminación | Superficie WebGPU, residencia temporal, catálogo y admisión | Coordinación de revisiones visibles/confirmadas y recuperación de recursos/pases. La paridad de fórmulas y texturas queda en contenido |
| B2 vegetación y LOD | Coordinador de chunks, demandas regionales, texturas progresivas, reintentos | Cancelación, generaciones, relevo atómico de LOD y ausencia de recursos obsoletos tras recuperar. No resolverlo por especie |
| B3 cultivos y construcción | Previews por ID, confirmación autoritativa, bancos progresivos, puentes de crecimiento | Orden entre petición, carga, confirmación/rechazo y destrucción; no bloquear la acción esperando admisión ni duplicar efectos |
| B4 trabajadores y bestias | Bancos compartidos, extensiones de rig/movimiento, reloj y muestras GPU | Admisiones concurrentes, cambios de acción, física y recuperación, reproducción de intervalos con eventos. Una animación no debe implementar su propio protocolo |
| B5 guardián y combate | Feedback provisional, selección versionada, reconciliación y pose física autoritativa | Rechazo antes del gesto si el objetivo no es vulnerable, orden causal y cambios de dueño de la pose; contenido conserva gestos/rostro/VFX |
| B6 efectos y destrucción | Diario, admisión común, perfiles de trabajo y checkpoints | Recuperación con dependencias de terreno, no duplicación ni pérdida de eventos y recursos pendientes |
| B7 tutorial/cinemáticas/guardado | Perfil explícito Worker, guía, carga, recuperación temporal y cinemática WebGPU | Continuidad de sesión y tiempos, cancelaciones y cierre; no introducir nuevas dependencias de la escena WebGL |

Fuentes: plan integrado, documentos B1–B7 del directorio y propietarios `webgpu-world-surface`, `webgpu-worker-roster`, `webgpu-animal-roster`, `confirmed-presentation-stream`, `confirmed-timeline-pump` y receptores de estado/HUD. La lectura del código y pruebas de contrato no certifica paridad visual ni rendimiento GPU.

## Primer arreglo transversal: admisión de acciones de trabajadores

Se detectaron dos fallos: Fall/GetUp conservaban la marca de intento después de una cancelación transitoria, y Water podía volver a solicitarse desde su propia finalización después de un error persistente. Los caminos entre solicitudes de otras acciones también podían reactivar errores sin cambio de estado.

Ahora Run, Harvest, Idle, Alert, Water, Plant y Carry retienen el fallo por identidad de estado. Una cancelación se rearma al reconciliar estado confirmado; una acción nueva puede solicitar otra vez el recurso. Fall y GetUp distinguen también cancelación y fallo. No se añade un temporizador, no se libera el rig anterior antes de publicar el candidato, y no se elimina ninguna barrera de física ni de historial. Una respuesta de un actor retirado sigue sin poder publicar.

Se compararon tres opciones: parches independientes por clip, reemplazar de golpe los rosters por una cola nueva o aplicar la misma política de reintento sobre las admisiones existentes. Se usa la tercera para mantener las comprobaciones de identidad, propiedad y cancelación ya integradas. La consolidación futura puede extraer ese estado sin cambiar su contrato.

Pruebas: `webgpu-worker-action-retry.test.js` cubre siete acciones, cancelación, fallo persistente y nueva acción; `webgpu-worker-fall-roster.test.js` cubre caída/recuperación. Las pruebas de roster y rig conservan sus comprobaciones de fases y selección. No son mediciones de mejora de FPS.

## Ampliación de la política de admisión y propiedad de pose

Walk también queda acotado por el estado confirmado: ni la finalización de Idle ni la de otra acción pueden relanzar una descarga o instalación fallida. Las diez acciones de trabajadores tratan un instalador que devuelve `false` como candidato no publicado, conservan la presentación vigente y esperan una oportunidad posterior. Una cancelación de Walk conserva el clip descargado cuando existe; un fallo real se notifica y no se repite en el mismo estado.

Las bestias aplican la misma regla a Walk, Run y Attack. Sus cancelaciones registran la generación de admisión y la identidad de estado/ataque; se rearman mediante una publicación confirmada, el final del intervalo histórico o la liberación real de la pose física/reconciliación. Los callbacks de las acciones no pueden relanzarse mutuamente en esa misma generación. Los fallos reales de locomoción esperan un cambio de estado y los de ataque otra identidad autoritativa. No se añade un reloj ni se reintenta cada fotograma.

La llegada de terreno ya no llama al roster de trabajadores fuera de la barrera temporal que protegía a las bestias. Ambos rosters evitan además reevaluar la pose CPU de participantes que están reproduciendo un intervalo GPU. Siguen comprobando cambios de identidad, retirada y estado para invalidar el certificado cuando corresponda; no se elimina la validación del soporte ni se permite continuar sobre terreno obsoleto.

Validación: 159 pruebas de admisión, rosters, reloj, grupo histórico, épocas de superficie y autoridad WASM, incluidas caída y recuperación de trabajadores. Los nuevos casos prueban cancelación, fallo, candidato no publicado, solicitudes concurrentes, conservación del clip y retirada durante carga. Esta evidencia no certifica rendimiento, recuperación de dispositivo ni paridad de imagen en WebGPU real.

## Eventos en el extremo de un intervalo

Se consideran tres alternativas: transportar estados intermedios y dividir el intervalo; reproducir el intervalo completo y adelantar eventos contra su estado final; o distinguir primero los eventos que ya coinciden exactamente con el extremo confirmado. La segunda rompe causalidad y se descarta. La primera sigue siendo necesaria para eventos interiores y requiere un contrato de transporte propio. Se integra la tercera, que reutiliza la publicación acumulada existente y no añade snapshots ni mensajes por tick.

El stream permite que continúe la certificación visual cuando todos los eventos tienen `simulationTime` exactamente igual al extremo, y el diario v2 contiene únicamente sus referencias, en el mismo orden y con ese tiempo. Cualquier evento interior, settlement, invalidación o hecho adicional mantiene la barrera. Esto no autoriza movimiento por sí solo: física, separación, cambios de mundo, poses, efectos y terreno conservan sus certificados. La entrega se realiza una sola vez mediante el commit original, con el estado final y el reloj ya aplicados.

Validación: 51 pruebas de stream, reloj, grupo histórico y eventos de autoridad. La captura real de manglares distingue el evento final de un avance de 0,02 s frente al evento interior de uno de 0,1 s, sin adelantar estado ni notificaciones. El primer caso todavía carece de separación completa entre cuerpos y permanece rechazado por esa barrera. Una prueba del pump con reloj controlado verifica la espera hasta el extremo antes de entregar el evento. No se han cambiado el tamaño de las publicaciones ni los ticks del juego para producir ese caso de prueba.

## Bloqueos que todavía no están resueltos

1. Eventos **interiores** de trayectorias: los receptores aplican el estado final antes de notificar; hacen falta límites intermedios autoritativos o una representación equivalente que conserve todas las dependencias. El caso de eventos exactamente finales está implementado arriba. No basta con quitar la barrera `events` general ni entregar antes un daño con estado posterior.
2. Física activa y mezcla de participantes: el reloj histórico es global. Excluir cuerpos problemáticos congelándolos hasta el final provocaría saltos. Hay que conservar pose, trayectoria, tiempo y contactos de todos los participantes; siguen vigentes los fallbacks actuales.
3. Recuperación gráfica: todavía requiere validación completa con dispositivo, física y terreno reales. La saturación o pérdida de una base no puede resolverse descartando eventos.
4. Admisiones del resto de subsistemas: revisar sus ciclos con el mismo criterio de propietario, generación y transición, sin trasladar esos arreglos a las recetas de contenido.

El cierre técnico requiere que cada mecánica tenga pruebas de carga retenida, sustitución durante admisión, cancelación, fallo persistente, retirada del actor, pausa y recuperación, además de su conexión en producto. Los pendientes anteriores permanecen a cargo de infraestructura; no se convierten en requisitos de implementación del agente de contenido.

## Prerrequisitos descubiertos en WebGPU real

La prueba de cierre se ejecuta con Edge y WebGPU, sin forzar SwiftShader. Detectó límites y carreras que las pruebas con renderer simulado no exponían:

- Los canales estáticos del puente de cultivos excedían los ocho buffers de vértices admitidos por el dispositivo. Se intercalan los canales Float32 antes de la admisión, conservando sus valores y dejando separados los atributos dinámicos y de instancia.
- Los actores ocultos por falta de terreno intentaban instalar movimiento GPU. Ahora esperan a que el soporte permita hacer visible el rig y reintentan sobre el mismo actor.
- Los certificados de admisión quedaban obsoletos al efectuar la propia inserción prevista en la escena. El ticket distingue esa inserción concreta de un cambio de dueño, jerarquía interna, material o geometría; las comprobaciones ordinarias siguen siendo estrictas.
- Una única URI para todas las imágenes provisionales aliasaba color y normales dentro de GLTFLoader. Cada imagen provisional tiene identidad propia. Las texturas de datos KTX2 lineales se normalizan antes de la admisión, sin modificar mapas de color ni relajar el contrato de sustitución.

La instrumentación expone cola, compilación activa, esperas de sombras y estado de terreno/timeline. La ejecución real ya publica el primer terreno y consume estados confirmados; ha descubierto otro exceso de buffers todavía en investigación. Esto no certifica recuperación gráfica ni cierra los eventos interiores o la física histórica.

Pruebas dirigidas: 102 de admisión/publicación, geometría y actores ocultos; 107 de texturas y rosters. Los recuentos se solapan y no se presentan como una suma de pruebas únicas.

El segundo exceso de buffers estaba localizado en el árbol cercano: posición, normal, dos UV y cinco canales de instancia sumaban nueve buffers. Se intercalan únicamente sus canales Float32 estáticos en la geometría propia del lote cercano. Los atributos de instancia y las geometrías compartidas del resto de vegetación conservan su disposición. La prueba de cambio a textura cercana se ejecuta ahora con ambos contratos de instancia y comprueba el límite de ocho buffers: 92 pruebas dirigidas pasan. La traza del error conserva los nombres de atributos y materiales para identificar futuros incumplimientos.

La transición de carga confundía el plazo de confirmación de un fotograma con el de preparación del terreno. En la prueba real, el terreno seguía compilándose correctamente cuando vencían los 30 segundos. Se separa `terrainTimeoutMs` y la carga normal concede hasta cinco minutos para esa preparación, conservando cancelación, errores y el plazo corto para confirmar la cámara. Esto evita un aborto prematuro; no es una mejora de tiempos de carga. Diez pruebas de transición y pausa autoritativa pasan.
