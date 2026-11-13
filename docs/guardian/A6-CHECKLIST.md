# Seguimiento de cierre de A6

Actualizado: 2026-11-13. IDs acordados en la conversación; no se renumeran al avanzar.

Último incremento de f-R4: [payloads canónicos y retirada preparada de terreno/vegetación](f-r4-canonical-resources-20261113.md).
Su admisión gráfica y aceptación con personajes siguen pendientes; no cambia el recuento de cierres.

**Ningún punto principal está cerrado todavía.** Un subpunto marcado como nativo
implementado/validado no autoriza por sí solo activar autonomía GPU o retirar el
ejecutor protegido de producto. A6 incluye todas las intenciones y trabajadores.

## Vista de entrega y pendientes fijos

**Situación de producto:** no se han activado los nuevos cruces nativos ni los
personajes autónomos en GPU. Hay una validación de las mallas originales de puerta;
los diagnósticos de locomoción aún usan triángulos, no personajes. Desde la petición de cerrar e/f se han cerrado **0 de esos 2
subpuntos**. Sus componentes internos avanzaron, pero la entrega integrada no.
En el desglose fijo de entrega, **e-R1, e-R2, f-R1, f-R2 y f-R3 están cerrados; quedan 3 de 8**.

**Niveles que no se suman:** A6 tiene 11 puntos principales, todos abiertos.
Dentro de A6-04, a–d están marcados implementados/validados en el dominio nativo
actual; e/f están parciales. Los IDs siguientes solo desglosan el alcance que ya
estaba dentro de e/f; no son funcionalidades adicionales ni renumeran A6-01–11.

### Componentes ya implementados, con sus límites

| Componente | Hecho | Límite de lo entregado |
|---|---|---|
| Geometría/reloj/política | Hojas autoradas, apertura de 0,6 s, proximidad, ocupación y espera en C++; mecanismo nativo marco/hoja/apoyo consumido por colisión y `NativeWall`. | Clase validada: puertas intactas sobre datum plano nativo de Desierto. No activado en la partida; integración y ciclo de vida son e-R3. |
| Barridos y protección | Contacto continuo contra cuerpos, objetos canónicos y otras hojas; veto previo de mutaciones incompatibles. La unión del mecanismo conserva todas sus regiones ocupadas. | No certifica apoyos arbitrarios/inclinados ni física de otras clases; se rechazan explícitamente. |
| Timetable y fases | Esperas iniciales/intermedias, admisión atómica opt-in por puertas cerradas, cierre previo conservado hasta la inversión y suspensión/reanudación del sufijo con fases/presupuesto acumulados. | El lector de candidatos anterior sigue sin admitir. La nueva API exige el mecanismo validado de e-R1. No activa producto/GPU ni persistencia entre acciones/guardados. |
| Control directo y recibo GPU | Revocación por época/versión, canal independiente de preparación, frontera finita de tiempo ya ejecutado en nativo y recibo GPU ligado también a su versión de reloj. | f-R1 cerrado para el cohort nativo opt-in. Un recibo/reloj no resuelve todos los consumidores de producto, relevo ni aplicación gráfica de las mutaciones. |
| Propuesta y commit condicionado | Overlays, residencia, props y terreno: propuestas nativas no efectivas, tickets de un uso, preflight y commit tras quiescencia/drenaje GPU. Incluye publicación pthread. | Dominio nativo actual y un consumidor causal opt-in. Faltan consumidores/relevo y recursos gráficos coordinados; no activar en partida. |

Son cinco componentes agrupados para visibilidad, no cinco entregables de producto
cerrados ni una medida porcentual. Cantidades de pruebas/commits son evidencia,
no el indicador principal de avance.

### Entregables de cierre: 5 cerrados, 3 pendientes

Se mantienen estos IDs al avanzar. Algunos comparten
dependencias con A6-01/02/06/07/08/09; no se cuentan otra vez como trabajo nuevo.

| ID fijo | Entrega y estado | Criterio observable de cierre |
|---|---|---|
| **A6-04.e-R1** | **CERRADO — Mecanismo físico marco/hoja y apoyo 3D.** | Un estado nativo coherente define marco, hoja y apoyo para colisión y dibujo; validar los materiales móviles sin ignorar falsamente sus contactos propios. [Evidencia de las tres mallas reales WASM/WebGPU](performance/native-gate-mechanism-20261109.json). |
| **A6-04.e-R2** | **CERRADO — Aperturas futuras, reservas y admisión de cruces.** | Autorizar una ruta completa a través de puertas que inicialmente no estén abriendo; reservar el intervalo, impedir cierre sobre el cruce e invalidar/reanudar por eventos. [Aceptación nativa integrada y reproducible](performance/native-gate-crossing-resume-20261109.json). |
| **A6-04.e-R3** | Integración de puertas con entidades y ciclo de vida. | Usar esas decisiones en las intenciones pertinentes de la partida, con llegadas/consecuencias, cancelación, guardado/restauración y recuperación; sin dos ejecutores autoritativos. |
| **A6-04.e-R4** | Aceptación de puertas con personajes reales. | Partida WASM/WebGPU con trabajadores y animales, respetando qué puede cruzar cada uno; obstáculos, esperas, pausa/velocidad, acciones, guardado y determinismo. No basta el triángulo. |
| **A6-04.f-R1** | **CERRADO — Frontera causal de tiempo y comandos.** | Simulación y dibujo aplican avances, pausa, velocidad y revocaciones en una frontera segura; no presentar movimiento que ya no puede autorizarse ni corregirlo mediante rebobinado. [Ejecución real WASM/WebGPU y tres bloqueos de preparación](performance/native-causal-clock-20261109.json). |
| **A6-04.f-R2** | **CERRADO — Commit condicionado para las demás mutaciones.** | Extender la propuesta todavía no efectiva y su commit seguro a overlays, residencia, props y terreno, no solo al motor de puerta. [Seis casos WASM/WebGPU](performance/native-world-mutations-20261109.json). |
| **A6-04.f-R3** | **CERRADO — Todos los consumidores, relevo y fallos.** | La seguridad cubre consumidores activos/temporales, sustitución de Workers, pérdida de dispositivo y canal perdido o silencioso; un ACK viejo no permite aplicar cambios. [Relevo real WASM/WebGPU](performance/native-control-lifecycle-20261113.json) y [alcance/registro nativo](migration-checkpoint-20261113.md#cierre-del-criterio-de-seguridad-f-r3). |
| **A6-04.f-R4** | Aplicación gráfica de la misma mutación. | Recursos y dibujo representan el cambio físico coordinado; probarlo con personajes reales y preparación bloqueada, sin depender de publicaciones periódicas de posición JS. |

Avance de f-R4: [identidad de recursos ligada al commit nativo](f-r4-resource-boundary-20261113.md).
Los paquetes que llegan tarde, los command buffers antiguos y los envíos directos
no pueden adoptar la época nueva por su momento de recepción. El reemplazo GPU
se comprueba con preparación bloqueada; payload visible y personajes reales
siguen pendientes. No cambia la cuenta fija de entregables.

**Alcance del cierre de e-R1:** mecanismo cinemático de unión ocupada, materiales
zarzas/empalizada/reforzado intactos y apoyo plano validado por el terreno nativo.
No se alteran mallas, bisagras ni velocidad. No se declara separación interna de
sus piezas: las zonas de solapamiento siguen ocupadas para cuerpos/obstáculos,
sin excepciones por ID. Apoyo no plano/desconocido y cambio visual/de ciclo de
vida no soportado rechazan explícitamente; no hay fallback silencioso ni activación
en la partida. La expansión de clases y la integración pertenecen a A6-05/e-R3.

**Alcance del cierre de e-R2:** `nav_gate_admit_route` prueba y publica en una
operación la ruta existente, esperas, motores futuros y reservas ligadas a
sesión/slot/generación/cuerpo. El ejecutor nativo la recorre sin repetir geometría
o planificación en pasos ordinarios. Se validan las tres puertas cerradas,
múltiples puertas, tráfico, marcos/hoja abierta, fases/presupuesto, tareas,
mutaciones rechazadas y cancelación antes/durante el cruce. La política no puede
congelar/cerrar una promesa reservada ni borrar su puerta. Cancelar una apertura
congela el motor y revoca por eventos las rutas dependientes; un cuerpo detenido
en el paso mantiene la protección de ocupación.

La suspensión ahora revoca el handle ejecutable y conserva el mismo `RouteSlot`,
su sufijo y pose congelada. La reanudación por comando/evento nativo vuelve a
probar el sufijo y reservas antes de asignar una generación nueva, sin planner.
Offsets nativos conservan distancia/fases/presupuesto incluso en esperas o
suspensiones repetidas. Fallar por tráfico/obstáculos conserva el sufijo; cancelar,
cambiar objetivo, retirar cuerpo o reiniciar autoridad lo descarta. La reanudación
no es un timer ni un retry por tick, y no activa consecuencias de gameplay.

También se conserva un cierre ya autorizado hasta el instante nativo de petición
futura; se invierte continuamente desde su pose prevista, manteniendo la regla
de 0,6 s. Los nudos y cotas de movimiento cubren ambos tramos en las pruebas de
cuerpos/objetos/otras hojas. Cancelar al principio, aun con apertura actual 1,
retira también ese cierre futuro y suspende las rutas que dependían de él.

Las reservas se retienen hasta liberar la ruta; no caducan por timer ni programan
cierre automático. Un evento posterior de política puede cerrar solo después de
liberar y comprobar ocupación/trayectorias. Es la clase física nativa de e-R1,
no activación en gameplay, persistencia entre acciones/guardados, resolución de
todo el tráfico o aceptación con personajes. Esos límites ya pertenecen a los
IDs pendientes; no se añaden nuevos entregables.

**Evidencia del criterio, no porcentaje de avance:** el escenario WASM integrado
recorre dos puertas inicialmente cerradas con la polilínea elegida, se suspende
ante la segunda, conserva el sufijo/fases/carrera, rechaza una reanudación con
obstáculo y se readmite tras retirarlo hasta llegada/fin. Repetir el registro de
comandos da el mismo resultado. Los 300 avances ordinarios no añaden geometría,
sensores, barridos o consultas de planificación. Las pruebas complementarias
verifican cierre protegido, ocupación detenida, los tres materiales, inversión
parcial de cierre, reservas compartidas, épocas/generaciones y fallos atómicos.

**Límite de integración descubierto:** algunos conectores del planner anterior
tocan el marco real. La admisión los rechaza y conserva ruta/tarea/objetivo; no
los desvía ni ignora contactos. Se comprueban tanto este rechazo como tareas
admisibles cuando el corredor autorado y el conector coinciden. Producir rutas
de gameplay compatibles pertenece a la integración ya pendiente, no se da por
resuelto por admitir una polilínea de prueba.

**Alcance del cierre de f-R1:** el reloj opt-in se publica desde el estado del
cohort realmente ejecutado por Wild Engine, nunca desde el futuro que propone
un paquete preparado. `committedThrough` es finito; dibujar puede interpolar
dentro de esa frontera, no sobrepasarla ni ampliar el límite válido de recursos
del paquete, ni activar recursos futuros antes de su inicio válido. Requiere una base nueva consciente del reloj, no actualiza a ciegas
un consumidor histórico ya vivo. El modo pertenece a la conexión: quitar una
etiqueta de ruta en otra generación no lo desactiva. Pausa/velocidad y revocaciones llegan
por el mismo canal directo, fuera de preparación/recursos, y no rebobinan tiempo.
El modo causal bloquea avances nativos durante pausa y cambios de tiempo por
fuera del ejecutor. Contadores de reloj e intención, época y sesión se validan
antes de conceder tiempo; una propuesta de motor anterior a cambiar política
de reloj queda obsoleta aunque el tiempo lógico sea el mismo.

La aceptación real usa un plan nativo admitido/ejecutado, un paquete GPU y tres
bloqueos síncronos de 500 ms: pausa/cambio de velocidad, ejecución a velocidad ×2
y silencio hasta agotar la frontera seguido de revocación. Hubo 15 dibujos por
bloqueo, sin superar ninguna frontera ejecutada ni retroceder; el recibo GPU
llegó antes de desbloquear preparación. Hay readback de posición/fases/carrera
GPU contra el sampler nativo y contadores geométricos sin cambios. Es triángulo
diagnóstico, no aceptación con personajes. Si la autoridad no publica avances,
el dibujo se detiene: la existencia de una ruta futura no concede tiempo no
ejecutado. No se activa este modo en gameplay ni se retira el fallback protegido.

**Alcance del cierre de f-R2:** las cuatro familias del criterio usan una
propuesta nativa no efectiva y el mismo commit condicionado: barreras individuales
y en lotes, polígonos y permeabilidad; altas/bajas de residencia y publicación
pthread; supresión/restauración canónica de props; lotes/reemplazo de asentamientos
del terreno. El preflight conserva los vetos actuales y no publica mundo, IDs ni
revocaciones. Se confirma solo tras el recibo GPU exacto; cambios de cuerpo,
mundo, ruta, reloj o motor durante la espera invalidan el ticket. La mutación
canónica vuelve a comprobar sus dependencias al commit; no hay planner JS ni
comprobación geométrica periódica.

Tras un commit efectivo se invalida el paquete anterior y se rechazan los que
todavía estaban esperando recursos; no se inventa un frame actualizado: la imagen
permanece detenida hasta que llegue otro paquete. Las operaciones GPU fuera de
frame tampoco pueden colarse durante el drenaje. **Dependencia descubierta:**
mantener la imagen y generar/aplicar los recursos nuevos de manera coordinada es
f-R4; la protección de todos los consumidores y relevos sigue en f-R3. Este
incremento no acredita ninguno de esos IDs ni activa el camino en producto.
Las altas/bajas de chunk actualizan el espejo JS existente únicamente con los
resultados nativos; el enlace con el stream/recursos de juego sigue sin activar.
Si falla la conversión después de un commit físico, se cierra el canal: nunca se
libera como si el commit no hubiera ocurrido.

[Evidencia WASM/WebGPU de una barrera](performance/native-barrier-mutation-20261109.json)
y [seis operaciones de las cuatro familias](performance/native-world-mutations-20261109.json),
cada una durante un bloqueo real de 500 ms. El paquete previo se mantiene
congelado tras el commit; no se afirma que la geometría nueva ya esté dibujada.
El dominio es el validado por A6-04.a–d; no se generaliza silenciosamente a
terrenos/estados no soportados. Las recetas de props/terreno se comprueban de
nuevo al commit nativo: ese coste de evento y la congelación hasta recursos nuevos
quedan explícitos, no son trabajo por tick ni aceptación de rendimiento integrado.

**Siguiente bloqueo concreto:** f-R4, representación gráfica coordinada de la
mutación. Junto con la integración de entidades de e-R3 permite aceptar e-R4.

**Incremento f-R3, 13 de noviembre:** registro de consumidor actual y candidato
en la autoridad, retirada directa con congelación/drenaje GPU y tokens por
conexión, mutación bloqueada durante relevo y rechazo conservador de propietarios
sin prueba. Pérdida real de dispositivo y disposición drenada se distinguen de
un cierre de puerto. [Auditoría, implementación y límites](migration-checkpoint-20261113.md).
El primer incremento era parcial; el registro nativo de todas las colas y sus
comprobaciones antes/después de cada frontera completan el criterio de seguridad
de f-R3. No se habilita autonomía de producto ni se cierra el padre f.

**Alcance de f-R3:** mismas clases nativas opt-in que f-R1/f-R2. Los publicadores
se registran en su bridge con el propietario de frontera; una mutación o motor
de puerta no acepta un recibo individual que omita otra cola. Una cola que llega
durante la espera invalida la propuesta antes del commit. Dejar de observar o
cerrar un puerto conserva su entrada; solo un drenaje certificado permite
retirarla. El relevo de la autoridad usa el mismo registro de consumidores.
La política ante un canal irrecuperable es fallo explícito y ausencia de commit;
no se simula progreso, no se concede tiempo futuro y no se descarta ese
propietario incierto al abrir un Worker nuevo. Recuperar un dispositivo perdido
real sí conserva la autoridad, como acredita el recibo de navegador. Las
mutaciones todavía congelan el paquete anterior: aplicar recursos nuevos y
personajes reales pertenece al criterio f-R4 que sigue pendiente.

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
    e-R2 cerrado: admisión atómica nativa de la ruta completa, aperturas futuras
    y reservas ligadas al mismo slot/cuerpo, con cierre previo conservado hasta
    la inversión. Suspensión/reanudación del sufijo por eventos, sin planner,
    manteniendo fases/carrera. Los candidatos previos siguen sin admitir; la
    nueva API nativa puede reservar y ejecutar solo tras sus pruebas completas.
    Pendientes conexión con entidades, recuperación/guardado, consecuencias y
    frontera física/gráfica de producto (e-R3/e-R4/f). `authorizedPassage:false`
    sigue indicando que no se activa producto/GPU, no ausencia de admisión nativa.
    Evidencia:
    11 pruebas de política + 12 de barrido + 8 de espera iniciales; 20 nuevas de
    objetos y 2 de coordinación; 13 nuevas de esperas múltiples. Batería actual:
    536 dirigidas + 39 y 74 heredadas
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
    f-R1 cerrado para el cohort nativo: fronteras de tiempo finitas desde ejecución,
    pausa/velocidad/revocación directas y replay GPU que no sobrepasa lo ejecutado
    ni rebobina. Prueba real con un paquete, tres bloqueos de 500 ms, recibo GPU
    durante preparación bloqueada y readback de fases/posición contra WASM.
    f-R2 cerrado en el dominio nativo actual: overlays, residencia (incluido
    pthread), props y terreno con propuestas no efectivas y commit condicionado.
    Invalida paquetes anteriores y conserva congelada la imagen hasta recursos
    nuevos. No instala recursos de puerta ni activa cruces de producto. Faltan
    coordinación completa de
    consumidores/relevo e integración física/gráfica de producto con personajes.
- [ ] **A6-05 — Todas las intenciones, perfiles y biomas.** Completar animales
  (entrada, ataque, objetivo, retirada) y trabajadores (tareas, entrega/carga,
  regreso/huida, recuperación), además de impactos/ragdoll delimitados. La
  prueba estática continua actual sigue limitada a Desierto.
- [ ] **A6-06 — Reloj causal y aplicación física/gráfica.** Coordinar avance,
  pausa, velocidad, comandos, revocación y ACK. Existen el log versionado y el
  canal independiente; f-R1 ya resuelve la frontera del cohort nativo opt-in.
  Faltan aplicación física/gráfica de las mutaciones, todos los consumidores,
  recuperación e integración del producto; este punto principal no se cierra.
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
- Incremento previo de e-R2: `.cache/native-gate-crossings-regression.tap`, 462 aprobadas sin skips, incluidas 16 de admisión/reservas. `.cache/native-gate-crossings-legacy-stream-geometry.tap` (39) y `.cache/native-gate-crossings-legacy-recipe.tap` (74), también aprobadas sin skips. Aún no cerraba e-R2 ni acreditaba personajes/GPU.
- Incremento de suspensión/reanudación de e-R2: `.cache/native-gate-resume-regression.tap`, 474 aprobadas sin skips, incluidas 12 de sufijos/offsets. `.cache/native-gate-resume-legacy-stream-geometry.tap` (39) y `.cache/native-gate-resume-legacy-recipe.tap` (74), también aprobadas sin skips. En ese incremento quedaba pendiente la composición con cierre en curso.
- Cierre de e-R2: `.cache/native-gate-e-r2-regression.tap`, 479 aprobadas sin skips; `.cache/native-gate-e-r2-legacy-stream-geometry.tap` (39) y `.cache/native-gate-e-r2-legacy-recipe.tap` (74), aprobadas sin skips. [Registro de aceptación nativa](performance/native-gate-crossing-resume-20261109.json); se reproduce con `tests/spatial-native-gate-route-acceptance.test.js`.
- Cierre de f-R1: `.cache/native-causal-clock-regression.tap`, 493 aprobadas sin skips; `.cache/native-causal-clock-legacy-stream-geometry.tap` (39) y `.cache/native-causal-clock-legacy-recipe.tap` (74), aprobadas sin skips. [Aceptación WASM/WebGPU del reloj causal](performance/native-causal-clock-20261109.json), reproducible en `/tests/browser/native-causal-clock.html`; diagnóstico, no personajes.
- Avance parcial de f-R2: `.cache/native-barrier-quiescence-regression.tap`, 517 aprobadas sin skips; `.cache/native-barrier-quiescence-legacy-stream-geometry.tap` (39) y `.cache/native-barrier-quiescence-legacy-recipe.tap` (74), aprobadas sin skips. [Una barrera WASM/WebGPU con preparación bloqueada](performance/native-barrier-mutation-20261109.json), reproducible en `/tests/browser/native-barrier-mutation.html`. No cierra f-R2 ni acredita personajes/recursos nuevos.
- Cierre de f-R2: `.cache/native-world-mutations-regression.tap`, 536 aprobadas sin skips; `.cache/native-world-mutations-legacy-stream-geometry.tap` (39) y `.cache/native-world-mutations-legacy-recipe.tap` (74), aprobadas sin skips. [Seis mutaciones WASM/WebGPU](performance/native-world-mutations-20261109.json), reproducibles en `/tests/browser/native-world-mutations.html`. No son aceptación gráfica de recursos nuevos/personajes.
- [Mecanismo nativo y mallas reales WebGPU](performance/native-gate-mechanism-20261109.json) · [captura](performance/native-gate-mechanism-20261109.png).

Quedan **2 de los 6 subpuntos de A6-04**: e y f (parciales).
Dentro de su desglose fijo quedan **3 de 8**: e-R1/e-R2/f-R1/f-R2/f-R3 cerrados; e-R3/e-R4/f-R4 pendientes.
Los **11 puntos principales de A6** siguen abiertos; son niveles distintos,
no dos cantidades que deban sumarse.

Próximo trabajo de A6-04: puertas móviles (A6-04.e) y coordinación de efecto;
en paralelo de dependencias de diseño,
siguen pendientes la integración de entidades/fases/consecuencias (A6-01/02) y
la coordinación temporal con dibujo (A6-06). No se declara completa la suite
general ni la aceptación real A–F.
