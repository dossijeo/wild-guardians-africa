# QA-151 — fallo real de compilación WebGL

El fixture importa la aplicación, menú y selector reales. Añade `#error` una sola vez al código enviado a un vertex shader del canvas `world`; el resultado se lee del compilador WebGL real, sin falsificar `COMPILE_STATUS` ni mensajes de arranque.

`failed.json` registra `compiled=false` y el log del compilador, un aviso nativo de recuperación, regreso al menú, cero canvas de mundo vivos y ninguna ranura nueva. La ranura de QA anterior permanece byte por byte idéntica. No se ejecuta el inicio simulado del selector.

`retry.json` acredita el siguiente inicio, sin inyección: un mundo real, una ranura adicional con 1000 monedas y hora interna cero, introducción/lectura pausadas. La ranura anterior continúa intacta. Se inspeccionó la captura del mundo cargado y no hay errores del control QA.

La aplicación ahora dibuja una primera pasada antes de crear el controlador de tutorial y guardar, y espera también los poblados adicionales de partidas cargadas. `WorldScene` convierte el fallo de enlace de Three en un error de carga recuperable, conserva el diagnóstico técnico y no confunde advertencias del compilador con errores. Un fallo durante la ejecución pausa la simulación y detiene los frames del mundo fallido; el menú sigue accesible. El aviso tiene traducción inglesa en el catálogo bilingüe. Commit `1b01c4e`.

Pasan 13 pruebas dirigidas de guardia de shader, liberación y localización; build y paquete web correctos (575 archivos, 813 rutas relativas y 20 GLB comprimidos). Esto no acredita toda la CI: dos campañas activas están en investigación tras su resultado de derrota. QA-151 permanece parcial por la comprobación integrada pendiente de audio sin permiso inicial.

Reproducir: `/tests/browser/shader-retry.html`, marcar la inyección, navegar a cultura y activar el inicio original con el botón del fixture. Repetir sin inyección.
