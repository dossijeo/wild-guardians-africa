# Fusión, pantalla de inicio y microeventos

Objetivo activo autorizado por el usuario. Orden obligatorio: preparar/validar/fusionar, después pantalla de inicio, después microeventos. No confundir el cierre del experimento artístico con una distribución ya integrada.

## Selección invariable

Manglares: HELECHOS holly aprobados con LOD + caché fija 512², musgo/barro localizado y agua azul. Hojas redondas y sus capturas son históricas, no selección final. Conservar cobertura/viento de Sabana/Río, Desierto aprobado, lava aprobada, riberas/fondos e impostores. Taller manual en pausa.

## Preparación de la fusión

- [x] Confirmar autorización de fusión condicionada a validación. PR159 todavía draft, sin merge.
- [x] Confirmar que la selección actual depende de flags QA y que fusionar sin conectarla no publica el arte validado.
- [x] Añadir approved-visual-profile.js como configuración independiente de herramientas QA, por bioma y sin estado global de mundo activo. Cuatro pruebas confirman selección, controles explícitos y aislamiento entre biomas.
- [x] Conectar el perfil a la preparación del mundo, materiales, fondos y streaming. Revisar inicialización anticipada antes de conocer el bioma; evitar estado global que mezcle partidas/cancelaciones.
- [ ] Validar la ausencia de la antigua capa de hojas redondas en Manglares en arranque normal, cambios de calidad y recarga. La retirada del selector cupped se debe verificar visualmente, no solo por la tabla de opciones.
- [ ] Revisar activación del scheduler y configuración normal de pthreads/fallback; no activar experimentos negativos.
- [ ] Resolver CI y validar build web/itch/Tauri, carga y funcionamiento sin parámetros QA.
- [ ] Auditar diferencias arquitectónicas/heredadas y cambios locales no publicados antes de decidir qué forma parte de la fusión. No añadirlos indiscriminadamente.
- [ ] Comparar partida normal con selección revisada: seis biomas, día/noche, carga/streaming/cámara/calidad, CPU/GPU/presentación, cancelación y reinicio.
- [ ] Fusionar y verificar SHA y checks de main; no fusionar hasta satisfacer los controles.

## Después de la fusión

- [ ] Pantalla de inicio por capas 2D y parallax, siguiendo mockup 13762.png. Conservar acercamiento al elegir y partículas coloreadas que iluminan el tótem. Validar navegación, resoluciones y transición al juego.
- [ ] Microeventos: sprites visibles en cultivos, integración artística, movimiento natural/interesante, interacción, clipping, pausas/cancelación y rendimiento. Sustituir recursos si hace falta; usuario lo autoriza.

Mockup: C:/Users/PC/source/repos/wild-guardians-africa/.codex-attachments/0279997d-6aac-4ade-95a2-a23950b2a73a/a1a676f7-d77c-42e6-8ba4-1472f953264f/13762.png.

El perfil ya se conecta en main.js al crear WorldScene; precarga usa solo los valores comunes y prepareWildEngineWorld/load resuelven el bioma antes de crear sus materiales. La URL explícita visualLab conserva el control QA. Se eliminó la receta atmosférica global fijada durante la importación. La configuración viaja por instancia a suelo, agua, cielo, grupos, destrucción, horizonte y cobertura.

Validación inicial: 93 tests pasan y verificación browser-syntax pasa. Smoke de Manglares con URL vacía carga pthreads, helechos + LOD y 25 cachés fixed512. Comparación con receta revisada: 99,9502 % píxeles idénticos; ver RUNTIME-PROFILE.md. No sustituye las pruebas normales de distribución ni el A/B de rendimiento.

Pendiente confirmado: GlobalFrameScheduler sigue opt-in por frameScheduler=1. Hay que revisar su activación normal y validarla antes de mergear. CI de 907c399f6 seguía en curso; Windows del padre e575ff46f pasó. No tomar ese resultado como validación del nuevo diff.


## Scheduler y dependencias oficiales

La selección normal ahora habilita scheduler y worker de bordes de barro, conservando frameScheduler=0/mudEdgeWorker=0 como controles explícitos. Se corrigió también el harness para que WG_FRAME_SCHEDULER=0 escriba realmente el control; ausencia de flag ya no significa desactivado. La aceptación integral sigue pendiente.

Se reconstruyó node_modules con npm ci (lockfile intacto); antes faltaban builds de Three/Vite. Se cerraron los servidores Vite antiguos de este worktree que retenían binarios. 36 tests de integración/runtime pasaron con dependencias oficiales sin loader externo; 20 tests del scheduler pasan tras cambiar el valor predeterminado. Build y web-package pasan (999 archivos, 492.045.042 bytes; build medido antes de activar el scheduler, repetir en el commit final). Playwright 1.55.1 se instaló únicamente local --no-save para QA.

mangrove-default-scheduler-r2.json/.png: URL vacía, 67 trabajos completados, 409 unidades, 0 fallidos/cancelados/pendientes; 25 chunks y cachés publicados, pthreads. El scheduler observó 5 overruns, unidad máxima 10,64 ms; no afirmar eliminación completa de picos. Captura inspeccionada: mantiene helechos/suelo aprobado. No es A/B de rendimiento ni simulación activa. Primer intento preservado como .failure.json: timeout de navegación de 30 s tras reinstalar dependencias; Vite seguía vivo, petición scene.js respondió 200 y la repetición funcionó.

La guardia de versión de guardados (Wild Engine world version=1) ya existe en origin/main; no es una incompatibilidad nueva introducida por esta integración. Falta el resto de auditoría heredada, builds del nuevo head, pruebas empaquetadas sin interceptar código y matriz completa.


## Distribución anidada: arranque normal de los seis biomas

Se probó dist bajo /nested/itch/game/, sin fallback a la raíz del servidor, usando clics reales en el menú (sin flags QA, interceptación ni inyección de código). Los seis arranques terminaron con HUD, sin errores JavaScript ni solicitudes 404: package-mangrove-ui-r3.json y package-{sabana,gran-rio,desierto,volcanes,gran-canon}-ui.json.

La primera prueba válida de Manglares descubrió una regresión real: modules.json se solicitaba mediante URL absoluta /assets/... fuera del paquete. Se corrigen continuous-grass, mangrove-fern-material y mangrove-fern-lod para usar el resolvedor assetUrl existente. No cambia contenido, resolución ni iluminación de los recursos. El fallo se conserva en package-mangrove-ui-r2.json; el intento anterior falló por el harness, que intentaba clicar durante la transición con el panel aún inert.

Build y web-package pasan tras la corrección (999 archivos, 492045085 bytes, 841 enlaces relativos, 17 GLB runtime); diez tests dirigidos pasan. Estas pruebas no prueban todavía guardado/recarga, pérdida de contexto, Tauri ni rendimiento de streaming. El arranque de respaldo también pasa en package-mangrove-fallback.json: crossOriginIsolated=false, HUD visible, cero errores/404 y ningún worker spatial-threaded. Esto valida arranque, no rendimiento ni ciclo de vida completo del respaldo.

La repetición aislada A/B/A/B de cambios de calidad ya está en isolated-quality-summary.json y ACTIVE-QUALITY-INTEGRATION.md. No hubo builds/tests concurrentes: los controles A registran máximos de unos 6,7 s al primer cambio a baja; B, 63–82 ms en ese cambio. El recorrido completo baja aproximadamente un 43 %. Son intervalos de presentación del protocolo completo, no tiempos GPU atribuibles al shader ni una afirmación general de FPS.


## Guardado y recarga empaquetados

package-mangrove-lifecycle-r2.json: mediante UI real se guarda Manglares, se sale al menú y se continúa el slot guardado. HUD restaurado, cero errores y recursos ausentes, nuevo runtime pthread creado para la recarga. No se inyecta estado ni se intercepta código. El primer intento (package-mangrove-lifecycle.json) falló por un selector QA obsoleto (#pause); el control real es #menuButton. Esto no certifica por sí solo ausencia de fugas ni equivalencia completa del snapshot. Siguen pendientes los escenarios prolongados y el resto de la matriz.
