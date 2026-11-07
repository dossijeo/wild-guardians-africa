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

## Bloqueos que todavía no están resueltos

1. Eventos dentro de trayectorias: los receptores aplican el estado final antes de notificar; hacen falta límites intermedios autoritativos o una representación equivalente que conserve todas las dependencias. No basta con quitar la barrera `events` ni entregar antes un daño con estado posterior.
2. Física activa y mezcla de participantes: el reloj histórico es global. Excluir cuerpos problemáticos congelándolos hasta el final provocaría saltos. Hay que conservar pose, trayectoria, tiempo y contactos de todos los participantes; siguen vigentes los fallbacks actuales.
3. Recuperación gráfica: todavía requiere validación completa con dispositivo, física y terreno reales. La saturación o pérdida de una base no puede resolverse descartando eventos.
4. Admisiones del resto de subsistemas: revisar sus ciclos con el mismo criterio de propietario, generación y transición, sin trasladar esos arreglos a las recetas de contenido.

El cierre técnico requiere que cada mecánica tenga pruebas de carga retenida, sustitución durante admisión, cancelación, fallo persistente, retirada del actor, pausa y recuperación, además de su conexión en producto. Los pendientes anteriores permanecen a cargo de infraestructura; no se convierten en requisitos de implementación del agente de contenido.
