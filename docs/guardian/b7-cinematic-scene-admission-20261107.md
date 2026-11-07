# Admisión de escenas de lápiz en WebGPU

El Worker confirma la preparación de cada escena después de cargar sus imágenes y crear sus recursos. El puente conserva solamente el último fotograma solicitado y lo envía al recibir esa confirmación, incluso si la animación se ha detenido mientras se preparaba. Las confirmaciones de escenas anteriores no admiten una escena nueva; si el efecto ya terminó, la ilustración original sigue visible.

Esto evita solicitar reiteradamente fotogramas que el Worker todavía no puede dibujar. La prueba de contrato cubre versiones obsoletas, solicitudes acumuladas y finalización durante la carga. No valida el resultado visual ni acredita mejora de rendimiento en una cinemática real; ambas comprobaciones corresponden a la fase C. El Worker de lápiz mantiene actualmente su propio dispositivo y recursos, separados del renderizador del mundo.

La recepción tardía del manifiesto ya no inicia recursos de una cinemática cancelada o destruida, y un fotograma de apertura pendiente no modifica una cinemática posterior. Las pruebas cubren estas carreras con respuestas simuladas; queda pendiente la validación del flujo completo en navegador.
