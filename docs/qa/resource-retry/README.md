# QA-151 — recursos ausentes y reintento de entrada

Entrada real de `app/main.js` con menú y selector originales, Sabana/Mapungubwe. El fixture intercepta exclusivamente un fetch del mundo padre con HTTP404, una sola vez. No fabrica mensajes de inicio ni llama a una función privada de arranque: se activa el handler original del botón nativo. El arranque de demostración queda cancelado.

| Intento | Recurso ausente | Canvas vivos al terminar | Ranuras |
| --- | --- | ---: | ---: |
| 1 | Catálogo `/content/skies.json` | 0 | 0 |
| 2 | Binario del terreno | 0 | 0 |
| 3 | Primer GLB del mundo, versión web comprimida | 0 | 0 |
| 4 | Ninguno: reintento normal | 1 | 1 |

Los tres fallos regresan al menú original. Se observó el aviso nativo «No se pudo cargar /content/skies.json». Los informes y capturas posteriores prueban salida del estado de carga y ausencia de mundo/ranura parcial; los avisos transitorios de los otros dos casos no quedaron capturados antes de desaparecer.

El reintento carga el poblado, paisaje, HUD y narrador reales. Se crea exactamente una ranura con 1000 monedas, hora interna cero y pausas de introducción/lectura; ninguna ejecución de demostración. La consola registra cero errores o advertencias. El registro del fixture conserva un error de **operación QA** («Reach the culture step first»): se intentó activar su control antes de acabar la transición del selector. Ese intento no envió un inicio, no creó canvas ni activó la inyección; los cuatro intentos efectivos tienen una sola activación nativa cada uno. No se oculta ese registro.

`WorldScene.dispose()` ahora retira sus cinco listeners de canvas mediante AbortController y evita repetir la liberación. La liberación del material de suelo ausente ya estaba protegida; no se atribuye a este cambio la recuperación de carga que ya existía. Dos pruebas CPU ejercitan el método real en estado parcial/completo, eventos posteriores a la liberación y doble dispose; con calidad/streaming pasan 15/15. El build y el paquete web también pasan (575 archivos, 813 enlaces relativos y 20 GLB comprimidos).

QA-151 permanece **parcial**: faltan denegación real de desbloqueo de audio y fallo controlado de compilación de shader. QA-150 también sigue parcial: estos fallos y un reintento no sustituyen los ciclos completos menú/partida con inspección de WebGL, timers y audio. El fixture retiene intencionalmente referencias a canvas eliminados para contarlos; no es un contador de memoria del juego.

Reproducir: `/tests/browser/resource-retry.html`, seleccionar recurso y marcar la inyección, navegar Juego nuevo → bioma → cultura, esperar a que termine la transición y activar el control QA de inicio. Después repetir sin inyección.
