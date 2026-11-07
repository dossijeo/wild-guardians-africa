# Continuación de movimiento dentro de una publicación

La prueba WebGPU del 7 de noviembre admitió una publicación de la incursión nativa de manglares y entregó su primer evento en 22,39 s. El siguiente tramo quedó retenido y, tras cinco segundos, se reconstruyó la presentación. Una recuperación correcta no acredita que se haya reproducido ese intervalo completo.

La causa contractual está en la identidad del movimiento. Los subtramos de eventos conservan la misma secuencia exterior, mientras que el buffer de movimiento solo aceptaba una secuencia estrictamente mayor. Al acabar el primer tramo, reset eliminaba los datos visibles pero conservaba la versión consumida; instalar el siguiente tramo se rechazaba como obsoleto. Las pruebas con participantes simulados no reproducían esa validación del buffer GPU real.

La corrección concede una continuación únicamente al terminar un subtramo en su extremo confirmado. La siguiente instalación debe mantener la publicación, el reloj activo y el punto de unión; no permite repetir libremente versiones. El final exterior y la cancelación ordinaria revocan ese permiso. Si la instalación coordinada de otro participante falla antes de avanzar el reloj, el rollback recupera el permiso para reintentar la misma admisión. El ACK exterior y el orden de eventos permanecen sin cambios.

La evidencia anterior está en [captura compacta](b-close-20261107/event-continuation-block.json) y [registro completo comprimido](b-close-20261107/event-continuation-block-full.json.gz). La validación final se registra en el inventario de cierre; este documento explica el fallo y el contrato, no certifica por sí solo la ejecución en hardware.

La extensión por quietud permite movimiento → parada → movimiento únicamente con un participante inmóvil certificado y continuidad exacta del punto de apoyo. Se comprueba con el buffer de movimiento GPU y el roster reales en pruebas CPU. Dos ejecuciones de la incursión WebGPU completaron cuatro eventos y dos sublímites; la última usa esta implementación final. [Evidencia](b-close-20261107/historical-events.json).
