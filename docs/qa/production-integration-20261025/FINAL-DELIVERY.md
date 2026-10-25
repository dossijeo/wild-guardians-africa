# Entrega: integración, menú y microeventos

## 1. Integración gráfica y arquitectónica

PR159 MERGED el 25/10/2026 15:12:12Z; commit 568f3b8efbaa1917c91963851e6867621aecd957, confirmado nuevamente mediante GitHub. MERGE-GATES.md documenta CI Validate y Windows, pruebas nativas, auditorías y limitaciones. Se preservaron cambios locales heredados. No se restauraron hojas redondas: Manglares conserva helechos holly/LOD, suelo 512, musgo/barro y agua azul. Los cambios posteriores de menú y microeventos no modifican renderer del mundo, simulación o navegación.

## 2. Menú por capas

Dos capas ilustradas con parallax, tótem y luces/partículas originales, acercamiento y regreso conservados. MENU-PREPARATION.md identifica arquitectura y assets; MENU-PERFORMANCE.md recoge ABAB; MENU-SUBTITLE.md la corrección de legibilidad.

Capturas: menu-subtitle/desktop.png y mobile.png. Vídeo: menu-validation/wide-journey.webm. Rutas funcionales y controles en 1280×720, 390×844 y 1920×810; nueva partida Manglares, guardar, salir y continuar en paquete anidado (menu-layered-game-lifecycle.json). 12 pruebas de integración/generación pasan.

Coste adicional medido: aproximadamente 0.25–0.34 ms GPU residente y 0.61 ms en recorrido de calidad baja; no coste cero. Perfil bajo mantiene límite de 30 fps. En vertical se recorta el primer plano ilustrado para conservar controles. Los 404 de desarrollo corresponden al favicon, no a assets del menú.

## 3. Microeventos

40 tipos completan gestos sin fallback en el renderer real; 84 tests pasan. Inspección del catálogo y casos de día/noche, cámara y ciclo de vida. Mariposas con alas naranjas más legibles, sin cambiar geometría, tamaño, reglas ni número de instancias. El candidato alternativo de fuego se descarta y conserva como evidencia negativa.

Prueba normal desde Continuar: espera incursión/tutorial, contrata y planta mediante HUD, aparece polen espontáneamente. Salir libera controlador/malla; continuar crea otro sin conservar el anterior. microevents-normal/report.json y spawn.png/restarted.png. Observación de tick en Vite, sin flags QA ni force; la fixture guardada sí se introduce en localStorage.

Órbita y rueda reales: deriva mundial cero con evento congelado; después expiración natural y cero instancias. microevents-camera/report.json y camera.webm. Oclusión/interacción, origen flotante y liberación cubiertos por tests; márgenes de suelo de cuatro tipos medidos en una fixture. No es una demostración exhaustiva en cada pendiente, semilla y cámara.

CPU controlador ~0.29–0.30 ms, P95 ~0.47–0.61 ms. GPU ABBA completa de escena 16.365/16.743/16.040/18.174 ms: la deriva impide atribuir una diferencia consistente al evento. Las pruebas residentes no garantizan ausencia de tirones en streaming. MICROEVENTS-VALIDATION.md conserva protocolos, resultados y ensayos negativos.

## Distribución y revisión

Build actual y test:web-package pasan: 1001 archivos, 840 enlaces, 17 GLB. El menú y mejoras posteriores están publicados en codex/global-visual-lab para revisión; la fusión confirmada de main corresponde a PR159, no a estos cambios posteriores. Los informes históricos se conservan, pero sus variantes descartadas no representan la selección vigente.

Los nuevos mockups de iluminación/DOF quedan como investigación posterior separada, sin modificaciones en esta entrega.
