# Seguimiento de cierre de A6

Actualizado: 2026-11-09. IDs acordados en la conversación; no se renumeran al avanzar.

**Ningún punto principal está cerrado todavía.** Un subpunto marcado como nativo
implementado/validado no autoriza por sí solo activar autonomía GPU o retirar el
ejecutor protegido de producto. A6 incluye todas las intenciones y trabajadores.

## Vista de entrega y pendientes fijos

**Situación de producto:** no se han activado los nuevos cruces nativos ni los
personajes autónomos en GPU. Hay una validación de las mallas originales de puerta;
los diagnósticos de locomoción aún usan triángulos, no personajes. Desde la petición de cerrar e/f se han cerrado **0 de esos 2
subpuntos**. Sus componentes internos avanzaron, pero la entrega integrada no.
En el desglose fijo de entrega, **e-R1 está cerrado; quedan 7 de 8**.

**Niveles que no se suman:** A6 tiene 11 puntos principales, todos abiertos.
Dentro de A6-04, a–d están marcados implementados/validados en el dominio nativo
actual; e/f están parciales. Los IDs siguientes solo desglosan el alcance que ya
estaba dentro de e/f; no son funcionalidades adicionales ni renumeran A6-01–11.

### Componentes ya implementados, con sus límites

| Componente | Hecho | Límite de lo entregado |
|---|---|---|
| Geometría/reloj/política | Hojas autoradas, apertura de 0,6 s, proximidad, ocupación y espera en C++; mecanismo nativo marco/hoja/apoyo consumido por colisión y `NativeWall`. | Clase validada: puertas intactas sobre datum plano nativo de Desierto. No activado en la partida; integración y ciclo de vida son e-R3. |
| Barridos y protección | Contacto continuo contra cuerpos, objetos canónicos y otras hojas; veto previo de mutaciones incompatibles. La unión del mecanismo conserva todas sus regiones ocupadas. | No certifica apoyos arbitrarios/inclinados ni física de otras clases; se rechazan explícitamente. |
| Timetable y fases | Esperas iniciales/intermedias sin gasto de fases/carrera, nudos completos y misma ruta/tarea/objetivo. Nueva admisión atómica opt-in de rutas completas por puertas inicialmente cerradas, con aperturas futuras y reservas nativas. | El lector de candidatos anterior sigue sin admitir. La nueva API exige el mecanismo validado de e-R1; faltan reanudación del sufijo y reversión diferida de un cierre en curso. No activa producto/GPU. |
| Control directo y recibo GPU | Revocación por época/versión, canal independiente de preparación y recibo de retirada de trabajo GPU previo. | Un recibo no resuelve reloj causal, presentación o todos los consumidores de producto. |
| Propuesta y commit de motor | Ticket de un uso; espera recibo nuevo y rechaza si cambian sus dependencias. | Motor de puerta opt-in; no transacción física/gráfica completa de todas las mutaciones. |

Son cinco componentes agrupados para visibilidad, no cinco entregables de producto
cerrados ni una medida porcentual. Cantidades de pruebas/commits son evidencia,
no el indicador principal de avance.

### Entregables de cierre: 1 cerrado, 7 pendientes

Se mantienen estos IDs al avanzar. Algunos comparten
dependencias con A6-01/02/06/07/08/09; no se cuentan otra vez como trabajo nuevo.

| ID fijo | Entrega y estado | Criterio observable de cierre |
|---|---|---|
| **A6-04.e-R1** | **CERRADO — Mecanismo físico marco/hoja y apoyo 3D.** | Un estado nativo coherente define marco, hoja y apoyo para colisión y dibujo; validar los materiales móviles sin ignorar falsamente sus contactos propios. [Evidencia de las tres mallas reales WASM/WebGPU](performance/native-gate-mechanism-20261109.json). |
| **A6-04.e-R2** | **PARCIAL — Aperturas futuras, reservas y admisión de cruces.** | Autorizar una ruta completa a través de puertas que inicialmente no estén abriendo; reservar el intervalo, impedir cierre sobre el cruce e invalidar/reanudar por eventos. |
| **A6-04.e-R3** | Integración de puertas con entidades y ciclo de vida. | Usar esas decisiones en las intenciones pertinentes de la partida, con llegadas/consecuencias, cancelación, guardado/restauración y recuperación; sin dos ejecutores autoritativos. |
| **A6-04.e-R4** | Aceptación de puertas con personajes reales. | Partida WASM/WebGPU con trabajadores y animales, respetando qué puede cruzar cada uno; obstáculos, esperas, pausa/velocidad, acciones, guardado y determinismo. No basta el triángulo. |
| **A6-04.f-R1** | Frontera causal de tiempo y comandos. | Simulación y dibujo aplican avances, pausa, velocidad y revocaciones en una frontera segura; no presentar movimiento que ya no puede autorizarse ni corregirlo mediante rebobinado. |
| **A6-04.f-R2** | Commit condicionado para las demás mutaciones. | Extender la propuesta todavía no efectiva y su commit seguro a overlays, residencia, props y terreno, no solo al motor de puerta. |
| **A6-04.f-R3** | Todos los consumidores, relevo y fallos. | La seguridad cubre consumidores activos/temporales, sustitución de Workers, pérdida de dispositivo y canal perdido o silencioso; un ACK viejo no permite aplicar cambios. |
| **A6-04.f-R4** | Aplicación gráfica de la misma mutación. | Recursos y dibujo representan el cambio físico coordinado; probarlo con personajes reales y preparación bloqueada, sin depender de publicaciones periódicas de posición JS. |

**Alcance del cierre de e-R1:** mecanismo cinemático de unión ocupada, materiales
zarzas/empalizada/reforzado intactos y apoyo plano validado por el terreno nativo.
No se alteran mallas, bisagras ni velocidad. No se declara separación interna de
sus piezas: las zonas de solapamiento siguen ocupadas para cuerpos/obstáculos,
sin excepciones por ID. Apoyo no plano/desconocido y cambio visual/de ciclo de
vida no soportado rechazan explícitamente; no hay fallback silencioso ni activación
en la partida. La expansión de clases y la integración pertenecen a A6-05/e-R3.

**Avance de e-R2, sin cierre:** `nav_gate_admit_route` prueba y publica en una
operación la ruta existente, esperas, motores futuros y reservas ligadas a
sesión/slot/generación/cuerpo. El ejecutor nativo la recorre sin repetir geometría
o planificación en pasos ordinarios. Se validan las tres puertas cerradas,
múltiples puertas, tráfico, marcos/hoja abierta, fases/presupuesto, tareas,
mutaciones rechazadas y cancelación antes/durante el cruce. La política no puede
congelar/cerrar una promesa reservada ni borrar su puerta. Cancelar una apertura
congela el motor y revoca por eventos las rutas dependientes; un cuerpo detenido
en el paso mantiene la protección de ocupación.

**Lo que falta dentro del mismo e-R2:** conservar/reanudar por eventos el sufijo,
fases y presupuesto tras esa invalidación. Hoy se revoca y se libera la geometría,
no se reanuda. Una inversión futura de un cierre ya en marcha requiere representar
sus tramos sin congelar su movimiento previo: se rechaza explícitamente. Las
reservas de esta entrega se retienen hasta liberar la ruta; no caducan por timer
ni programan cierre automático. Un evento posterior de política puede cerrar
solo después de liberar y comprobar ocupación/trayectorias. Nada de esto cierra
otro ID o añade nuevos entregables al tablero.

**Límite de integración descubierto:** algunos conectores del planner anterior
tocan el marco real. La admisión los rechaza y conserva ruta/tarea/objetivo; no
los desvía ni ignora contactos. Se comprueban tanto este rechazo como tareas
admisibles cuando el corredor autorado y el conector coinciden. Producir rutas
de gameplay compatibles pertenece a la integración ya pendiente, no se da por
resuelto por admitir una polilínea de prueba.

**Siguiente bloqueo concreto:** terminar e-R2. La admisión/reanudación de e-R2 y
la aplicación causal de f-R1–R4 permiten integrar y aceptar e-R3/e-R4. Es un mapa
de dependencias, no una promesa de duración o de que los ocho tengan igual tamaño.

**Cómo se informará el avance:** entrega cerrada y evidencia; entrega parcial
y qué criterio falta; IDs aún pendientes; cambios de alcance descubiertos,
si los hubiera, señalados expresamente. No añadir requisitos silenciosamente a
esta lista ni presentar más pruebas aisladas como cierre del producto.

## Checklist principal y detalle técnico

- [ ] **A6-01 — Integración con gameplay.** Conectar ejecución nativa a entidades,
  llegadas, cambios de intención y fronteras de acción en la partida real, sin
  dos autoridades de movimiento. El núcleo cinemático opt-in existe; la
  integración completa de consecuencias sigue pendiente.
- [ ] **A6-02 — Estado persistente de locomoción.** Mantener fases, presupuesto y
  transiciones entre intenciones y guardados. Hay paridad temporal de marcha,
  carrera/carga/huida de trabajadores; faltan offsets persistentes y transiciones
  todavía no representadas, incluida entrada de animales.
  Las esperas iniciales/intermedias del timetable ya detienen fases y carrera;
  no equivalen aún a offsets persistidos entre intenciones o guardados.
- [ ] **A6-03 — Resolución de tráfico.** Hay detección continua y cierre de
  paradas. Faltan esperas/cesiones de tráfico, desvíos y reanudación por eventos, sin
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
    nativos implementados como servicio opt-in. Política incompleta congela el
    motor; una propuesta transaccional rechazada conserva el anterior. Barrido
    continuo hoja/cuerpos y candidatos temporales validado mediante
    cotas de distancia/velocidad; preparación atómica y altas/mutaciones de cuerpos
    protegidas hasta la pose final. Barrido adicional opt-in contra muros,
    polígonos, props canónicos y otras hojas; protege el giro restante/pose final
    ante nuevas geometrías y conserva datos residentes. No equivale a clearance
    del mundo completo. El mecanismo marco/hoja y apoyo nativo de la clase
    validada ya está cerrado como e-R1; no certifica apoyos arbitrarios.
    Esperas iniciales e intermedias nativas ligadas al final de motores ya
    certificados: mismo slot, nueva generación, fases/presupuesto no avanzan en
    cada hold y los nudos incluyen entrada/salida y agotamiento de carrera. Solo candidato
    sin admisión: reserva y ejecución lo rechazan incluso al abrirse la puerta.
    Pendientes solicitudes futuras de apertura,
    reservas/admisión de cruces, recuperación y conexión por eventos con producto.
    `authorizedPassage:false`; los cruces nativos siguen rechazados. Evidencia:
    11 pruebas de política + 12 de barrido + 8 de espera iniciales; 20 nuevas de
    objetos y 2 de coordinación; 13 nuevas de esperas múltiples. Batería actual:
    446 dirigidas + 39 y 74 heredadas
    sin skips. Tres auditorías WASM/WebGPU reproducen espera/reanudación y fases/
    presupuesto desde un único paquete durante dos bloqueos de 500 ms cada una,
    sin nuevas posiciones JS ni trabajo geométrico nativo. Son triángulos de
    diagnóstico; no hay aceptación gráfica de personajes autónomos.
  - [ ] **A6-04.f — Efecto físico/gráfico coordinado.** No hacer efectiva una
    mutación mientras un dibujante pueda cruzar antes de su revocación; depende
    también de A6-06.
    **Parcial:** recibo de retirada del trabajo GPU previo por canal directo,
    separado del ACK de recepción del control. Época/sesión/secuencia/tiempo e ID
    exactos; fallo, timeout o retiro no conceden recibo. Tres auditorías WASM/WebGPU
    reales mantienen 15 dibujos y reciben el fence durante bloqueo de preparación
    de 500 ms. Es diagnóstico con triángulo, no personajes ni permiso de mutación.
    Propuesta de motor nativa pendiente + commit condicionado al recibo ya
    disponibles opt-in, con ticket de un uso y rechazo si cambian cuerpos, hechos,
    reservas, mundo, reloj o conexión. Quince pruebas WASM adicionales y cuatro
    auditorías nuevas WASM/WebGPU: tres commits y un rechazo por cambio de cuerpo
    durante la espera, todas con 15 dibujos durante 500 ms de bloqueo.
    El modo de objetos también participa en staging/commit: otras cuatro
    auditorías reales verifican tres certificados/vetos de geometría posterior y
    un rechazo por obstáculo introducido durante la espera, sin repetir clearance.
    No instala collider/recursos de puerta ni concede cruces. Faltan generalizar
    la transacción a otras mutaciones, reloj causal, coordinación completa de
    consumidores/relevo e integración física/gráfica de producto con personajes.
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
- `.cache/native-gate-sweep-regression.tap`: 367 aprobadas sin skips.
- `.cache/native-gate-sweep-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-gate-sweep-legacy-recipe.tap`: 74 aprobadas sin skips.
- `.cache/native-gate-waits-regression.tap`: 375 aprobadas sin skips.
- `.cache/native-gate-waits-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-gate-waits-legacy-recipe.tap`: 74 aprobadas sin skips.
- `.cache/native-gpu-fence-regression.tap`: 382 aprobadas sin skips.
- [Tres recibos GPU reales](performance/native-control-gpu-fence-20261109.json).
- `.cache/native-gate-transactions-regression.tap`: 397 aprobadas sin skips.
- `.cache/native-gate-transactions-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-gate-transactions-legacy-recipe.tap`: 74 aprobadas sin skips.
- [Transacción de motor y rechazo tras cambio de cuerpo](performance/native-gate-transactions-20261109.json).
- `.cache/native-gate-objects-regression.tap`: 419 aprobadas sin skips.
- `.cache/native-gate-objects-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-gate-objects-legacy-recipe.tap`: 74 aprobadas sin skips.
- [Certificados de objetos y rechazo tras obstáculo nuevo](performance/native-gate-objects-20261109.json).
- `.cache/native-gate-multiwaits-regression.tap`: 432 aprobadas sin skips.
- `.cache/native-gate-multiwaits-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-gate-multiwaits-legacy-recipe.tap`: 74 aprobadas sin skips.
- [Tres replays GPU de espera intermedia y reanudación](performance/native-gate-multiwaits-20261109.json).
- `.cache/native-gate-mechanism-regression.tap`: 446 aprobadas sin skips (incluye 9 nuevas de mecanismo y 5 de render antes separadas).
- `.cache/native-gate-mechanism-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-gate-mechanism-legacy-recipe.tap`: 74 aprobadas sin skips.
- Avance parcial de e-R2: `.cache/native-gate-crossings-regression.tap`, 462 aprobadas sin skips, incluidas 16 de admisión/reservas. `.cache/native-gate-crossings-legacy-stream-geometry.tap` (39) y `.cache/native-gate-crossings-legacy-recipe.tap` (74), también aprobadas sin skips. No cierra e-R2 ni acredita personajes/GPU.
- [Mecanismo nativo y mallas reales WebGPU](performance/native-gate-mechanism-20261109.json) · [captura](performance/native-gate-mechanism-20261109.png).

Quedan **2 de los 6 subpuntos de A6-04**: e y f (parciales).
Dentro de su desglose fijo quedan **7 de 8**: e-R1 cerrado, e-R2–R4/f-R1–R4 pendientes.
Los **11 puntos principales de A6** siguen abiertos; son niveles distintos,
no dos cantidades que deban sumarse.

Próximo trabajo de A6-04: puertas móviles (A6-04.e) y coordinación de efecto;
en paralelo de dependencias de diseño,
siguen pendientes la integración de entidades/fases/consecuencias (A6-01/02) y
la coordinación temporal con dibujo (A6-06). No se declara completa la suite
general ni la aceptación real A–F.
