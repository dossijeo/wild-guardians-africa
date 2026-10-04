# Incursión fuera de cámara y pantalla encendida

Revisión del 4 de octubre de 2026, sobre main. Incidencia comunicada por el jugador en Gran cañón.

La simulación avanzaba sin comprobar que el grupo de un animal tuviera su GLB adjunto. Los modelos se pedían cuando aparecía la incursión; un error de descarga dejaba una promesa rechazada en la caché y un grupo vacío sin reintento. Ahora se prepara la especie introductoria durante la carga y las especies de la noche en cuanto existe el plan nocturno. Si todavía falta un rig de la incursión, el reloj de juego espera y aparece un indicador temporal de carga. No se cambia el presupuesto de golpes ni el daño. La carga por especie evita descargar los cinco GLB al abrir una partida nueva.

Antes de publicar el rig se aplican su pose, matrices y esfera de visibilidad. Una respuesta tardía no puede adjuntarse a otra escena ni a un grupo que haya sustituido al original. Los errores transitorios se reintentan con espera creciente; los modelos preparados y nunca utilizados también liberan sus recursos al salir.

Los SFX del animal tenían atenuación fijada a la distancia de la cámara al comenzar el clip. Ahora esa atenuación sigue la cámara durante el sonido, sin repetirlo. Se anticipa la decodificación de los cuatro sonidos de las especies previstas. Las guardas contra reproducción de ataques antiguos permanecen activas.

El bloqueo de pantalla se mantiene mientras la aplicación está abierta, también en el menú. Se vuelve a solicitar tras una liberación del sistema o al regresar a una pestaña visible. Cuando la API falta o rechaza la solicitud, se utiliza un MP4 propio de 16×16, 1 fps, dos segundos, sin pista de audio, 1514 bytes, con ruta resuelta mediante assetUrl. Solo se reproduce esa alternativa cuando no se puede usar el bloqueo nativo. Los eventos de toque, clic y teclado permiten reintentar si la reproducción necesita un gesto.

Pruebas: 78 casos de carga de actores, animaciones nativas de las cinco especies, audio, liberación de recursos, idiomas y bloqueo de pantalla. Build y comprobación del paquete web correctos. La prueba de navegador tests/browser/raid-camera-return.html usa terreno original de Gran cañón / Mapungubwe, centro pagado, spawnRaid y recorrido de la simulación; coloca deliberadamente el reloj en la noche y avanza iteraciones controladas hasta el primer ataque con la cámara alejada. El contador heldFrames es de iteraciones de esa preparación, no una medición de FPS ni de segundos de carga. Esta preparación acredita el contrato de espera y el regreso visible; no establece que una descarga lenta sea la única causa del caso observado en el teléfono.

Capturas y JSON en mobile-first-day/raid-camera-return-*.png/json. El bloqueo nativo fue concedido, liberado y concedido otra vez sin un segundo toque: screen-awake-reacquired.png/json. La reproducción real de la alternativa sin API quedó registrada en screen-awake-video-fallback.png/json. No se acredita todavía el tiempo de suspensión física de un teléfono ni la mezcla perceptiva de sus altavoces.

Referencias de plataforma: [Screen Wake Lock API](https://www.w3.org/TR/screen-wake-lock/) y [alternativa de vídeo de NoSleep](https://github.com/richtr/NoSleep.js/blob/master/src/index.js). No se incorpora su código ni una dependencia nueva.
