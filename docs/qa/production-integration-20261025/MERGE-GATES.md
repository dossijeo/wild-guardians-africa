# Cierre de integración antes de fusionar

Estado: FUSIONADO el 2026-10-25T15:12:12Z. PR #159; merge 568f3b8efbaa1917c91963851e6867621aecd957. Validate40201376759 y Windows40201376747 finalizaron SUCCESS para ee5fb4ceb. Código runtime evaluado: 67c38ea84; hasta ee5fb4ceb solo cambian evidencias e inventario SFX (hash de scene.js), sin cambios de ejecución.

| Control | Evidencia y alcance |
|---|---|
| Selección artística de seis biomas | Perfil approved-visual-profile; RUNTIME-PROFILE.md, capturas de paquete diurnas y NIGHT-PACKAGE-MATRIX.json. Manglares holly-fronds + LOD + fixed512. Las hojas redondas históricas no son referencia final. |
| Ruta normal de distribución | Seis arranques desde menú, paquete bajo ruta anidada sin flags gráficos; pruebas de guardado/recarga y cancelación/reinicio. Fixtures nocturnas importadas por la ruta de guardado, sin interceptar renderer. |
| Pthreads y fallback | Paquete aislado crea spatial-threaded; paquete sin aislamiento carga por fallback. NATIVE-AUDIT.md: revisiones/cancelación/publicación/rutas y residencia. |
| Contexto gráfico | package-mangrove-context y pan-context: pérdida/restauración real, capturas de cobertura, cero errores/404. No prueba de fugas ilimitadas. |
| Streaming, cámara y calidad | PRODUCTION-ACTIVE-MATRIX: seis biomas, simulación activa, 240 frames y 15 chunks por recorrido. ACTIVE-QUALITY-INTEGRATION contiene A/B/A/B y límites. |
| GPU/CPU/presentación | GPU-PROFILE-COMPARISON en Intel UHD y matriz residente histórica de 48 pasadas. Streaming GPU ~26 ms y picos de presentación ~100 ms en Manglares: no prometer 60 FPS ni ausencia de tirones. |
| Correctitud funcional | full-tests-native-env: 4922/4922, cero skips, servicios WASM activados. No cambios en src/simulation ni src/persistence frente a main. |
| Distribución local | Build Vite, verificación web (999 archivos), ZIP itch.io con CRC, NSIS 403,13 MiB. Smoke WebView2 Manglares: carga 28,6 s, guardado, 300 s minimizado y restauración. |
| Auditoría heredada | NATIVE-AUDIT y RENDERER-AUDIT; culling/rangos parciales/sombras independientes conservados. Cañón abierto opcional por defecto desactivado. Cambios locales históricos QA respaldados y excluidos. |
| CI remoto | Windows40199313847 COMPLETADO SUCCESS: build, arranque, minimización y salida/reinicio. Validate40200427848 terminó con un único fallo de inventario SFX obsoleto, corregido previamente en 7d16a5d43; check local actual stale=false. Validate40201376759 y Windows40201376747 del HEAD ee5fb4ceb en ejecución; pendiente su resultado. No sustituir el resultado remoto por tests locales. |

## Defectos corregidos que bloqueaban integración

- Trabajadores refugiados no necesitan modelo visible al cargar; los activos siguen exigiendo adopción correcta.
- Preparación de profundidad requerida admite recuperación excepcional acotada del scheduler después de una estimación atípica. Caso CI 66,455 ms reproducido en test integrado; no se redujeron estimaciones ni se amplió timeout.
- Recursos de helechos usan rutas relativas al paquete. Inventario SFX actualizado sin cambiar audio.

## Límites conservados

Avisos ANGLE X4000 documentados, sin ruta GLSL no inicializada identificada; uniones de terreno en algunas vistas, coste de Manglares y aproximación de iluminación del LOD lejano. Calidad muy baja pierde cobertura/detalle según su perfil. No presentar capturas de ese perfil como referencia artística aprobada. Nuevos mockups de luz/DOF registrados para evaluación separada con coste medido.

## Después de la fusión

1. Pantalla de inicio siguiendo 13762.png: capas/parallax, acercamiento al seleccionar, partículas coloreadas iluminando tótem.
2. Microeventos: diseño, visibilidad en cultivos, movimiento, clipping, interacción, lifecycle y coste. Sustitución de sprites autorizada.

Actualización posterior: el menú está implementado y validado (MENU-PERFORMANCE.md y MENU-SUBTITLE.md). Los microeventos siguen en validación (MICROEVENTS-VALIDATION.md). El objetivo global NO está completado.

## Confirmación final

GitHub confirmó MERGED. Windows pasó arranque, minimización/restauración y salida/reinicio persistido; informes smoke y visibility ok=true, errors=[]. Sus cargas remotas fueron 235,3 s y 163,1 s: evidencia funcional del runner, no benchmark Intel UHD. Se preservaron los cambios locales existentes. Estado posterior de menú y microeventos: véase la actualización anterior.
