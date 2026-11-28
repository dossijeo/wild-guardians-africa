# Reserva para checkpoint visual diferido

Un gesto provisional del guardián no puede formar parte de un checkpoint confirmado. Si el checkpoint se aplaza mientras la orden Attack sigue en cola, bloquear el host en el watermark blando impide que la propia orden se confirme o rechace y resuelva el gesto.

En el perfil histórico recuperable, cuando existe una base válida y el checkpoint está diferido, el canal permite usar la reserva entre el watermark y la capacidad, conservando todas las publicaciones y órdenes en su orden. Se reservan dos entradas para el siguiente par de terreno y publicación, y no se utiliza la reserva si se alcanza el watermark de bytes, hay fallo de codificador o existe terreno sin publicación. No se solicita un snapshot adicional ni se incluye el gesto provisional en un checkpoint.

Si se agota la reserva se detiene la admisión y la captura de tiempo real, conservando los pasos aceptados, y se comunica un error de presentación. Cuando vuelve a haber un checkpoint disponible se reancla el reloj y continúa la cola. Esta reserva es finita: no garantiza que una cola arbitrariamente larga llegue a la orden que resuelve el gesto. La capacidad y comprobaciones de bytes del journal siguen vigentes.

Cada ejecución de la autoridad confirma como máximo un lote de terreno y una publicación; el journal rechaza un segundo lote de la misma secuencia. El tamaño del siguiente resultado no se conoce antes de ejecutarlo: un resultado extraordinario puede superar la capacidad restante en bytes y producir un fallo explícito de recuperación, sin afirmar que la reserva lo evita.

Un canal con confirmación de recepción pero sin journal conserva la barrera de admisión de un checkpoint hasta su aplicación: no dispone de historial que permita adelantar publicaciones de forma recuperable. Con journal íntegro se mantiene la admisión acotada existente durante el ACK pendiente; la reserva descrita arriba solo se usa cuando el checkpoint fue explícitamente diferido.

En la prueba real WebGPU de manglares con objetivo indicado por ID, Attack llegó a confirmarse y el diario renovó su base hasta la secuencia 854; la evidencia final registra 27 entradas hasta la secuencia 881 y ausencia de saturación. La reproducción histórica de una física Rapier aislada superó su comprobación de huesos. La prueba combinada no se completó: no se observaron sublímites históricos de eventos. Tampoco se probaron el rechazo de Attack en hardware ni la selección por píxel. Véase [la evidencia compacta](b-close-20261107/historical-physical.json).
