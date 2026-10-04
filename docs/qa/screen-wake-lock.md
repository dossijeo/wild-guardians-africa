# Pantalla activa durante el juego

Petición del usuario del 4 de octubre de 2026. Se usa el controlador `GameScreenWakeLock` con la API nativa Screen Wake Lock; se activa al comenzar la carga de una partida nueva o guardada, se conserva durante pausas y contratación y se libera al abandonar el mundo o cerrar la página. Al volver a una pestaña visible se solicita otra vez. No se añade trabajo por fotograma ni vídeo oculto.

Seis pruebas automatizadas cubren coalescencia, liberación, visibilidad, concesión tardía, concesiones superpuestas, denegación, ausencia de API y retirada por el sistema. La denegación permite continuar jugando; una interacción posterior puede volver a solicitarla sin bucle automático.

Prueba nativa del controlador de producción en `tests/browser/screen-wake-lock.html`, navegador integrado, localhost seguro: petición real `screen`, 1 concesión, estado activo y retenido, 0 errores. Al pulsar volver al menú: 1 liberación, controlador inactivo y bloqueo no retenido. Esta prueba acredita la concesión y liberación reales de la API, no una medición del temporizador físico de pantalla en un teléfono. El ciclo ocultar/volver y las carreras asíncronas están comprobados con eventos controlados en los tests; no se presenta el navegador integrado como prueba de suspensión física móvil.

La plataforma puede denegar o retirar el bloqueo. En un iframe externo se necesita que su contenedor permita esta capacidad; no puede imponerse desde el juego una política del sitio anfitrión. Referencia: [W3C Screen Wake Lock](https://www.w3.org/TR/screen-wake-lock/).
