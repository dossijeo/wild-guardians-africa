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

Seguimiento por IDs acordados: [checklist A6-01–A6-11](A6-CHECKLIST.md).
La [vista de entrega y pendientes fijos](A6-CHECKLIST.md#vista-de-entrega-y-pendientes-fijos)
separa componentes implementados de producto integrado: e/f siguen sin cerrar,
con ocho entregables identificados como e-R1–R4 y f-R1–R4: **e-R1/e-R2/f-R1/f-R2 cerrados,
cuatro pendientes**. e-R2 incluye admisión nativa opt-in por puertas inicialmente
cerradas, protección de reservas, composición con cierre previo y suspensión/
reanudación del sufijo con offsets nativos. La aceptación reproducible no activa
producto/GPU ni cierra e-R3/e-R4 o el padre f. f-R1 añade una frontera finita
publicada desde ejecución nativa para avance/pausa/velocidad/revocación, validada
en WASM/WebGPU sin preparación, sin autorizar tiempo futuro no ejecutado ni
rebobinar. f-R2 extiende propuestas no efectivas y commit condicionado a overlays,
residencia, props y terreno en el dominio nativo actual. Siguiente dependencia:
f-R3. No se
sumarán esos niveles ni se usarán tests/commits como porcentaje de finalización.

Continuación del 13 de noviembre: [auditoría del estado real e incremento f-R3](migration-checkpoint-20261113.md).
El objetivo autónomo persistente está activo en este chat. Registro de consumidores
y retirada GPU implementados; el cierre completo de f-R3 permanece pendiente.

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
      Avance cinemático nativo opt-in ya mueve cuerpos reales de ambos perfiles
      en el registro existente, con reloj común y sin validaciones por paso.
      Cancelar una trayectoria propaga las paradas conflictivas por evento,
      conservando tareas/objetivos y otras rutas. Lease inicial de mundo fijo:
      mutaciones no cubiertas todavía abortan el avance sin mover cuerpos/reloj.
      271 pruebas dirigidas pasan sin skips; no está activado en el producto.
      Muros/polígonos y permisos estáticos cuentan ya con fronteras dirigidas:
      preflight de cuerpos, revocación de futuros interceptados y cierre de sus
      paradas antes del commit. Las rutas ajenas continúan sin nueva generación.
      Lotes rígidos se comprueban enteros antes de tocar IDs/geometría/rutas.
      288 pruebas dirigidas y 22 de geometría heredada pasan sin skips.
      A6-04.b: residencia implementada en el dominio nativo actual. Publicación
      síncrona/pthread no detiene rutas ajenas; retirada explícita revoca futuros
      dependientes, pero liberación gráfica conserva sus leases. Pins de cuerpos
      y halos sobreviven al fin de una ruta; retención reintenta por cambios de
      frontera nativa, sin comprobaciones geométricas periódicas. 311 pruebas
      dirigidas y 39 de streaming/geometría heredada pasan sin skips.
      A6-04.c: props implementados/validados en el mismo dominio. La restauración
      propone geometría canónica sin publicar scratch ni cambiar el conjunto
      vivo; preflight atómico, discos sólidos, halos y leases preparados.
      Supresión monótona sin comprobación de rutas ni receta especulativa.
      330 pruebas dirigidas + 39 y 74 heredadas pasan sin skips.
      A6-04.d: terreno implementado/validado para el dominio nativo Desierto.
      Propuesta canónica en dos fases, sin publicar datos ni sitios; apoyo vivo
      protegido y futuros dependientes retirados antes del commit. Reemplazar
      el mundo requiere retirar la autoridad. 344 pruebas dirigidas + 39 y 74
      heredadas pasan sin skips; no se activa autonomía GPU.
      A6-04.e parcial: geometría, sensores/espera y reloj de puertas nativos;
      barrido continuo contra cuerpos y candidatos temporales, con preparación
      atómica y fences de altas/mutaciones hasta la pose final. Barrido adicional
      opt-in de objetos canónicos y otras hojas, con veto previo de obstáculos
      nuevos/restaurados, retención de datos y extensión dirigida de pruebas.
      e-R1 cerrado: mecanismo cinemático nativo de unión marco/hoja, apoyo 3D en
      datum plano de Desierto y matrices/geometría nativas consumidas por colisión
      y `NativeWall`. Las tres mallas originales fueron dibujadas en WebGPU y
      contrastadas en cinco estados con las consultas físicas nativas. No se
      cambian mallas/bisagras ni se ignoran regiones ocupadas por solapamiento.
      Apoyo no plano/desconocido y estados visuales no soportados rechazan.
      e-R2 cerrado: admisión nativa atómica por puertas inicialmente cerradas,
      aperturas futuras y leases de cruce, conservando un cierre previo hasta
      su inversión. El mismo ejecutor recorre la ruta; una invalidación retiene
      el sufijo y lo readmite por evento sin planner ni reiniciar fases/carrera.
      El escenario integrado se reproduce determinísticamente con dos puertas,
      suspensión, reanudación rechazada por obstáculo, retirada y llegada.
      Faltan integración con entidades, consecuencias, guardado/recuperación y
      coordinación causal con todos los dibujantes. `authorizedPassage:false`
      sigue significando sin permiso de producto/GPU, no que falte admisión nativa.
      Tres auditorías WASM/WebGPU reproducen posición y fases/presupuesto del
      timetable con una espera intermedia y reanudación, un paquete por ejecución,
      dos bloqueos de 500 ms y 15 dibujos por bloqueo. Sin personajes ni ejecución
      física: sigue siendo diagnóstico, no aceptación de autonomía.
      A6-04.f parcial: recibo GPU directo ligado a época/secuencia/tiempo,
      separado del ACK de control y verificado en tres auditorías WASM/WebGPU
      durante bloqueo real de preparación de 500 ms (15 dibujos por ejecución).
      Propuesta nativa de motor pendiente + ticket de un uso y commit tras recibo
      nuevo, solo si siguen vigentes época, reloj, cuerpos, hechos y reservas.
      Cuatro auditorías adicionales reales verifican tres commits y un rechazo
      por cambio de cuerpo durante la espera, con 15 dibujos durante 500 ms.
      El modo de objetos se liga al mismo ticket/recibo. Cuatro auditorías nuevas
      verifican tres commits/vetos posteriores y un rechazo por obstáculo nuevo
      mientras se espera, manteniendo 15 dibujos durante cada bloqueo de 500 ms.
      f-R1 cerrado para el cohort nativo: permisos de tiempo finitos desde
      ejecución, pausa/velocidad/revocación por canal directo, nunca reloj futuro
      concedido por el preparador. La prueba WASM/WebGPU reproduce un paquete
      durante tres bloqueos de 500 ms, sin sobrepasar lo ejecutado ni rebobinar.
      f-R2 cerrado en el dominio nativo actual: propuestas no efectivas de
      overlays, residencia/pthread, props y terreno; commit tras quiescencia y
      recibo GPU, con dependencias y revocaciones nativas. Los paquetes antiguos
      no se reproducen tras el commit; no se declara actualizado el mundo
      gráfico. Faltan integración física/
      recursos de puerta y consumidores/relevo. No hay permiso de
      cruce de producto/GPU ni aceptación con personajes.
      Quedan e/f de A6-04; cuatro entregables del desglose. 536 dirigidas
      + 39 y 74 heredadas pasan sin skips. No se marca e como terminado.
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

Conectar el avance cinemático común a entidades, fases persistentes y consecuencias
de gameplay, sin conservar un ejecutor JS paralelo para las clases migradas.
Extender las fronteras dirigidas ya implementadas para overlays/residencia/props/
terreno a puertas móviles, con coordinación de efecto físico/gráfico;
completar cesiones/desvíos y otros perfiles/biomas. Después
ligar reloj causal, desconexión y admisión GPU con aceptación integrada de animales
y trabajadores. El control directo ya conectado no garantiza por sí solo todo el
futuro de una ruta. No ampliar autorización visual ni eliminar las protecciones
existentes antes de verificar su reemplazo.

Actualizar este registro y el plan al terminar cada parte, distinguiendo siempre
implementación, pruebas ejecutadas y aceptación pendiente. Si se interrumpe la
sesión, este archivo permite continuar el objetivo; no implica que exista un
proceso externo ejecutándose después de detenerse el agente.
