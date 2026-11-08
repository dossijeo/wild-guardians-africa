# Objetivo activo: completar la migración integrada Wild Guardians

Estado: **en ejecución; no completado**.

## Objetivo y orden obligatorio

Completar la migración del [plan integrado](integrated-gpu-migration-plan-20261104.md)
en la rama actual, sin alterar `main`, las mecánicas ni los cambios locales ajenos.
Trabajar autónomamente con commits pequeños y hacer push de cada commit terminado
a `origin/codex/guardian-3d-animation`; resolver el siguiente bloqueo del
camino crítico sin pedir autorización rutinaria entre hitos.

1. **Infraestructura A completa y conectada**, con la
   [corrección de movimiento por intenciones](intent-route-architecture-correction-20261108.md)
   como contrato prevalente. No optimizar la reproducción histórica como sustituto
   de planes completos autorizados. No retirar protecciones sin reemplazo.
2. **Contenido B1–B7 completo**, sobre los mismos propietarios de A: mundo,
   vegetación, economía/construcciones, personajes, guardián/combate, efectos y
   flujo completo. No crear otros renderers, planificadores ni estados autoritativos.
3. **Validación C1–C4 real**, funcional/determinista, visual/recursos,
   desacoplamiento/fallos y costes estructurales CPU/GPU medidos por separado.

## Condiciones de cierre

- Wild Engine es el único propietario de intenciones, navegación, vigencia,
  conflictos, ejecución lógica y consecuencias; rutas completas como unidad.
- A6 abarca todas las intenciones, incluidas las de los trabajadores, no solo
  AttackCrops. La vertical AttackCrops es la primera prueba integrada, nunca el
  criterio suficiente de cierre. Reloj, reservas, invalidación y ejecución deben
  ser comunes; perfiles, velocidades, carga, puertas y fronteras de acción
  conservan las reglas de cada intención. No crear un ejecutor por tarea ni
  dejar la locomoción ordinaria de trabajadores en JS al declarar A6 cerrado.
- Preparación gráfica separada de dibujo; GPU reproduce movimiento, orientación
  y animación autorizados sin posiciones o validaciones periódicas desde JS.
- Revocación oportuna independiente de cargas/compilaciones, aislamiento por
  época/versión y política segura ante interrupciones de canal o preparación.
- Aceptación A–F de la corrección: facóquero AttackCrops real con WASM/WebGPU,
  muro, conflicto móvil anticipado, bloqueo real de preparación de 500 ms,
  pausa/velocidad/acciones/guardado/device loss y contadores reales.
- B sin funcionalidades esenciales solo QA; C con partidas y recursos reales,
  campañas deterministas y evidencia reproducible. Una suite de contratos o un
  build correctos no cierran infraestructura, contenido ni aceptación integrada.
- Fallos preexistentes se reproducen y diagnostican; no se ocultan ni se cambian
  fixtures/reglas para obtener resultados verdes artificiales.

## Lista de trabajo persistente

- [x] Auditar propietarios y reabrir A6; commits `e213c43f9`–`8892bbe80`.
- [x] Log nativo versionado, secuencias/tiempos y revocación exacta.
- [x] Suscripciones espaciales nativas para cambios de sectores/portales.
- [ ] Ligar handles y control gráfico a la época de autoridad; impedir reuso
      entre instancias WASM, recuperación y cambios de Worker.
      Handles del bridge ya aislados y probados con dos WASM reales; falta
      conectar su bootstrap al runtime completo. Control/admisión gráficos
      también comprueban época, secuencia y versión. Base nativa de permisos y
      publicación con ACK conectadas entre Workers, arranque de aplicación y
      relevo gráfico. Quedan pendientes las garantías temporales de ejecución.
- [ ] Canal autoridad → dibujo independiente de preparación y política de
      aplicación/latencia segura; pruebas con preparación bloqueada.
      Receptor directo y límites por versión implementados. Tres ejecuciones
      WebGPU reales mantienen 15 dibujos durante bloqueo de 500 ms, con revocación
      aplicada y readback GPU correcto. Bootstrap/relevo de producto conectados
      y verificados;
      tres pruebas con la autoridad y el preparador reales reciben una revocación
      durante el bloqueo. Falta pérdida silenciosa del canal, reloj causal y
      fronteras de aplicación física. Los personajes todavía no consumen rutas
      completas autónomas en GPU.
- [ ] Ejecución temporal y reservas/conflictos nativos de rutas completas,
      incluyendo puertas, cuerpos móviles y excepciones físicas delimitadas.
      Barrido estático continuo nativo implementado para animales en Desierto,
      contrastado con guardas existentes y un fallo real entre muestras de 0,2 m.
      Todavía no autoriza ejecución dinámica ni sustituye el movimiento JS.
      La misma ruta versionada incorpora ahora tiempos/distancias nativos para
      candidatos AttackCrops en marcha estable a 1,5 m/s, evaluables sin volver
      a planificar ni validar. Opt-in de prueba, `authorizedAutonomy:false`;
      faltan ejecución lógica y garantías completas de reloj/mutación.
      Reservas opt-in en el mismo slot ya anticipan conflictos continuos entre
      trayectorias y destinos detenidos, usando cuerpos e índices existentes.
      Mutaciones de cuerpos incompatibles se rechazan antes de aplicarse;
      253 pruebas dirigidas pasan sin skips. Aún conservadoras, sin resolver
      cesiones/desvíos ni autorizar movimiento de producto/GPU.
      Preparación temporal común también disponible para rutas de trabajadores
      (tareas directas, riego, reparación y regreso), con carrera/presupuesto,
      carga, huida y fases preservados frente a `moveWorker`. El barrido admite
      conectores de trabajadores en Desierto, pero rechaza pasos automáticos sin
      hojas/tiempos nativos. Regresión ampliada: 261 aprobadas sin skips.
- [ ] Vertical AttackCrops completa y aceptación real A–F (primer caso integrado,
      no cierre de A6 por sí solo).
- [ ] Generalizar a otras bestias, trabajadores, intenciones y animaciones;
      retirar planificación/validaciones duplicadas por clase validada.
- [ ] Revisar de nuevo A1–A7 y cerrar infraestructura con evidencia integrada.
- [ ] B1 mundo.
- [ ] B2 vegetación.
- [ ] B3 economía/construcciones.
- [ ] B4 personajes.
- [ ] B5 guardián/combate.
- [ ] B6 efectos.
- [ ] B7 flujo completo.
- [ ] C1 funcionalidad/determinismo.
- [ ] C2 paridad visual/recursos.
- [ ] C3 desacoplamiento/fallos.
- [ ] C4 rendimiento/cumplimiento estructural.

## Próximo bloqueo

Llevar ejecución temporal y conflictos al propietario nativo, junto con el
reloj causal, desconexión y fronteras de aplicación física. El control directo
ya está conectado al bootstrap/runtime; no convierte por sí solo las rutas
geométricas actuales en una autorización segura de todo su futuro. No ampliar
autorización visual ni eliminar el ejecutor protegido hasta resolverlo.

Actualizar este registro y el plan al terminar cada parte, distinguiendo siempre
implementación, pruebas ejecutadas y aceptación pendiente. Si se interrumpe la
sesión, este archivo permite continuar el objetivo; no implica que exista un
proceso externo ejecutándose después de detenerse el agente.
