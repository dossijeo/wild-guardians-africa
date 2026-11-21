# Infraestructura y responsabilidades de la migración B

## Contratos de producto

Los contenidos de B utilizan los propietarios existentes. No deben implementar otro protocolo de recuperación, reloj, transporte, colisiones o propiedad de pose.

| Asunto | Implementación | Ruta conservadora |
| --- | --- | --- |
| Configuración conjunta | `webGpuInfrastructureProfile` define una misma política al preparar la autoridad y al conectar la presentación. En WebGPU activa recuperación histórica, eventos interiores e impostores lejanos por defecto, también en producción. | Cada opción tiene reversión explícita. Desactivar recuperación desactiva eventos interiores; pedir estos explícitamente sin recuperación es un error. La selección del backend no cambia. |
| Física y transiciones | El certificado v2 admite varios cuerpos Rapier con envolventes de intervalo mutuamente separadas. Cada actor consume sus propias muestras confirmadas, con instalación y retirada atómicas. Sigue aceptándose el certificado v1. | Contactos entre cuerpos, pasos de otros actores por sus envolventes, puertas, cambios de rig/lifecycle, impactos provisionales, recuperación y física baked sin certificado siguen la presentación ordinaria de límites confirmados. No se inventan poses ni se simula física en la presentación. |
| VFX sin normales | Los billboards desactivan la rama de iluminación de escena redundante de BasicNodeMaterial. Su output TSL conserva iluminación propia y luces locales. | No se añaden normales falsas, no se elimina iluminación artística y no se cambia el tratamiento final del color. |

El soporte de física no significa interpolación articular universal: se reproducen discretamente poses Rapier ya resueltas. Las excepciones siguen siendo funcionalidades soportadas por la vía confirmada, no tareas pendientes para el agente de contenido. La mejora de fluidez de esos casos puede estudiarse después.

La recuperación conserva el diario completo aunque alcance su umbral preventivo: solo se rechaza por pérdida de integridad o exceso de capacidad real. La activación observa avances de autoridad y ACKs, con 120 segundos sin progreso y 600 segundos de límite total. Durante la activación, el canal nuevo ya conectado puede renovar checkpoints al drenar comandos pendientes; mantener la prohibición de renovación propia del replay bloqueaba el diario en su umbral. El relevo de superficie y su RPC admiten esa misma operación; ya no abandonan una reconstrucción saludable a los 8–20 segundos.

El bloqueo de entrada durante la sustitución también se respeta en los sincronizadores automáticos de tutorial y navegación. El autoguardado conserva las solicitudes pendientes y las despacha una vez publicada la superficie; no pierde eventos ni insiste contra un runtime bloqueado. Los finales de voz automáticos conservan la identidad del mensaje durante el bloqueo; se entregan al reanudar y solo solicitan guardado tras aceptación de la autoridad.

## Activación y reversión

Seleccionar `VITE_PRESENTATION_BACKEND=webgpu-worker` es suficiente. No se necesitan parámetros QA para activar estos contratos. La misma configuración se usa al arrancar, conectar y reconstruir el Worker gráfico.

Para comparar con la ruta anterior se pueden fijar, antes de arrancar Vite o compilar:

- `VITE_HISTORICAL_EVENT_BOUNDARIES=false`: eventos por límite confirmado ordinario.
- `VITE_WEBGPU_FAR_VISUAL=false`: desactivar las consultas de impostores lejanos.
- `VITE_HISTORICAL_PRESENTATION_RECOVERY=false`: desactivar el perfil histórico y sus eventos interiores. No combinarlo con eventos explícitamente activados.

Una variable vacía equivale al valor predeterminado. Los valores distintos de true/false/vacío se rechazan para evitar discrepancias silenciosas. El backend legacy conserva sus opciones desactivadas.

## Responsabilidades de contenido

| Área | Infraestructura que se reutiliza |
| --- | --- |
| B1 terreno, agua e iluminación | Surface, residencia temporal, revisiones confirmadas, admisión y pases. |
| B2 vegetación y LOD | Coordinador de chunks, generaciones, cancelación, relevo de LOD y reconstrucción tras pérdida de dispositivo. |
| B3 cultivos y construcción | Previews por ID, bancos progresivos, confirmación, rechazo y destrucción. Las colisiones provisionales no son autoritativas. |
| B4 trabajadores y bestias | Rosters, bancos compartidos, reloj y certificados; movimiento y propiedad de pose; fallback confirmado para excepciones. |
| B5 guardián y combate | Feedback provisional, validación de objetivos en autoridad, orden causal y transferencia de pose. |
| B6 efectos y destrucción | Diario, admisión, dependencias de terreno, iluminación de sprites y recuperación. |
| B7 tutorial, cinemáticas y guardado | Tiempo de simulación, pausas, cancelación y restauración. |

El trabajo de contenido comprende modelos, texturas, recetas TSL, clips, parámetros artísticos y conexión con estos propietarios. No hay que replicar protocolos por especie, animación o efecto.

## Evidencia y límites

Los tres asuntos de esta entrega están implementados y comprobados. Véase el [cierre del 8 de noviembre](b-infrastructure-product-20261108/README.md), que incluye recuperación real hasta publicación visible y desbloqueo, Attack, contratos y build. El agente de contenido puede continuar sin implementar estas piezas de infraestructura.

La evidencia del cierre previo sigue disponible en [cierre anterior](b-close-20261107/README.md), [eventos interiores](historical-interior-events-contract.md), [muestras físicas](historical-physics-samples-20261107.md) y [recuperación](temporal-recovery-contract.md). Aquellas pruebas usaban activación explícita y un único cuerpo físico; no describen los valores predeterminados actuales.

Las nuevas pruebas cubren separación de varios cuerpos, interferencia con un segundo cuerpo o puerta, lifecycle, reversión de instalación parcial, reparto de muestras y salida física → recuperación → locomoción por límites confirmados sin retener la cola. También cubren igualdad de configuración al iniciar y conectar, reversión, y compilación WGSL de VFX sin normales bajo iluminación activa.

El cierre de infraestructura no certifica toda la paridad artística de B, campañas prolongadas ni rendimiento global. La migración de contenidos y su validación visual siguen correspondiendo a B/C.
