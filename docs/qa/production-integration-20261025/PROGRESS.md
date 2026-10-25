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


Auditoría nativa parcial y repetición de concurrencia: ver NATIVE-AUDIT.md y native-{cancellation,lifecycle,routes}.json. Pasan seis biomas, ocho ciclos de edición/publicación/retirada por bioma y diferencial de rutas de seis perfiles. No equivalen a una campaña prolongada ni cierran todavía la auditoría arquitectónica completa.


## Bloqueo de aceptación descubierto en Windows

Run 40191688873 (head 1c7a508ea) compila pero falla el escenario de visibilidad: la carga de la partida guardada de Gran Cañón con cultivo, trabajadora y primera incursión no alcanza readiness en 420126 ms. Queda al 85 %, Preparing rendering resources, visible y enfocada, sin error explícito de carga. El fallo ocurre ANTES de minimizar. Evidencia descargada: windows-visibility-failure-1c7a.json. No atribuir aún causa a scheduler, shaders o pthreads; el informe no contiene esa atribución. No ampliar el timeout ni marcar la prueba aceptada. Siguiente paso: reproducir esa fixture de carga/restauración y observar la preparación pendiente; el arranque vacío de seis biomas y la recarga inicial de Manglares no cubren este escenario poblado.


Reproducción poblada en Chrome: package-populated-canyon.json carga la fixture pagada generada por create_desktop_visibility_fixture.mjs a través del guardado y el menú, en 18932 ms. Es una prueba dirigida con snapshot importado; no una partida creada manualmente ni equivalente al runner WebView2 (calidad por defecto frente a muy_baja en smoke). No reproduce el bloqueo; no lo declara resuelto. Se inicia build Tauri local actual para aislar el entorno: session 61626, log desktop-build-local-r2.log. Primer intento falló por cargo fuera de PATH; se usa la instalación existente C:/Users/PC/.cargo/bin.


CI adicional: Validate 40191688929 (1c7a508ea) termina success. Windows 40193992791 falla antes del juego en native-loading-visual-launcher.test.js por spawnSync powershell.exe ETIMEDOUT (30 s); no confundir con el timeout de readiness del run anterior. La misma prueba pasa localmente (1/1, 2,3 s) sin modificar timeout. Build local 61626 sigue vivo, rustc compilando; no reiniciado.


Binario local actual compilado; prueba nativa lanzada con perfil WebView2 nuevo, fixture poblada y smoke original (muy_baja, límite local de carga 90 s, intervalo real minimizado 300 s). Proceso 38028, session 67003; resultado pendiente native-populated-local.json. Build instalador sigue en session 61626. No reiniciar por la ausencia temporal del informe: se escribe al finalizar.


Auditoría de residencia: spatial-game-session conserva metadatos de props (no geometrías) al retirar gráficos, los refresca por revisiones de poblado, incluye chunks retenidos en previews de muros y libera mapas al destruir la sesión. Pasan 12 tests actuales de spatial-worker-gate-residency, spatial-prop-query, spatial-chunk-stream y chunk-stream-pipeline (residency-tests.log). Esta batería de ~1 s se ejecutó mientras corría el smoke nativo; ese smoke se usará como evidencia funcional, no como benchmark aislado.

El ejecutable local fue generado, pero el empaquetado NSIS posterior falló con os error 32 al solaparse con el ejecutable de prueba abierto. No afirmar que desktop:build haya pasado; repetir empaquetado después de cerrar el smoke, sin reiniciar el smoke activo (PID 38028/session 67003 confirmado vivo).


Smoke local WebView2 completado: native-populated-local.json, ok=true, cero errores, readiness 20820,945 ms, hiddenMs=300844,56 y restauración correcta. PNG extraído aparte para no incrustar base64 en JSON. No resuelve por sí solo la diferencia con CI. Se conecta el colector acotado native-loading-trace existente únicamente cuando __desktopSmokeStarted está activo, y smoke guarda fases pendientes + snapshot del scheduler al terminar. Cinco tests del colector pasan y sintaxis válida. No se cambia timeout ni política de ejecución. Instalador r3 continúa en session 24639; incluye el código anterior a esta instrumentación.


Pruebas actuales: 63/63 pasan en scheduler-resource-tests.log (scheduler, cola síncrona, bindings, terreno incremental, profundidad de cultivos, preparación viva de programas). Suite npm test completa iniciada session 66802, salida full-tests-current.log; aún no concluida. Instalador r3 sigue en makensis/session 24639, sin juego abierto. Captura native-populated-local.png inspeccionada: escena nocturna Gran Cañón, terreno/agua/edificios/actores visibles; no se utiliza como prueba de rendimiento o comparación artística integral.


RENDERER-AUDIT.md registra la revisión de agrupación/culling/rangos parciales/sombras y límites de scheduler/epochs. 77/77 pruebas dirigidas adicionales pasan (asset-resource-audit-tests.log). La matriz pendiente queda enumerada; no se cierran checks visuales con tests de contratos.


Instalador local r3 terminado exit 0: NSIS 403,11 MiB. El log desktop-build-local-r3.log confirma bundle completo. Esta build se inició antes de la instrumentación de 49bdc0fde; no presentarla como build de ese cambio diagnóstico. Suite completa session 66802 aún en ejecución, ya superó 950 subtests.


Contexto real en paquete: package-mangrove-context.json registra WEBGL_lose_context lost/restored (450,87 ms entre llamada y evento), stage no ocupado y cero errores/404. Captura posterior inspeccionada: suelo, agua, edificios y sombras presentes. La prueba usa arranque normal y extensión de pérdida de contexto, espera 3 s tras restauración. No mide tiempo GPU ni prueba ausencia de fugas; cámara inicial de poblado no permite certificar la capa de helechos. Conservar pendiente una vista específica de vegetación. El harness ahora falla explícitamente ante errores/recursos ausentes, además de guardarlos en JSON.


Suite completa actual finalizada exit 0: 4920 tests, 4858 pass, 0 fail, 62 skip, 454686 ms (full-tests-current.log). No contabilizar skips como validación. Se ejecutó como suite funcional, no en condiciones de benchmark aislado.

Vista específica de vegetación normal: package-mangrove-pan-context.json y capturas antes/después. Cuatro arrastres izquierdos normales alejan la cámara del poblado; pérdida/restauración real por extensión WebGL. Ambas capturas inspeccionadas: cobertura de frondas conservada, sin pérdidas evidentes de textura/densidad; cero errores/404. Movimiento, agua y tiempo de juego siguen activos, de modo que no son imágenes idénticas ni comparación métrica de píxeles.


Matriz activa de producción completada: PRODUCTION-ACTIVE-MATRIX.json y production-{bioma}-active.json. Se eliminan todas las recetas gráficas de URL; quedan solo tres flags del protocolo de diagnóstico de calidad/simulación. Los seis completan 240 frames con simulación avanzando, 15 chunks nuevos, cero fallidos y colas vacías al finalizar. Son fixtures pobladas instrumentadas (no UI manual); el paquete normal se validó aparte. Un recorrido por bioma no prueba mejora estadística, CPU/GPU aislados ni toda la matriz día/noche. No hubo builds/tests locales paralelos a las medidas.


Segundo fallo nativo de CI confirmado: run 40194212402 (84cb19096), smoke sin fixture, 420081 ms, 84 % Preparing rendering resources; windows-smoke-failure-84cb.json. La traza aún no existía en ese commit. Se inicia diagnóstico local SwiftShader (session 71737, package-software-canyon.json/log) con el paquete reconstruido y colector nativo activado explícitamente para QA. No se presume que CI use SwiftShader y no es benchmark Intel UHD. No ampliar timeout ni inferir causa hasta leer fases pendientes.


La reproducción con flags SwiftShader y calidad por defecto terminó sin fallo (package-software-canyon.json), pero ese primer informe no registró identidad efectiva de GPU ni traza de éxito; no usarlo como prueba del backend. Se añade captura de ambos y se repite con preferencias muy_baja como smoke: session 96558, package-software-canyon-lowest.json/log. Es QA explícito (colector activado y preferencia de calidad inicial), no ruta completamente sin instrumentación. Fetch confirma origin/main sigue siendo ancestro (0 commits exclusivos main), PR159 OPEN/DRAFT/MERGEABLE; esto no equivale a aceptación para merge.


SwiftShader muy_baja completado: package-software-canyon-lowest.json confirma ANGLE Vulkan SwiftShader Device (Subzero), sin errores ni recursos ausentes y sin fases pendientes al terminar. Es diagnóstico de compatibilidad/carga, no benchmark Intel UHD ni resolución del timeout de WebView2 CI. Run Windows 40196284890 confirmado en desktop:build; no reiniciar ni ampliar timeout.

Referencias artísticas nuevas recibidas: cuatro parejas original/mockup para Gran Río, Sabana, Manglares y Volcanes. Dirección: luz cálida, mayor separación entre luz y sombra y fondo suavizado. Mantener encuadre: el desenfoque solicitado corresponde a DOF, no a cambiar FOV. Evaluar DOF separado por su coste GPU y legibilidad, sin prometer coste cero. Conservar ciclo día/noche (no convertir mediodía permanentemente en atardecer), helechos holly/LOD/fixed512 de Manglares, lava aprobada; cambios mínimos en Desierto/Gran Cañón. No usar hojas redondas del mockup como selección final. Comparación controlada imagen/frametime requerida antes de adoptar. Este pase no sustituye los pendientes de integración, menú y microeventos.


Cancelación normal de carga validada con paquete construido: package-mangrove-cancel.json y capturas antes/después. Cancelar al 31 % mediante #loading-cancel, retorno al menú, cierre observado de spatial-threaded.mjs y otros workers, nueva selección de Manglares y llegada al HUD. Cero errores/404. Captura final inspeccionada: poblado, suelo, agua y sombras presentes. Un ciclo no prueba ausencia de fugas acumuladas; no se usa como benchmark ni evidencia artística de helechos, fuera de la cámara inicial. Harness WG_PACKAGE_UI_CANCEL=1 conserva el recorrido normal y recoge cierres de workers.


Matriz nocturna iniciada mediante fixtures pagadas de primera incursión (generador parametrizado por bioma, test existente pasa). Primera prueba Manglares/baja falla: package-night-manglares.json, timeout de readiness de 90 s sin errores/404. Se detiene la matriz, sin ampliar timeout. Se repite la misma fixture con colector de fases activado en package-night-manglares-trace.json. No atribuir aún causa ni declarar que reproduce exactamente CI.


Causa local nocturna confirmada: trabajador status=home excluido correctamente de sync/actorsReady, pero loadedWorkerActors exigía su mixer. Se omiten únicamente trabajadores refugiados; actores visibles ausentes siguen produciendo error. Test de regresión pasa, build pasa y paquete Manglares/baja vuelve a cargar (32786 ms). El harness ahora detecta el error visible de carga inmediatamente, evitando confundir un aborto con una espera de 90 s. Matriz continúa sin editar reglas ni estado de los trabajadores.

CI 40196284890 (4882) aporta causa distinta: windows-smoke-failure-4882.json. warm-prepare-depth pendiente 297185 ms, scheduler con un trabajo de 291910 ms, primer lote síncrono de 66,455 ms, cpu95=4,525 ms, cero blockingRecoveries. La estimación conservadora de depth-preparation excede el límite ordinario y no tenía recuperación excepcional habilitada. Se conecta esa tarea requerida al fallback existente, sin cambiar presupuestos ni habilitar trabajo opcional; conserva rate limit global de 5 s y frame CPU barato. 36 tests de profundidad/scheduler pasan. Falta confirmar el arreglo en CI real; no equiparar tests con prueba del driver. Las capturas nocturnas en curso usan build anterior a este cambio de admisión.
