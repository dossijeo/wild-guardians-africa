# Menú por capas: primer A/B/A/B

Intel UHD 0x9A60, Chrome/ANGLE D3D11, 1280×720, 30 draws de calentamiento y 150 muestras por pasada, sin grabación de vídeo. Timer queries GPU válidas, sin disjoint. Referencia: menú del merge 568f3b8ef; candidato: 0c860b005. Herramienta: measure-menu-layered.mjs. Sustitución QA del JavaScript y adaptación idéntica de reconocimiento de rutas relativas en ambas variantes; el primer intento falló por omitir la transformación de rutas de Vite y no produjo muestras válidas.

| Pasada | CPU draw media ms | GPU draw media ms | Intervalo draw P95 ms |
|---|---:|---:|---:|
| A1 original | 0,282 | 3,268 | 17,69 |
| B1 capas | 0,269 | 3,610 | 17,46 |
| A2 original | 0,288 | 3,974 | 17,71 |
| B2 capas | 0,306 | 4,225 | 17,23 |

Hay deriva apreciable entre repeticiones. Diferencia GPU por pareja +0,34/+0,25 ms; no afirmar equivalencia de coste ni mejora de GPU. La cadencia de dibujo permanece alrededor de 16,62 ms y P95 no empeora en estas muestras. No es latencia física de presentación ni prueba de transición/carga. El coste adicional parece moderado para la mejora visual; faltan mediciones de transición y perfil bajo antes de cerrar.

Build y test:web-package aprobados (1001 archivos). Paquete en ruta anidada arranca. Prueba funcional en 1280×720,390×844,1920×810: opciones y regreso completados, cinco controles visibles. Los avisos 404 localizados son únicamente /favicon.ico del servidor de desarrollo; no hay texturas ausentes. Capturas y vídeos en menu-validation. Falta revisión final de vídeo y otras rutas de menú.
