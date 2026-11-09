# Seguimiento de cierre de A6

Actualizado: 2026-11-09. IDs acordados en la conversación; no se renumeran al avanzar.

**Ningún punto principal está cerrado todavía.** Un subpunto marcado como nativo
implementado/validado no autoriza por sí solo activar autonomía GPU o retirar el
ejecutor protegido de producto. A6 incluye todas las intenciones y trabajadores.

- [ ] **A6-01 — Integración con gameplay.** Conectar ejecución nativa a entidades,
  llegadas, cambios de intención y fronteras de acción en la partida real, sin
  dos autoridades de movimiento. El núcleo cinemático opt-in existe; la
  integración completa de consecuencias sigue pendiente.
- [ ] **A6-02 — Estado persistente de locomoción.** Mantener fases, presupuesto y
  transiciones entre intenciones y guardados. Hay paridad temporal de marcha,
  carrera/carga/huida de trabajadores; faltan offsets persistentes y transiciones
  todavía no representadas, incluida entrada de animales.
- [ ] **A6-03 — Resolución de tráfico.** Hay detección continua y cierre de
  paradas. Faltan esperas, cesiones, desvíos y reanudación por eventos, sin
  inanición ni planner JS paralelo.
- [ ] **A6-04 — Mutaciones restantes del mundo.** Parcial:
  - [x] **A6-04.a — Overlays nativos.** Muros/polígonos, máscaras y lotes con
    preflight, revocación dirigida y cierre de paradas. Commit `4ea5d2334`.
  - [x] **A6-04.b — Residencia nativa y retención.** Altas síncronas/pthread,
    retirada explícita dirigida, pins de cuerpos/halos y leases futuros,
    liberación gráfica no forzosa e inventario coherente. Implementado y validado
    en el dominio nativo actual; no activación general del ejecutor de producto.
    Evidencia: 17 pruebas WASM nuevas (dos con pthread real), batería dirigida
    de 311 y batería heredada de streaming/geometría de 39, sin skips.
  - [x] **A6-04.c — Props nativos.** Supresión monótona y restauración transaccional
    desde la receta C++ actual; cuerpos, sufijos futuros, leases preparados,
    decoración, halos y ausencia de witnesses cubiertos. Implementado/validado
    en el dominio nativo actual, sin activar el ejecutor general de producto.
    Evidencia: 19 pruebas WASM nuevas (dos pthread), batería dirigida de 330 y
    baterías heredadas de 39 y 74, sin skips.
  - [x] **A6-04.d — Terreno nativo.** Altas/reemplazos de asentamientos y lotes
    propuestos sin publicación; comparación de vértices y sólidos canónicos,
    preflight de apoyo actual y revocación de futuros dependientes. Implementado
    y validado en Desierto. Cambiar el apoyo de un cuerpo vivo se rechaza, no se
    transporta verticalmente de forma implícita; la política exterior sigue
    pendiente. Evidencia: 14 pruebas WASM nuevas (dos pthread), batería dirigida
    de 344 y baterías heredadas de 39 y 74, sin skips.
  - [ ] **A6-04.e — Puertas móviles.** Hojas, barrido, apertura/cierre y esperas
    autoritativos; la máscara estática no es suficiente.
    **Parcial:** geometría autorada, reloj de 0,6 s, sensores/espera y política
    nativos implementados como servicio opt-in. Datos incompletos congelan el
    motor. Pendientes el barrido físico continuo, pausas en la trayectoria,
    reservas/admisión de cruces y conexión por eventos con el producto.
    `authorizedPassage:false`; los cruces nativos siguen rechazados. Evidencia:
    11 pruebas WASM nuevas, 355 dirigidas + 39 y 74 heredadas sin skips.
  - [ ] **A6-04.f — Efecto físico/gráfico coordinado.** No hacer efectiva una
    mutación mientras un dibujante pueda cruzar antes de su revocación; depende
    también de A6-06.
- [ ] **A6-05 — Todas las intenciones, perfiles y biomas.** Completar animales
  (entrada, ataque, objetivo, retirada) y trabajadores (tareas, entrega/carga,
  regreso/huida, recuperación), además de impactos/ragdoll delimitados. La
  prueba estática continua actual sigue limitada a Desierto.
- [ ] **A6-06 — Reloj causal y aplicación física/gráfica.** Coordinar avance,
  pausa, velocidad, comandos, revocación y ACK. Existen el log versionado y el
  canal independiente; eso no resuelve aún la frontera temporal del dibujo.
- [ ] **A6-07 — Pérdida de canal y recuperación.** Desconexión silenciosa,
  retrasos, sustitución de Workers y recuperación gráfica sin permisos inseguros
  ni resurrección de generaciones.
- [ ] **A6-08 — Personajes con planes completos en GPU.** Posición, orientación,
  altura y animación autorizadas, admisión segura tras esperas de recursos y sin
  publicaciones periódicas de posición JS necesarias para locomoción.
- [ ] **A6-09 — Aceptación integrada real.** WASM/WebGPU con animales y
  trabajadores: obstáculos, tráfico, puertas, bloqueo síncrono de preparación
  de 500 ms, pausa/velocidad, acciones, guardado/restauración y device loss.
  Verificar mecánicas y determinismo; documentar/reproducir fallos heredados.
- [ ] **A6-10 — Costes estructurales.** Medir separadamente planificación,
  validación, contactos, preparación, dibujo CPU y GPU, comparando locomoción sin
  eventos con cambios estructurales. Los contadores nativos son evidencia
  parcial, no una medida integrada de rendimiento.
- [ ] **A6-11 — Activación y retirada de duplicados.** Activar clases validadas en
  producto y retirar planners/ejecutores/guardas JS redundantes; conservar solo
  excepciones justificadas y auditar los puntos anteriores antes de cerrar A6.

## Evidencia y siguiente avance

- [Objetivo y orden obligatorio](MIGRATION-OBJECTIVE.md).
- [Arquitectura, incrementos y límites](intent-route-architecture-correction-20261108.md).
- `.cache/native-residency-regression.tap`: 311 aprobadas sin skips.
- `.cache/native-residency-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-props-regression.tap`: 330 aprobadas sin skips.
- `.cache/native-props-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-props-legacy-recipe.tap`: 74 aprobadas sin skips.
- `.cache/native-terrain-regression.tap`: 344 aprobadas sin skips.
- `.cache/native-terrain-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-terrain-legacy-recipe.tap`: 74 aprobadas sin skips.
- `.cache/native-gates-regression.tap`: 355 aprobadas sin skips.
- `.cache/native-gates-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-gates-legacy-recipe.tap`: 74 aprobadas sin skips.

Quedan **2 de los 6 subpuntos de A6-04**: e (parcial) y f (pendiente).
Los **11 puntos principales de A6** siguen abiertos; son niveles distintos,
no dos cantidades que deban sumarse.

Próximo trabajo de A6-04: puertas móviles (A6-04.e) y coordinación de efecto;
en paralelo de dependencias de diseño,
siguen pendientes la integración de entidades/fases/consecuencias (A6-01/02) y
la coordinación temporal con dibujo (A6-06). No se declara completa la suite
general ni la aceptación real A–F.
