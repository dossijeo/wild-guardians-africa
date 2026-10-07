# SFX 030: no existe contacto de herramienta durante la reparación actual

La animación original Dig tiene azada y un marcador de partículas al 65 % del ciclo. `workerPose` contiene un mapeo reparación → Dig, pero eso no prueba que el gameplay lo ejecute.

`Game.tick` aplica `completeTask` al llegar una tarea de reparación caminando y también inmediatamente si carga una reparación antigua en estado acting. El cobro, restauración y evento RepairApplied ocurren antes de cualquier frame de actuación con Dig. El plan maestro, sección 12, define la comprobación y el precio al llegar; no se modifica esa duración para asignar un sonido pendiente.

`report.json` confirma los cuatro perfiles mediante comandos pagados, FIFO y observador real FarmContactAudio: 27 frames de recorrido de reparación por perfil, cero acting, un RepairApplied y un cobro de 534 monedas (800 × 400/600, redondeado hacia arriba). El observador conserva exactamente el snapshot de simulación y no produce build_tool_hit. Los sonidos de siembra/riego pertenecen a la tarea inicial anterior.

Reproducir desde la raíz con `node docs/qa/repair-contact-reservation/probe.mjs`. Usa navegación directa doble y daño explícito como preparación: no acredita terreno, render, escucha ni movimiento físico de herramienta. La prueba de la rama de animación con trabajadores artificialmente acting no sería evidencia de integración real.

El SFX 030 permanece reservado. La reproducción de reparación aprobada sigue siendo build_repair, ligada a RepairApplied; no se apila un golpe de herramienta inexistente.

10 pruebas de routing aprobadas y verificador Opus correcto: 126 originales exactos, tres metadatos derivados consistentes. El catálogo mantiene 94 asignaciones y 32 pendientes. Se actualiza el motivo de reserva en los metadatos originales/Opus y el inventario; no se cambia la reproducción ni el código de gameplay.
