# Minimización y restauración nativas

La comprobación añadida al workflow Windows ejecuta el EXE empaquetado con un slot preparado mediante la simulación normal: Gran cañón/Mapungubwe, centro pagado, yuca de 12 monedas, trabajadora joven de 40 y primera incursión nativa. Se lanza el escudo legalmente, con duración 20 y recarga 90. La guía se omite para aislar esta prueba; no se alteran dinero, reloj, crecimiento, RNG ni daño.

El binario admite cargar este fixture y minimizar/restaurar su ventana únicamente con `--smoke-report`. Se utilizan [las operaciones nativas de WebviewWindow](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindow.html), sin redefinir document.hidden ni fabricar visibilitychange. La restauración se programa en un hilo nativo a los ocho segundos, independiente de los temporizadores del documento oculto.

La prueba exige avance antes de minimizar y eventos reales hidden/visible. Durante 3,5 segundos ocultos cierra el menú, dejando hidden como único bloqueo. Compara reloj, RNG, economía, cultivos, trabajadores, tareas, construcciones, cajas, incursión, planes y magias mediante snapshots obtenidos con los botones reales de guardar. Al finalizar el intervalo mantiene el menú abierto: la restauración debe retirar hidden y conservar menu sin avanzar. Después de continuar exige avance limitado al tiempo visible, sin recuperar el tiempo oculto.

Guardar genera avisos intencionadamente; savedAt, mensajes, presentación del tutorial y sus contadores no forman parte de esa comparación. La prueba está silenciada y no acredita recuperación perceptual del audio, teléfono físico, ocultación de varios minutos ni toda QA-014.

Estado inicial: cuatro pruebas de dominio/restauración y la sintaxis de smoke.js pasan localmente. La compilación Rust y la transición real de WebView2 están pendientes de ejecutar en GitHub Actions; QA-014 continúa parcial hasta revisar su informe `desktop-visibility.json`. No se considera probado el comportamiento nativo por aprobar la prueba de dominio.
