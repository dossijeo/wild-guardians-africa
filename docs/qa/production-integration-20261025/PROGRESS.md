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
