# Jardín de carga: contacto y composición

Dirección artística: los dos mockups diurno/nocturno entregados por el usuario. Se conservan el maíz original, sus posiciones, la interacción y el marco existente.

## Comparación real

| Variante | Cambio | Draws completos | Triángulos |
| --- | --- | ---: | ---: |
| base | Atmósfera del pase anterior, interfaz real | 6 | 16050 |
| contact | Oclusión analítica suave bajo las raíces | 6 | 16050 |
| garden | Contacto, una montaña con bordes suaves, desaparición nocturna, foco nocturno 2.3 en vez de 3, bruma más cálida/azul | 6 | 16002 |

Capturas `*-day-ui.png` y `*-night-ui.png` incluyen la interfaz HTML real. PNG sin sufijo ui contienen el render. Semilla 712, resolución 1280×720, progreso 75 %, cuatro plantas, cámara (4.8,3.1,6.4), tiempos 150/350; reducedMotion activado. Contadores acumulados durante todas las llamadas del diorama, incluido cielo y bruma. No equivalen a coste GPU; garden dibuja 48 triángulos menos por su composición, no se presenta como optimización.

La noche de garden se acerca más a la referencia: fondo despejado y foco menos intenso. De día, la montaña compite menos con las plantas. La oclusión de contacto mejora sutilmente el apoyo, pero no genera las sombras direccionales de hojas visibles en el mockup. No considerar alcanzada la calidad final. La primera montaña aislada mostró bordes duros; la candidata guardada incorpora transición lateral por UV.

## Arquitectura y validación

QA solamente, sin cambios al renderer de producción. Contacto: reutiliza el draw del suelo; máximo 18 centros, bucle con salida al número activo (4 en estas capturas), ninguna textura adicional. Las posiciones se actualizan al plantar, no por fotograma. Es oclusión aproximada permanente, no shadow map ni sombra solar.

Prueba con clic real del navegador: cuatro a cinco plantas, cinco raíces sincronizadas; el progreso accesible sigue en 75 y el botón Cancelar invoca su callback. La captura vertical 390×844 muestra texto legible, pero la quinta planta queda parcialmente cortada en el borde derecho: queda pendiente ajustar el encuadre vertical. No se prueba cancelación de la carga completa ni dispositivos táctiles físicos.

Sin errores JS, de consola o WebGL en la última ejecución garden. Los intentos iniciales del harness requirieron cargar el cache completo de marcos y corregir una importación dinámica; no eran fallos del juego. No se han medido GPU/CPU, tiempos reales de carga, movimiento de cámara ni todos los estados de crecimiento. No promover todavía a configuración final.

## Reproducción

Vite en 5190. Ejecutar `node tools/experiments/capture-loading-contact-20261021.mjs` con `WG_LOADING_VARIANT=base`, `contact` o `garden`. La herramienta reemplaza las capturas de esa variante. Usa LoadingDiorama y LoadingOverlay reales después de preparar una partida, con simulación pausada; no representa el tiempo de arranque del juego.
