# Corrección de autoridad y autonomía de rutas — 2026-11-08

## Estado

**A6 reabierto; A y la arquitectura completa no están cerrados.** Las pruebas
históricas existentes demuestran reproducción de estados pasados, no ejecución
autónoma de una intención. No autorizan continuar B1–B7 como si esta dependencia
estuviese resuelta. Este documento prevalece sobre declaraciones anteriores
de cierre interno de A6.

Hay modificaciones locales previas en simulación, escena, carga y QA. No forman
parte de los commits de esta corrección ni deben descartarse.

## Auditoría de responsabilidades

| Propietario actual | Incumplimiento concreto | Clasificación / destino |
| --- | --- | --- |
| `spatial-intent-state.cpp`: `nav_intent_plan_attack_crop`, slots y generaciones | Selecciona objetivo/ruta nativos aprovechables, pero no posee aún la ejecución temporal completa. | **Necesario**, ampliar el propietario existente; no añadir otro planificador. |
| Mismo archivo: `releaseRoute`, `emitIntentChange` | La fila publicada después de liberar tiene generación cero: no identifica qué versión se revocó. No hay secuencia de transición ni tiempo autoritativo en la fila. | **Reutilizable con modificación**: extender el mismo flujo nativo, no crear otro bus de intenciones. |
| Mismo archivo: `nav_intent_reconcile_topology` / `activeRouteClear` | En cada evento topológico visita todas las intenciones y comprueba cada polilínea activa con revisión distinta. Es por evento, pero no dirigido espacialmente. | **Reutilizable con modificación**: índice inverso de sectores/celdas recorridos y eventos con región afectada. |
| `spatial-intent-bridge.js`: `prepareAttackTransients` | Cuerpos y destinos reservados son una captura al planificar; expresamente no invalidan rutas comprometidas. No garantiza conflictos futuros. | **Reutilizable con modificación**: eventos/reservas nativos con identidad y trayectoria temporal. |
| Mismo archivo: `projectRouteProgress` | Reenvía los sufijos JS al cambiar topología. La posición/cursor nativos dependen del ejecutor JS. | **Redundante y eliminable** para rutas autónomas; conservar solo reconciliación excepcional durante transición. |
| Mismo archivo: `retrySeconds`, `pendingAttackRoutes`, `nextRetry` | Recuperación periódica de pendientes. No sirve como invalidación dirigida por eventos. | **Reutilizable con modificación**: despertar por residencia, objetivo o conflicto; justificar separadamente recuperación por fallo. |
| `spatial-navigation-movement.js`: `workerMotionClear`, `terrainValid`, `segmentClear` | Muestrea pasos; hojas de puertas y su barrido siguen en JS. `ownsRoute` solo prueba procedencia, no validez futura. | **Reutilizable con modificación** en fronteras/diagnóstico; puertas y terreno pasan a Wild Engine antes de retirar guardas. |
| `game.js`: `walkTo` (865–1080), `retainRouteAfterWallChange` | Conserva/refresca rutas, sondea obstáculos y terreno, recupera conectores y mueve posiciones cada tick incluso con `externallyPlanned`. | **Redundante y eliminable** para locomoción ordinaria tras migración; no basta con activar `externallyPlanned`. |
| `actor-motion.js`: `prepareActorMotion`, `terrainDetour`, grafo de discos | Segundo planificador JS que modifica `actor.path`, decide cesiones y conectores. | **Redundante y eliminable** tras sustituirlo por resolución autoritativa nativa. No eliminarlo antes. |
| `animal-route-clearance.js`, `worker-route-clearance.js` | Prefijos cacheados no eliminan comprobaciones de terreno/agua/puntos por paso. | **Redundante y eliminable** en rutas nativas garantizadas; **excepción física** para escapes heredados expresamente delimitados. |
| `raids.js`: selección, `walkTo`, inicio/impacto de ataque | Parte de selección tiene fallback JS; movimiento ordinario sigue en JS. Impactos y reservas no pueden pasar al renderer. | **Reutilizable con modificación**: adaptar reglas existentes al propietario nativo sin anticipar daños. |
| `confirmed-historical-motion-group.js`, `confirmed-timeline-pump.js`, certificación histórica | Certifican intervalos ya ejecutados; el límite de 100 ms nació para continuidad/latencia de input histórico. No es la unidad de locomoción. | **Excepción necesaria por causalidad/recuperación**, no ruta principal ni autorización de futuro. |
| `webgpu-actor-motion-binding.js`, bancos baked y texturas | Desplazamiento/orientación y matrices baked aprovechables. Preparación por actor fuera del dibujo. | **Necesarios / reutilizables** con polilínea nativa completa y reloj autorizado. |
| `webgpu-world-worker.js`, `webgpu-world-surface.js` | Poseen Three, TSL, rigs, admisión y paquetes; todavía consumen principalmente publicaciones/intervalos. | **Preparador necesario**, sustituir alimentación de locomoción, no trasladar escena al dibujante. |
| `remote-webgpu-client.js`: `send` | La salida FIFO espera conversión de imágenes. No transporta una revocación crítica con garantía oportuna. | **Necesario** para recursos; control autoritativo independiente de esta cola. |
| `remote-webgpu-host.js`: `chain`, `handle(frame/operation)` | Puede esperar recursos; rAF independiente, pero sin revocación de ruta por actor. Crea pipelines nativos asíncronos por propiedad del dispositivo. | **Reutilizable con modificación**: admisión estructural fuera del rAF y control independiente. No confundir creación nativa con construcción TSL. |

## Contrato final y orden causal

El alcance incluye **todas las intenciones, también las de los trabajadores**.
AttackCrops es el primer caso de aceptación integrada, no una excepción que
permita cerrar A6 dejando otros actores con planificación/ejecución ordinaria JS.
La infraestructura de reloj, reservas, invalidación y ejecución es común;
perfiles, velocidades/carga, puertas y consecuencias mantienen las reglas de
cada intención. Las limitaciones actuales a animales en Desierto y marcha a
1,5 m/s describen un incremento incompleto, no el contrato general.

Reutilizar identidad `(session, slot, generation)` y flujo de cambios nativo.
Cada transición incluye versión de protocolo, secuencia monotónica de evento,
actor/intención/objetivo, instante de simulación y versión revocada. Asignación
lleva ruta completa, origen, velocidad/perfil y tiempos. Invalidación retira
exactamente la versión anterior; reemplazo conserva orden revocar → asignar.
Cambio de intención/acción y finalización lógica no autorizan impactos visuales
a producir daños. La secuencia de cambios de entidades no sustituye la secuencia
de transiciones: una transacción puede generar varias.

El preparador puede omitir una asignación ya revocada. El dibujante conserva la
revocación aunque un recurso termine después; no readmite una versión retirada
tras recuperación/cambio de Worker. Nueva sesión invalida handles anteriores.
El guardado conserva consecuencias/acciones, no handles WASM reutilizables.

El contador `session` nativo es local a una instancia WASM; otra instancia puede
repetir sus valores. El bridge ahora añade `authorityEpoch` a cada handle y
transición, rechaza handles sin ámbito o de otro propietario y permite recibir
la época del propietario de autoridad. Por defecto genera una identidad efímera
por propietario, fuera de guardados y RNG del juego. Dos instancias reales con
el mismo tuple nativo ya no pueden intercambiar handles. El receptor gráfico
debe conservar ese ámbito: este cambio no conecta por sí solo el canal directo.

## Seguridad antes de habilitar autonomía

Comparadas: (1) quitar guardas y confiar en procedencia, **rechazada** por puertas,
conectores y tráfico; (2) mantener validaciones por tick y aumentar horizontes,
**rechazada** como arquitectura final; (3) ampliar el propietario nativo existente
con dependencias espaciales y reservas temporales, **dirección elegida**.

- Celdas/sectores atravesados suscriben sus rutas. Un cambio de obstáculo,
  terreno/residencia o puerta consulta suscriptores afectados; destino usa
  índices `byTarget`/`byTask` existentes.
- Trayectorias autorizadas reservan corredores espacio-temporales nativos,
  incluyendo el cuerpo detenido al terminar. Conflictos se resuelven al admitir
  o cambiar reservas, no esperando solapamientos. Mantener excepciones existentes
  de encuentro/combate, no prohibirlas cambiando reglas.
- Un cuerpo balístico/ragdoll sin futuro garantizado necesita autorización
  conservadora propia y región insegura nativa, no ventanas universales de 100 ms.
- Control autoridad → dibujo no pasa por preparación de recursos. Un ACK no
  acredita seguridad de fotogramas anteriores. Un obstáculo que se vuelve
  efectivo necesita frontera coordinada anterior al cruce visual. Ante
  pérdida/atraso del canal, detener reloj o alcanzar frontera segura previamente
  acordada; no seguir indefinidamente una ruta revocable sin canal vivo.
- No añadir barridos de escena ni validaciones de colisiones por fotograma.
  Resolver/admitir recursos en cambios de generación.

## Gates de aceptación (no superados por esta auditoría)

1. **A** AttackCrops real: facóquero, WASM y WebGPU, varios segundos, una
   preparación; cero consultas de validez/publicaciones de posición necesarias
   durante locomoción. Evaluar trayectoria una vez por actor si el coste lo exige.
2. **B** Muro: revocación específica anterior al cruce inseguro, sustitución si
   existe, sin resurrección de generación retirada.
3. **C** Tráfico: conflicto anticipado nativamente, continuidad sin planner JS.
4. **D** Bloqueo síncrono real del preparador de 500 ms: dibujo/animación dentro
   de autorización; revocación directa sigue aplicándose durante el bloqueo.
5. **E** Pausa, velocidad, objetivo, impactos/ragdoll, save/restore y device loss:
   sin efectos duplicados, daño visual, rebobinado ni handles de sesiones previas.
6. **F** Contadores separados de planificación, validación, contactos físicos,
   preparación, draw CPU, intervalos del Worker de dibujo y GPU. Comparar
   ticks/fotogramas sin eventos frente a intenciones/cambios/conflictos.

Fallback reversible hasta pasar gates en la vertical, luego generalizar por
intención. Retirarlo por clase cuando no necesite planificación/validaciones
duplicadas y pase regresiones de mecánicas/guardados. No mantener indefinidamente
dos implementaciones completas. B y C generalizados siguen pendientes; pruebas
de contrato, WGSL o build no cierran este bloque.

## Primer incremento: identidad causal nativa (implementado, no cierre)

El mismo `nav_intent_change_ptr` usa protocolo **2**, ancho **15** `double`:
`actor, planningState, task, target, session, slot, generation, topology,
eventSequence, effectiveTime, revokedSession, revokedSlot, revokedGeneration,
eventType, protocolVersion`. Tipos: 1 asignación, 2 invalidación, 3 reemplazo,
4 cambio de intención, 5 ruta completada. Un reemplazo puede ser dos eventos
consecutivos (revocación y asignación); no se colapsan antes de consumir control.
La reconciliación JS heredada todavía colapsa estados para actualizar entidades,
por lo que **su retorno no sirve como canal de revocación gráfica**.

`nav_intent_set_time` recibe el reloj de simulación en fronteras de mutación del
bridge, rechaza regresiones y se reinicia con la sesión. Drenar tarde el log no
cambia el instante. Liberar una ruta conserva su handle revocado en la transición,
incluso si el slot se reutiliza antes del drenaje. Retirar un actor ya no suprime
su revocación. Entrar en acción libera la ruta de trabajadores igual que la de
animales; no aplica daños ni cambia hit frames.

Standalone y pthread se reconstruyeron con Emscripten local. El bridge exige el
mismo ABI y falla explícitamente con binarios antiguos; no hay protocolo paralelo
de compatibilidad. Los nuevos exports usan `EMSCRIPTEN_KEEPALIVE`, también para
la exposición JS del runtime pthread.

Validación: `node --test tests/spatial-intent-transition-protocol.test.js` ejecuta
**7 pruebas sin skips**, con WASM real standalone/pthread, facóquero AttackCrops,
muro, objetivo, retirada, finalización de ruta, tiempo y sesión. Son pruebas del
primer incremento; **no prueban autonomía de movimiento, seguridad dinámica ni
WebGPU**. La asignación aún no lleva velocidad/tiempos de ejecución nativos.

Regresión dirigida anterior: 30 aprobadas, 2 fallos en
`spatial-native-intent-bridge.test.js`: `loading during a committed strike...`
(metadatos temporales de eventos contra fixture anterior) y `event-fed native
intent bridge...` (`Contador de entidad incoherente` al guardar entidades QA).
Ambos se reprodujeron con bridge, test y WASM anteriores de Git en
`.cache/intent-protocol-baseline/`, manteniendo los demás módulos del árbol de
trabajo. No se han alterado fixtures ni ocultado fallos. Esa comparación no
acredita una suite completa limpia.

## Segundo incremento: dependencias espaciales nativas (implementado, parcial)

`lazy-sectors.cpp` notifica mutaciones al propietario existente de intenciones.
Las rutas activas se suscriben a los sectores de su polilínea completa mediante
referencias inversas actor → sectores → actores; no se copia otro grafo ni se
planifica en JS. Se cubren conectores fraccionarios y un margen conservador de
3 m (superior al radio máximo admitido por las intenciones, 2 m). Los segmentos
largos se subdividen para acotar la cobertura de cada tramo diagonal.

En la reconciliación ya no se recorre `activeIntents`: se sincronizan como máximo
los seis perfiles participantes y se consumen IDs encolados por sectores
modificados. Los candidatos se ordenan por identidad como antes. Se conserva la
comprobación física nativa únicamente para candidatos potencialmente afectados.
Liberación, cancelación, retirada y paso a acción retiran las suscripciones.
Los conectores JS excepcionales añaden dependencias en la frontera existente de
reconciliación, no en cada tick. Esto no legitima conservar ese ejecutor JS como
arquitectura final.

Una reconstrucción global del grafo conserva invalidación conservadora por
perfil. Las intenciones pendientes sin corredor conocido todavía despiertan en
cambios de su perfil: faltan dependencias nativas de frontera para restringirlas.
Reconfirmar una lista de portales idéntica ya no encola todas las rutas; añadir o
quitar portales notifica sus extremos. Las hojas móviles de puertas siguen sin
estar cubiertas por este incremento.

Contadores nativos reales: `nav_intent_route_validation_count`,
`nav_intent_route_validation_segments`, `nav_intent_reconcile_candidate_count`.
No cuentan preparación, GPU ni todas las validaciones JS: no deben presentarse
como coste global de navegación o prueba F superada.

Pruebas nuevas con WASM real: muro lejano → cero candidatos/comprobaciones de la
ruta; muro intersecante → una comprobación y revocación exacta; ruta completada
→ ninguna suscripción restante. Cuatro rutas nativas disjuntas conservan tres
generaciones intactas al cortar solo una, con un único candidato y comprobación.
La batería nueva tiene 10 pruebas; batería dirigida de **73 aprobadas sin skips**
(`.cache/intent-dependencies-regression.tap`), incluido ABI pthread, recuperación
histórica y host gráfico simulado. Bridge: 18 aprobadas y los 2 fallos anteriores.
Incursiones: 14 aprobadas y otros 4 fallos `Plan de incursión incoherente`, también
reproducidos con test/bridge/WASM anteriores (baseline local `raid-results.tap`).
No se han cambiado validaciones de guardado ni fixtures para hacerlos pasar.

Smoke gráfico real: `tests/browser/webgpu-baked-walk.html` dibujó tres fases
precocinadas de hiena con backend WebGPU nativo y scopes de validación sin error
en NVIDIA/Turing. **No es un facóquero consumiendo su ruta AttackCrops** y no
cuenta como A ni D. Sigue pendiente la vertical completa, la anticipación de
conflictos móviles y el canal autoridad → dibujo independiente de recursos.

Build posterior a ambos incrementos: `VITE_PRESENTATION_BACKEND=webgpu-worker`
y `VITE_WEBGPU_REMOTE_DRAW=true`, salida `.cache/intent-route-correction-build`,
correcto (con aviso de tamaño de chunks). No se publicó ni modificó `dist/`.

## Control gráfico independiente (implementado, conexión de producto pendiente)

`native-route-control.js` consume el mismo log nativo v2 y solo conserva permisos
por actor/versión. No contiene polilíneas, cuerpos, colisiones ni planificación.
Una época antigua no autoriza nada; secuencias discontinuas, cambios sin revocar
la versión previa y revocaciones incoherentes se rechazan. Los bindings resuelven
el permiso una vez en admisión; el dibujo lee su límite temporal, sin consultar
rutas o validar identidades por fotograma.

El host WebGPU admite un `MessagePort` de control distinto del de recursos. Sus
revocaciones no entran en la FIFO que puede esperar pipelines. Los relojes de
ruta quedan limitados por el instante nativo de revocación y los otros actores
siguen avanzando. La admisión vuelve a comprobar permisos **después** de esperar
recursos, impidiendo que una carga tardía readmita una versión retirada. Una
revocación anterior al tiempo ya presentado provoca fallo explícito, no rebobina
la pose ni se presenta como una corrección visual segura.

Se amplió el harness concurrente existente con `auditNativeRouteControl()`. Tres
ejecuciones reales en NVIDIA/Turing bloquearon síncronamente el preparador
500,06 / 500,61 / 500,07 ms: el dibujante hizo 15 fotogramas en cada bloqueo,
usando un único paquete, y recibió la revocación durante el bloqueo. Readback de
un buffer GPU confirmó que solo el reloj revocado se detuvo en su límite; el
otro continuó. Máximos de intervalo del Worker: 33,90 / 33,41 / 33,54 ms. Datos
en [native-route-control-20261108.json](performance/native-route-control-20261108.json).

**Alcance limitado:** se usa un triángulo, no modelos/poses de personajes; el
fixture ajusta el reloj manualmente y no avanza simulación. Los eventos AttackCrops
sí proceden del WASM real. No es A, C ni D de aceptación, ni una prueba de FPS de
partida. El bootstrap/runtime de producto aún no conecta este canal; siguen
pendientes pérdida de canal, coordinación de revocación antes de cambios físicos,
reservas/conflictos nativos y ejecución temporal completa. Los Workers son
hermanos creados por Window: un ensayo inicial de dibujante anidado en el
preparador falló por falta de proveedor rAF en Chromium y se corrigió el harness
para respetar la propiedad usada por el producto.

Regresión de este incremento: **84 pruebas aprobadas sin skips**, sintaxis de
scripts de navegador correcta y build WebGPU remoto correcto (salida
`.cache/native-route-control-build`). Esto no cambia el estado abierto de A6.

## Bootstrap nativo y publicación directa (conexión entre Workers en curso)

El registro nativo conserva ahora secuencia/tiempo de asignación por intención y
exporta una base de permisos activos ordenada por actor. No copia polilíneas ni
otro grafo, no drena el log, no simula y no valida navegación al leerla. La base
incluye el high-water mark real del mismo flujo v2; un receptor nuevo no necesita
reproducir asignaciones históricas potencialmente obsoletas.

El bridge ofrece observadores con cursor sobre ese log nativo, sin mantener otro
diario JS. Publica tras mutaciones y antes del drenaje/coalescing heredado. Un
reset retira observadores y cambia la época expuesta, incluso al reutilizar la
misma instancia WASM. `native-intent-control-publication.js` transfiere base y
cambios directamente y mantiene únicamente cursores ACK. La autoridad de
simulación incorpora esta conexión y retira la anterior después del ACK de la
nueva base. No cambia el orden de comandos ni fuerza muestreos físicos.

El host admite una base inicial ligada a la sesión de transporte y hace rendezvous
con su secuencia antes de admitir paquetes de rutas. Las dos colas pueden llegar
en distinto orden sin admitir datos no autorizados. Un relevo normal congela los
relojes de rutas de la generación retirada; errores o resets fallan explícitamente.

**95 pruebas dirigidas aprobadas sin skips**, incluidos WASM standalone/pthread,
MessageChannel real, snapshots/eventos iguales con y sin observador y relevo de
conexiones. Falta el cableado cliente/Worker/bootstrap de la aplicación. Esta
base refleja permisos del planificador nativo actual; no acredita seguridad
futura de la locomoción JS ni resuelve la coordinación previa a cambios físicos
o pérdida silenciosa del canal. La autorización autónoma no se activa con ella.

## Cableado de producto y prueba entre Workers reales

El arranque `webgpu-worker` con dibujo remoto crea un puerto separado en Window,
lo entrega directamente al dibujante y transfiere su otro extremo a la autoridad
mediante el runtime alojado. El preparador no recibe ese puerto. La negociación
se realiza entre comandos, no consume una secuencia de juego ni inserta snapshots.
También funciona con una autoridad preparada antes del renderer. El relevo de
superficie reconecta el control antes de iniciar el replay gráfico y retira el
control anterior después de aceptar la nueva base. Errores de arranque y cierre
rechazan RPC pendientes y no autorizan generaciones antiguas.

Se comprobó la ruta real con una incursión guardada de facóquero y un Shield
legal: autoridad WASM en Worker, host, preparador de producto y dibujante WebGPU.
Un wrapper **solo de prueba** bloqueó síncronamente el preparador 500 ms. En tres
ejecuciones NVIDIA/Turing, la secuencia nativa avanzó de 1 a 5, con una revocación
recibida durante el bloqueo (78–82 ms desde su inicio, **no una medida aislada de
latencia de transporte**). El dibujante ejecutó 15 frames, 14 de repetición, por
ejecución; máximos de intervalo alrededor de 33,49 ms. No hubo errores reportados.

El harness concurrente también completó checkpoint/replay y reconexión del puerto,
con tres chunks residentes y un único `NightStarted`, sin cambiar la época de la
autoridad y retirando el controlador anterior. El arranque real de `main.js`,
con backend WebGPU remoto, alcanzó juego/tutorial, controlador conectado y cero
errores GPU en la inspección. Había atraso gráfico histórico: no se afirma que
esta corrección lo elimine.

Datos y ámbitos exactos: [native-control-runtime-20261108.json](performance/native-control-runtime-20261108.json).
**No hay locomoción autónoma nativa ni meshes de personajes en el ensayo de
bloqueo** (`admissions=0`); no es cierre de A ni D. Sigue vigente el ejecutor
protegido de JS. El siguiente trabajo es ejecución temporal/reservas nativas,
reloj de presentación causal (incluidas pausa y velocidad sin preparador) y
aplicación segura de cambios físicos; después se conecta la trayectoria GPU real.

La espera de una base/secuencia de control necesaria para admitir una generación
tiene timeout explícito (10 s por defecto): un canal ausente no deja una promesa
retenida para siempre. Es un límite de negociación/admisión, **no** una ventana
de autorización de movimiento; no resuelve la pérdida silenciosa de un canal con
planes ya activos.

Regresión conjunta de los grupos dirigidos: **219 aprobadas, sin skips**. Sintaxis
de navegador y build WebGPU remoto correctos (`.cache/native-control-product-*`).
Al ampliar la batería aparecen otros tres fallos históricos: dos `releaseCommand
is not a function` en `worker-runtime-host-historical-recovery.test.js` y una
expectativa `publication` frente a `presentationFailure` en
`worker-runtime-host-timeline.test.js`. Los tres se reprodujeron usando el host
anterior (`8ce756eb6`) con los demás módulos del árbol actual, en
`.cache/native-control-runtime-baseline/`; esos tests dejan temporizadores vivos
al fallar y el proceso tuvo que limitarse. No se cambiaron fixtures ni cambios
locales ajenos, y no se declara limpia la suite completa.

## Barrido estático continuo nativo — primer dominio de ejecución

Se añadió `spatial_execution_segment_clear` al mismo mundo C++ (standalone y
pthread), sin otro grafo ni callbacks JS. Su alcance inicial es explícito:
animales sobre Desierto residente. No autoriza cuerpos móviles, hojas de puerta,
otros biomas ni locomoción GPU. Los códigos diferencian paso continuo probado,
bloqueado/no probado, residencia desconocida, clase no soportada y petición inválida.

El terreno nativo es triangular y lineal a trozos. El barrido corta cada conector
en todos los cruces de triángulo de las muestras desplazadas del footprint y de
pendiente. Dentro de cada intervalo el vector de diferencias finitas es afín y
su norma convexa: basta comprobar sus extremos, no muestras cada 0,2 m. Se acotan
también los errores de entrada/salida float de las guardas heredadas. Props,
rectángulos y polígonos se resuelven por distancias/intersecciones continuas con
los índices y geometrías nativos existentes. La residencia incompleta no se
convierte en un certificado de paso.

Una regresión real coloca una penetración de polígono de 0,1 mm entre muestras:
`spatial_local_clear` admite el segmento, la guarda de aterrizaje rechaza el punto
intermedio y el nuevo barrido rechaza el conector **antes de ejecutarlo**. Otras
pruebas contrastan 12 conectores aceptados contra 2.892 posiciones de las guardas
JS/nativas anteriores, sin consultas de planificación ni cambios al mundo. Las
guardas JS y el movimiento de producto permanecen activos; no se ha sustituido
seguridad por muestreo más denso ni se considera A6 cerrado.

Regresión dirigida posterior: **223 aprobadas sin skips**, con el WASM recién
reconstruido y ABI de la nueva operación comprobado también en pthread. La
aritmética float del barrido heredado se conserva; el margen double se usa solo
cuando la nueva operación de ejecución lo solicita explícitamente.

## Candidatos temporales nativos sobre la misma ruta versionada

`RouteSlot` conserva origen, tiempo inicial, velocidad, radio/perfil y distancias
acumuladas junto a su geometría y generación. El modo temporal 1 comprueba el
barrido continuo antes de publicar la asignación; un fallo de preparación no
revoca la versión anterior. El modo 0 conserva los llamadores y el comportamiento
de producto existentes. El bridge ofrece `planAttackCrop(...,{timedRoute:true})`
solo para marcha estable; rechaza `entering`, cuya transición 3,8 → 1,5 m/s no se
ha sustituido por una velocidad constante.

`nativeRouteTiming(handle)` copia ese candidato; `sampleNativeRoute(handle,at)`
evalúa su posición/tangente/fase con búsqueda binaria de distancia, satura en la
hora final declarada y no planifica, valida, publica posiciones ni mueve actores.
La invalidación retira el handle exacto y la replanificación del mismo objetivo
conserva el modo/radio temporal. La suscripción espacial incluye ahora las muestras
de pendiente y los vértices del terreno que pueden afectar el barrido. La
comprobación continua por eventos sigue siendo nativa, no una revisión por tick.

Evidencia: **229 pruebas dirigidas aprobadas sin skips**, standalone recién
reconstruido y exports temporales comprobados en pthread. Las seis pruebas nuevas
cubren el plan completo de varios segundos, 1.000 evaluaciones sin planificación
ni validación, paridad con `walkTo` protegido, revocación/reemplazo por evento,
compatibilidad untimed/entering y fallo atómico de preparación. También comprueban
saturación, rechazo de tiempos inválidos y retiro por reset de autoridad.

**Límite explícito:** `executionScope:'static-desert-animal'` y
`authorizedAutonomy:false`. No hay ejecución lógica de estos candidatos, reservas
de trayectorias, conflictos temporales, garantía causal del reloj ni seguridad
pre-mutation. No se conectan al movimiento GPU ni se retiran guardas JS. A6 y el
acceso a B/C permanecen abiertos/bloqueados respectivamente; esta regresión
dirigida no declara limpia la suite completa ni sustituye aceptación real A–F.

## Reservas continuas y frontera de mutación de cuerpos — 2026-11-09

La admisión `reserveNativeRoute(handle,bodyId)` liga el candidato temporal a una
identidad del registro físico nativo existente. `RouteSlot` conserva la reserva;
el índice inverso cuerpo → slot solo referencia esa misma ruta. No hay otro
planificador, grafo ni copia de trayectorias o cuerpos. Se exige perfil/topología
vigentes, origen/radio/actividad concordantes y reloj de asignación actual. Un
rechazo no altera el candidato, la reserva anterior, los cuerpos ni el log.

El narrow phase corta ambas trayectorias en la unión de sus tiempos de waypoint
y resuelve analíticamente la separación relativa afín en cada intervalo, con
margen conservador de redondeo. Incluye el cuerpo detenido en el destino durante
tiempo indefinido. La admisión consulta los suscriptores de sectores existentes
para otras rutas y el índice físico existente para discos actuales. El testigo
de conflicto conserva cuerpo/actor, generación e instante de primer contacto;
empates se ordenan por identidad, no por orden de tablas hash.

El registro de cuerpos llama una frontera nativa **antes** de modificar posición,
radio, tipo o participación. Una inserción/actualización que invada una reserva
futura se rechaza atómicamente. Los cambios lejanos no inspeccionan polilíneas.
Un cuerpo ligado no puede moverse ni cambiar política silenciosamente; publicación
idéntica sigue siendo válida. Eliminar/resetear cuerpos retira primero las rutas
ligadas con sus handles revocados exactos. Finalizar/cancelar/invalidar rutas
retira sus reservas con el ciclo de vida existente. El ejecutor JS no puede
modificar el cursor de una ruta reservada.

Se reutiliza la política nativa existente de encuentros trabajador/animal: no se
prohíbe el contacto de combate permitido ni se inventa una regla de separación.
El escape de solapamientos heredados sigue fuera de la admisión ordinaria y
mantiene sus guardas anteriores. Las sesiones sin reservas conservan su conducta.

**Evidencia:** 11 pruebas nuevas con terreno/WASM real; cruce anticipado, mismo
cruce separado temporalmente, destino detenido, cuerpo estacionario, mutación
atómica, excepciones de contacto, retirada/reset, handles/perfiles/tiempos,
primer contacto entre waypoints repetidos e índice con 120 cuerpos lejanos.
Las fronteras de acción/cancelación retienen la protección de golpes comprometidos.
La batería ampliada tiene **253 aprobadas sin skips**, incluido ABI pthread y
paridad de detours/contactos frente al WASM previo de Git. Mil evaluaciones del
reloj no vuelven a admitir ni comprobar conflictos. Log local:
`.cache/native-route-reservations-regression.tap`.

**Límites:** opt-in, `authorizedAutonomy:false`. Los discos físicos actuales se
conservan ocupados además de las trayectorias: es una admisión conservadora,
no la política de tráfico final. Un conflicto todavía no desencadena cesión,
desvío ni ejecución lógica. La frontera nueva solo protege mutaciones del
registro físico, no puertas/terreno/topología ni publicaciones gráficas ya en
vuelo. No se ha habilitado movimiento GPU, retirado JS ni superado el gate C de
tráfico integrado. Siguen pendientes reloj causal, pérdida de canal, frontera
de mutación completa y aceptación real A–F; **A6 permanece abierto**.

## Preparación temporal común: trabajadores — 2026-11-09

`prepareNativeRouteMotion(handle,facts)` transforma la ruta ya seleccionada por
la intención nativa, sin solicitar otra ni planificar en JS. Funciona sobre los
mismos slots de tareas directas, riego, reparación y regreso; un cambio temporal
publica un reemplazo versionado y revoca exactamente la generación anterior.
Los fallos conservan geometría, asignación, reservas y log. No se permite retimar
una reserva activa ni convertir tarde una ruta y reiniciarla en su origen viejo.

El modo de trabajador usa las reglas actuales de `moveWorker`: 0,72 m/s de base
al andar, 1,6 al correr, multiplicador de desplazamiento 1,5, carrera limitada por
presupuesto salvo huida, carga sin carrera, recuperación/incapacitación, y factor
0,35 solo en la carrera lenta. Las fases conservan sus denominadores originales:
carrera sobre 1,6 × 1,5 y marcha/carga sobre 0,72. Los datos de urgencia, carga,
estado y presupuesto se suministran en la frontera de preparación; no se acepta
una velocidad arbitraria del renderer. Esas decisiones de gameplay aún no han
migrado todas a C++, ni se afirma lo contrario.

La evaluación y el solver de reservas son comunes a animales y trabajadores.
La unión temporal incluye también el agotamiento de carrera dentro de una arista:
no basta con los waypoints geométricos. Tras una replanificación de trabajador se
exigen hechos de movimiento actuales, no se reutiliza un presupuesto que podría
haberse consumido. Las lecturas de candidatos usan layouts explícitos de 20
doubles (plan) y 18 (muestra), comprobados por el bridge y en pthread.
Se rechazan también relojes cuya cuantización exceda el margen espacial del
solver o fusione un cambio de velocidad: no se presenta ese caso como continuo.

El barrido estático continuo se amplió a perfiles de trabajador en Desierto,
respetando sus máscaras. Los pasos por barreras/polígonos permitidos al trabajador
se tratan como no soportados cuando intersectan el conector: podrían representar
puertas cuyas hojas y reloj aún faltan. No se usa la pasabilidad del grafo como
certificado de ejecución de una puerta móvil. Otros biomas siguen fuera del
dominio probado.

Ocho pruebas nuevas con WASM real: preparación/revocación sin planificación,
paridad de posición/fases/presupuesto con nueve combinaciones de `moveWorker`,
conflicto dentro de una arista con cambio de velocidad, mil evaluaciones sin
validaciones ni mutación de gameplay, guardas heredadas y rechazo de puertas,
retiro de reserva/cambio de hechos, tareas directas/riego/reparación realmente
comprometidas por el planner nativo y distancia cero/fallos atómicos. Regresión
ampliada: **261 aprobadas sin skips**, con ambos binarios reconstruidos y detours
heredados contrastados contra el WASM previo de Git. Log:
`.cache/native-worker-motion-regression.tap`.

**No es cierre de A6:** preparación y reservas siguen opt-in y con
`authorizedAutonomy:false`; el producto conserva su ejecutor/guardas actuales.
Faltan ejecución lógica común y consecuencias, resolución de cesiones/desvíos,
puertas/otros biomas, reloj causal, pérdida de canal y aceptación integrada real
de animales **y trabajadores**. Ningún éxito específico de AttackCrops sustituye
ese alcance.

## Avance cinemático nativo y cierre de paradas — 2026-11-09

`beginNativeRouteExecution` activa explícitamente una cohorte de rutas admitidas
en el mismo instante lógico; `advanceNativeRouteExecution` evalúa sus planes y
mueve **los cuerpos reales del registro nativo existente**. No es ya solo una
lectura de posiciones previstas. El mismo núcleo sirve a trabajadores y animales,
actualiza posición/cursor y presupuesto nativos y usa una entrada C++ de escritura
física que no está exportada a JS. Preflight y evaluación de toda la cohorte
preceden a cualquier escritura. No se añaden cuerpos, planners ni timetables
autoritativos paralelos.

Mientras esta ejecución esté activa, `nav_intent_set_time` no puede saltarse el
avance de cuerpos. Pausa/repetición de tiempo son idempotentes; regresiones se
rechazan. Las proyecciones JS de trabajadores con posición obsoleta o inicio de
acción antes de llegar rechazan el lote entero. Las entradas nativas de acción
también exigen llegada en esta clase. Llegar mantiene el disco final reservado;
no inicia por sí solo trabajo/ataques ni aplica daño. Las poses detenidas se
conservan sin volver a evaluar la ruta en pasos posteriores.

Una cancelación no puede simplemente borrar la reserva de una trayectoria que
ya estaba moviéndose: su cuerpo pasa a detenerse en otro punto. El evento consulta
los suscriptores existentes y retira las reservas futuras que intersecan ese
disco; repite el proceso con los nuevos cuerpos detenidos mediante una cola
ordenada e **iterativa**, no recursión por actor ni revisiones periódicas. Las
intenciones/tareas/objetivos afectados quedan `NeedsPlan`, con sus leases; los
no afectados continúan. Eliminar un cuerpo o resetear el registro no introduce
falsamente un nuevo obstáculo detenido. Cada retirada publica el handle exacto
antes de reutilizarlo.

**Dominio provisional de mundo fijo:** la prueba continua queda ligada a los
contadores nativos exactos de terreno, residencia y overlays. No se puede
reestampar una prueba antigua al iniciar ejecución, ni admitirla tras una mutación
que no cambie la pasabilidad del grafo. El avance compara esos tres contadores
una vez por cohorte; cualquier cambio devuelve `world-changed` sin modificar
cuerpos ni reloj. No hay consultas de colisión/validez por ruta y paso. Este
bloqueo conservador incluso ante cambios lejanos **no es** la política final de
mutación dirigida y **no impide todavía** que una API estática inserte geometría
bajo un cuerpo en el instante del evento. Por eso no habilita autonomía gráfica.

Diez pruebas nuevas con WASM real cubren ejecución mixta, reloj/pausa, llegada y
acciones no duplicadas, cascada A → B → C con D intacto, aborto por mundo cambiado,
retirada/reset de cuerpos, proyecciones JS obsoletas, actualización del índice
físico con 80 cuerpos lejanos, bootstrap de prueba estática obsoleta y conservación
de una tarea realmente comprometida al detener su ruta. Cien avances de dos
actores producen 200 evaluaciones, cero planificación, admisiones o validaciones
adicionales y ningún evento/publicación de posición de locomoción. Contadores:
`nav_intent_execution_advances`, `..._evaluations`, `..._body_updates` y
`..._stop_invalidations`.

Regresión: **271 aprobadas sin skips**, standalone/pthread reconstruidos, exports
verificados y contactos/detours heredados contrastados con el WASM anterior de
Git. Log: `.cache/native-route-execution-regression.tap`. No hubo ejecución
gráfica nueva en esta tanda; los servidores QA cancelados por el reinicio no se
usaron como evidencia de WebGPU.

**A6 continúa abierto.** Este ejecutor sigue opt-in y
`authorizedAutonomy:false`; las entidades y consecuencias del producto conservan
su propietario/guardas actuales. Las fases aquí son relativas a la ruta; falta
conectar offsets persistentes, guardado/restauración y consecuencias de gameplay
sin doble autoridad. El bridge no revierte automáticamente una transacción JS
que el llamador haya adelantado: en caso de rechazo debe abortarse esa transacción.
Faltan asimismo resolver los conflictos (no solo pararlos), transacciones previas
de mundo/puertas/residencia, otros perfiles/biomas y reloj/ACK causal con política
de pérdida de canal antes de la aceptación WASM/WebGPU completa para **todas** las
intenciones. Ningún build o test de este incremento cierra A6.

## Fronteras dirigidas de overlays estáticos — 2026-11-09

Se sustituyó el bloqueo indiscriminado de la cohorte para las entradas nativas
de muros rectos/orientados, polígonos, retirada, cambios de pasabilidad y lotes
rígidos. El propietario de mundo entrega vistas temporales de **su geometría
validada** al propietario existente de intenciones: no hay otro registro de
obstáculos, planificador ni consulta geométrica JS. Las intersecciones usan los
mismos kernels C++ de cajas expandidas y distancias/bordes de polígonos que el
barrido continuo. La aritmética float de las guardas heredadas se conserva.

Antes de modificar IDs, índices, máscaras o revisiones:

1. El índice de cuerpos comprueba la propuesta contra los footprints actuales.
   Se rechaza un solapamiento físico según la máscara del perfil, sin inventar
   prohibiciones para cuerpos con paso declarado. Un paso de trabajador todavía
   no soportado para autonomía retira su ruta, no convierte una mutación físicamente
   permitida en una regla nueva de colisión.
2. Los suscriptores espaciales existentes localizan las rutas potencialmente
   afectadas. Solo sus sufijos desde la pose/cursor nativos se contrastan con la
   propuesta continua. No se revalidan todas las rutas ni se recorren prefijos
   ya ejecutados. Las versiones interceptadas se revocan y se cierra la cascada
   de cuerpos detenidos **antes** de hacer efectiva la geometría.
3. Tras el commit, solo una transacción overlay conocida, partiendo del stamp
   reconocido y con incremento exacto de revisión, extiende la prueba de los
   supervivientes. Estos mantienen handle, tiempos y generación, sin replanificar.
   Una edición previa de terreno/residencia no puede quedar reconocida por
   accidente al procesar después un overlay.

Los lotes de altas y de retirada/alta hacen preflight de **todas** las nuevas
piezas antes de la primera retirada o revocación. Un rechazo deja intactos IDs,
geometría, permisos y log; no se confía en deshacer un lote parcialmente aplicado.
Restaurar geometría en bloque durante ejecución activa se rechaza: restauración
requiere la frontera de sesión correspondiente. Las previews siguen usando su
WASM aislado o los servicios read-only; ni una preview abortada retira permisos
de ejecución confirmados.

**Evidencia:** 17 pruebas nuevas con WASM real, incluyendo edición lejana con
cero candidatos/segmentos de ruta, retirada específica de una ruta orientada con
otra intacta, rechazo bajo un cuerpo, penetración futura de polígono de 0,1 mm,
paso de trabajador no soportado, permisos físicos conservados, lotes rechazados
atómicamente y aceptados, endurecimiento/relajación de máscara, obstáculos detrás
del cursor, cierre A → B → C dejando D en marcha, rechazo de restore activo y
aislamiento de previews. El índice usa los bounds reales de un muro largo y
estrecho, no su cuadrado envolvente. Los cambios lejanos no incrementan validaciones ni
barridos continuos de rutas; los contadores nuevos distinguen candidatos,
segmentos, footprints, revocaciones, rechazos y commits de esta frontera.

Regresión ampliada: **288 aprobadas sin skips**, con standalone/pthread recién
reconstruidos y ABI verificado. Además, **22 pruebas de geometría heredada sin
skips** cubren escapes de solapamiento, overlays de puertas en seis biomas,
proyecciones de obstáculos, previews y commit diferido. Contactos/detours se
contrastaron también contra el WASM anterior de Git. Logs locales:
`.cache/native-static-mutations-regression.tap` y
`.cache/native-static-mutations-legacy-geometry.tap`. La fixture de ejecución se
comparte ahora como helper de pruebas; la receta/guardado real no se ha alterado.

**Límites:** solo la cohorte opt-in y estas mutaciones de overlays están cubiertas;
terreno/residencia no instrumentados siguen fallando de forma conservadora. La
frontera es nativa y ocurre en su reloj lógico actual: no equivale a ACK ni a
revocación oportuna de fotogramas que un dibujante pudiera haber adelantado. No
resuelve todavía hojas móviles, impactos/ragdoll, cesiones/desvíos ni la política
de comando de construcción ante un rechazo físico. La transacción JS exterior,
fases persistentes, consecuencias y save/restore de gameplay siguen pendientes
de integración. No se activó autonomía GPU ni se retiraron guardas; **A6 sigue
abierto para todas las intenciones, incluidos los trabajadores**. Estas pruebas
no sustituyen la aceptación real A–F ni declaran limpia la suite completa.

## A6-04.b — Residencia y leases de datos — 2026-11-09

La carga/descarga usa ahora las fronteras del mismo propietario nativo. Publicar
datos deterministas nuevos es disponibilidad monótona, no una razón para parar
rutas ya probadas. La publicación real del pthread también está instrumentada,
después de sus comprobaciones de inputs/perfiles obsoletos. Una carga conocida
solo reconoce el incremento exacto de residencia, nunca una edición pendiente
de terreno u overlays no reconocidos.

La retirada explícita de autoridad (`removeChunk[s]`) comprueba todos los chunks
presentes y únicos del lote antes de borrar ninguno. Se retiene el terreno usado
por cuerpos actuales, incluyendo el halo de pendientes, vértices y cajas de los
tramos cortos del barrido. El halo conservador de 2,5 m se suma al radio y a la
envolvente de redondeo existente. Si los datos solo se necesitan en el futuro,
se revocan las rutas dependientes y se cierra la cascada de paradas antes de
retirarlos; las rutas ajenas conservan su generación.

Se distingue esa operación de la liberación de caché gráfica
(`releaseChunk[s]`): **evictar una malla no puede cancelar una intención**. Esa
liberación conserva también los datos de todo sufijo reservado, incluso durante
la preparación anterior a activar ejecución. El propietario nativo devuelve la
decisión; no hay comprobación de ruta/footprint en JS ni otro planificador.

Se corrigió el espejo de recursos: un `-2` nativo por dependencia retenida no se
interpreta como retirada ni se anuncia con `onRelease`. La retención guarda el
resultado nativo y reintenta cuando cambia una revisión de pins. Esa revisión
cambia en fronteras de tiles/halos, actividad/retirada de cuerpos y cambios de
leases, no en cada posición ni cada fotograma. En pasos sin esas fronteras solo
se lee metadata; no se repite el preflight físico o de rutas. Los rangos de pin
incluyen el redondeo de los bordes vecinos para no perder un despertar de
liberación. Un lote retenido permanece íntegro, aunque pueda retener también
datos ajenos hasta un próximo evento de pin.

El dominio físico persiste cuando termina la última ruta: un cuerpo detenido
sigue necesitando terreno y sigue protegido frente a nuevos sólidos. Solo
retirar/resetear los cuerpos o cambiar la sesión retira esa propiedad. Destruir
la retención gráfica no destruye esos datos físicos; el propietario de autoridad
mantiene su ciclo de vida independiente.

**Evidencia:** 17 pruebas nuevas con WASM real, incluidas dos publicaciones en
pthread real. Cubren cargas/retiradas lejanas, cuerpo y halo actual, atomicidad
de lotes, revocación específica de datos futuros, leases de preparación y de
ejecución frente a liberación gráfica, cien avances sin nuevos preflights de
retención, fronteras de pin, cuerpo detenido, actores registrados no ejecutados,
actividad/retirada, retorno de propiedad gráfica, dispose, muestras de borde,
edición de terreno no reconocida, duplicados/ausencias y publicación obsoleta.
Las pruebas anteriores del fallback global ahora usan una edición de terreno:
la residencia conocida dejó de pertenecer a ese fallback, no se eliminó su
protección.

**311 pruebas dirigidas y 39 de streaming/geometría heredada aprobadas sin
skips**, con standalone/pthread reconstruidos, ABI verificado y contactos/detours
contrastados contra el WASM anterior de Git. Logs:
`.cache/native-residency-regression.tap` y
`.cache/native-residency-legacy-stream-geometry.tap`.

**Seguimiento:** A6-04.b implementado/validado en el dominio nativo actual;
**A6-04 sigue parcial** por props, terreno, hojas móviles y coordinación de
efecto gráfico. La prueba continua sigue limitada a Desierto, el ejecutor de
producto no se ha activado y `authorizedAutonomy:false` se conserva. Faltan
también entidades/fases persistentes/consecuencias, resolución de tráfico y reloj
causal GPU. No se reclama aceptación WebGPU real nueva ni cierre de A6.

## A6-04.c — Supresión/restauración canónica de props — 2026-11-09

La supresión individual o por conjunto es monótona: no introduce sólidos ni
modifica el relieve. El cambio conocido de inputs puede extender la prueba de
los supervivientes, sin planificación o revalidación de rutas. La supresión por
conjunto aprovecha los registros residentes y no ejecuta una receta especulativa.

La restauración protegida no confía en `removedPropGeometry` como certificado:
esos registros son witnesses de refresco y se invalidan con asentamientos. Antes
de tocar el conjunto vivo, el mundo calcula el delta de identidades y sus chunks
candidatos mediante la **misma** posición procedural C++ que usa el generador.
En una vista temporal thread-local de la propuesta se ejecuta la receta actual
solo para candidatos residentes, incluyendo halos cuyo dueño esté descargado.
No se publican chunks, no se cambia residencia, no se reconstruye otro mundo ni
se altera el grafo. El estado seleccionado se conserva mediante RAII.

De esa receta salen los sólidos realmente nuevos. Sus discos usan el mismo
kernel nativo de distancia al segmento del barrido continuo, no sus cajas
envolventes. Decoración no sólida no inventa colisiones. Los índices existentes
comprueban cuerpos actuales y sufijos futuros, incluidos leases preparados aún
sin ejecución. Un sólido bajo un cuerpo rechaza todo el reemplazo, también sus
supresiones acompañantes; no modifica identidad, witnesses, buffers seleccionados,
reloj, revisiones ni log confirmado. Una ruta interceptada se retira antes del
commit, con el cierre nativo de sus paradas.

Tras la aprobación se intercambia el conjunto, se actualizan witnesses y se
refrescan todos los candidatos/halos canónicos que podrían materializar el delta.
No se usa el antiguo corte de 64 registros para provocar un refresco global:
solo se actualizan datos y sectores locales. Incluir los candidatos canónicos
evita depender de bounds recomputados desde posiciones visibles ya redondeadas.
El incremento de inputs se reconoce exactamente (incluido el batch unitario
heredado de dos incrementos), nunca absorbiendo una edición previa de terreno.

El bootstrap legacy y el formato de supresiones guardadas se conservan; los
casos protegidos con coordenadas procedurales no soportadas fallan antes de
generar o comprometer datos. El bridge exige la capacidad nativa de mutación de
props, versión 1: no habilita esta ruta con un WASM antiguo silenciosamente.

**19 pruebas nuevas con WASM real:** supresión individual/bulk, restauración
lejana, rechazo bajo trabajador y animal, cuerpo detenido, intercepción futura
sin afectar otra ruta, lease preparado revocado, separación disco/caja,
decoración bajo cuerpo, reemplazo mixto atómico, witness borrado, dueño descargado
sin publicación scratch, sólido de halo con dueño ausente, historial de más de
64 cambios, entradas inválidas/no soportadas, edición de terreno pendiente y
dos casos de pthread real. Un rechazo mantiene publicable un resultado en vuelo;
un cambio aceptado vuelve obsoleto ese resultado sin detener una ejecución ajena.

Regresión: **330 dirigidas + 39 de streaming/geometría + 74 de receta, estado y
consultas lejanas**, todas aprobadas sin skips. Standalone/pthread reconstruidos,
ABI/capacidad verificados; contactos/detours contrastados contra el WASM previo
de Git. Logs: `.cache/native-props-regression.tap`,
`.cache/native-props-legacy-stream-geometry.tap` y
`.cache/native-props-legacy-recipe.tap`.

**Seguimiento:** A6-04.c implementado/validado en el dominio nativo actual;
A6-04 sigue parcial por terreno, puertas móviles y coordinación física/gráfica.
La frontera sigue en reloj lógico nativo, no concede ACK de fotogramas adelantados
ni decide la política exterior de un comando rechazado. Continúan pendientes
entidades/fases/consecuencias de gameplay, otros perfiles/biomas, tráfico resuelto
y reloj causal GPU. `authorizedAutonomy:false` y las guardas de producto se
mantienen. No se reclama nueva aceptación gráfica A–F ni suite general limpia.

## A6-04.d — Propuestas transaccionales de terreno — 2026-11-09

Las altas, reemplazos y lotes de asentamientos tienen una frontera nativa en el
dominio Desierto. La propuesta conserva el mundo vivo: una vista RAII de sitios
y muestras residentes permite generar primero todas las alturas candidatas y
después sus props. Así los halos no consultan una mezcla de alturas antiguas y
nuevas. No se publican chunks, datos visuales, sitios, revisiones o grafos durante
esa preparación; el estado seleccionado vuelve íntegro antes del preflight.

Se identifican los vértices realmente distintos y los discos sólidos que la
receta vuelve a introducir, por ejemplo al retirar una zona de limpieza. Sus
bounds consultan los índices existentes de cuerpos y suscriptores de rutas.
Solo los candidatos se contrastan con la propuesta: los datos de apoyo/pendiente
de un cuerpo actual deben permanecer iguales y libres de nuevos sólidos. Un
cambio bajo trabajador, animal o cuerpo detenido rechaza la transacción completa;
no se inventa un traslado vertical ni se decide una nueva regla de construcción.

Un sufijo futuro dependiente de vértices o sólidos modificados se retira antes
de hacerlos efectivos, incluyendo leases preparados y el cierre de sus paradas.
Las otras rutas conservan versión y reloj. La dependencia conservadora se obtiene
de los tramos de hasta un metro y sus halos de radio, pendiente y vértices: no
es muestreo de seguridad cada cierta distancia ni comprobación por tick. Las
ediciones lejanas y reemplazos geométricamente equivalentes no consultan rutas.

Tras aprobar se publican todos los datos candidatos antes de reconstruir perfiles
y bordes; el conjunto de sitios y el contador de inputs se comprometen juntos.
Solo se reconoce el incremento exacto esperado de terreno, conservando los
otros contadores. El generador de mundo completo no es una vía de escape:
requiere retirar antes la autoridad física o sus leases y el wrapper no altera
su espejo de residencia si esa operación se rechaza. El bridge exige el servicio
de mutación de terreno versión 1. Los caminos legacy no activados mantienen su
receta y formato de guardado.

**14 pruebas nuevas con WASM real**, dos con pthread: edición lejana, rechazo de
apoyo de trabajador/animal y cuerpo detenido, publicación futura con otro actor
intacto, lease preparado, reemplazo equivalente, batch atómico, entradas inválidas,
regeneración de mundo protegida, cuerpo remoto grande y regeneración de un sólido
por pérdida de hábitat. Un rechazo conserva publicable un resultado pthread;
un cambio aceptado lo vuelve obsoleto sin parar rutas ajenas.

Regresión: **344 dirigidas + 39 de streaming/geometría + 74 de receta/estado**,
aprobadas sin skips, standalone/pthread reconstruidos y ABI comprobado. Los tests
anteriores de terreno no instrumentado ahora verifican el rechazo de reemplazar
el mundo durante propiedad nativa y la continuidad de las otras transacciones:
los setters públicos de asentamientos dejaron de ser un escritor no cubierto.
Logs: `.cache/native-terrain-regression.tap`,
`.cache/native-terrain-legacy-stream-geometry.tap` y
`.cache/native-terrain-legacy-recipe.tap`.

**Límites:** A6-04.d implementado/validado en el dominio nativo actual, no en todos
los biomas. La propuesta usa copias temporales de los datos residentes y su coste
es estructural, no está optimizado ni medido como coste GPU. La política de comandos
que necesitan desplazar cuerpos/alterar su apoyo y la transacción JS exterior
siguen pendientes, al igual que la aplicación visual causal. Faltan A6-04.e/f,
integración de gameplay/fases, tráfico resuelto, otros perfiles/biomas y aceptación
real WASM/WebGPU. Se mantienen `authorizedAutonomy:false` y las guardas actuales;
no se declara cerrado A6 ni limpia la suite general.

## A6-04.e — Geometría, reloj y política de puertas (parcial)

El nuevo servicio opt-in convierte los polígonos locales autorados y sus bisagras
sin inferir rutas o tiempos en JS. C++ aplica yaw/escala no uniforme, produce la
hoja y el polígono circunscrito de giro y calcula el radio de activación. Usa los
kernels geométricos del mismo mundo, generalizados a coordenadas double sin
cambiar la aritmética float de los obstáculos existentes.

En una frontera explícita de hechos del motor, los cuerpos nativos enlazados a
trabajadores y los sufijos de intenciones existentes determinan petición,
ocupación y espera. No hay otro planner. El reloj es `nav_intent_effective_time`,
no wall time ni el del dibujante. Entre fronteras, la apertura se evalúa como una
trayectoria de 0,6 s, con origen, objetivo, instante inicial y fin explícitos; no
repite sensores o prefijos de ruta al muestrear estado/geometría. Se conservan
el hold por ocupación, exclusión de home/inactivos, inicialización del save sin
apertura explícita, pausa y estados collapsing/ruined.

Las identidades físicas se enlazan una vez y sobreviven a deltas de trabajador;
retirada/reset impide reciclar el binding para otro cuerpo. Un trabajador físico
cercano no enlazado no puede quedar oculto por una proyección distante. Hechos
incompletos congelan **también un motor ya en marcha**, en vez de dejar su último
objetivo de cierre ejecutándose. Esa congelación es conservadora y se comunica
como `incomplete-facts`, no como transición autorizada.

**No hay permiso de paso:** `authorizedPassage:false`. Registrar una puerta que
interceptaría una curva ya reservada se rechaza sin cambiarla. Las nuevas pruebas
temporales que cruzan su región de giro retornan clase no soportada; un cambio
de soporte invalida pruebas candidatas antiguas sin reestamparlas. Las curvas
ejecutadas ajenas pueden conservar su prueba ante un cambio conocido. Esto es
una frontera de capacidad, no un nuevo collider circular ni una hoja física:
no se añade ese círculo al grafo o a las guardas de locomoción legacy.

Once pruebas con WASM real contrastan los tres materiales móviles, yaw y escala
con los polígonos autorados, reloj/espera contra `advanceGateLeaves`/`waitForGate`,
save ocupado, hold/cierre, home, incertidumbre de hechos, pausa/estados, mil
muestras sin nuevo trabajo de sensores/planning, rechazo de cruces y bindings.
Regresión: **355 dirigidas + 39 de streaming/geometría + 74 de receta/estado**,
todas aprobadas sin skips, con standalone/pthread reconstruidos y ABI de versión
1/ancho 14 comprobado. Logs `.cache/native-gates-regression.tap`,
`.cache/native-gates-legacy-stream-geometry.tap` y
`.cache/native-gates-legacy-recipe.tap`.

**A6-04.e sigue parcial:** faltan barrido físico continuo de la hoja (incluidas
excepciones de recuperación), esperas dentro del timetable con fases/presupuesto
preservados, reservas de cruce y conexión automática de fronteras a eventos del
producto. El controlador nativo se consulta explícitamente; no sustituye aún
`gates.js` ni concede autonomía de animación/locomoción GPU. Tampoco prueba ACK
causal o aceptación gráfica A–F. Quedan **e y f** de los seis subpuntos A6-04,
y permanecen abiertos los once puntos principales de A6.

### Barrido continuo hoja/cuerpos (incremento de A6-04.e)

`spatial-gate-sweep.h` prueba la distancia al polígono autorado durante todo el
intervalo. La cota de velocidad de sus vértices combina radio de bisagra,
velocidad angular de 0,6 s y máxima escala singular; añade la velocidad del
cuerpo y los nudos del timetable existente. La distancia es Lipschitz bajo ese
desplazamiento. Subdivisión adaptativa con presupuesto finito: incertidumbre,
contacto o agotamiento rechazan, nunca conceden permiso por muestras aisladas.
Incluye poses inicial/final, cambios de velocidad de carrera y la envolvente del
snap numérico de apertura heredado. El witness es un intervalo conservador, no
una estimación de primer contacto exacto.

`nav_gate_prepare_motion` propone todos los motores sin publicar y los preflighta
contra el registro físico y suscriptores espaciales de curvas reservadas. Rechazo
no modifica ningún motor ni sus certificados anteriores. Una pose guardada sin
definir exige hidratación previa: no se certifica como continuo un salto inicial
de apertura. `nav_gate_reconcile` sigue siendo solo política y retira certificados;
no es un atajo para autorizar física. Ruined tampoco recibe certificado.

Un certificado protege el giro restante y la pose final ante altas/mutaciones de
cuerpos. La consulta read-only de candidatos temporales está en el bridge de
intenciones y exige la época **exacta**, no solo el contador de sesión WASM.
Muestrear geometría/apertura no ejecuta sensores, planificación ni clearance.

Doce pruebas WASM nuevas cubren contacto intermedio aun con inicio/mitad/fin
libres, intrusión de triángulo de 20 micras, poses extremas, puerta congelada,
transacciones de varias puertas, rechazo preservando un motor certificado,
trayectoria/tiempo y aislamiento de época. El primer pase detectó una premisa
incorrecta del fixture autorado: `(0.3,0.9)` contacta a apertura 0,3 pero está
libre a 0,5; se conserva ese contacto y se comprueban ambas poses explícitamente.
Standalone/pthread reconstruidos. **367 dirigidas + 39 de streaming/geometría +
74 de receta/estado**, aprobadas sin skips; logs `native-gate-sweep-*.tap` en
`.cache`.

Esto es certificación **hoja/cuerpos**, no instalación de collider de puerta ni
prueba contra marcos, otras hojas, props o terreno. Cruces siguen no soportados:
`authorizedPassage:false`. Holds, leases de cruce, recuperación, eventos de
producto y frontera causal con ACK/dibujo siguen pendientes. No se cierran e/f,
ni se activa autonomía GPU o se sustituye `gates.js`.

### Espera inicial de puerta en el timetable (candidato, A6-04.e)

`RouteSlot` incorpora un instante de salida diferente de su asignación. El mismo
evaluador temporal mantiene el origen hasta esa salida, avanza después por la
polilínea fijada y conserva yaw, fases de marcha/carrera/carga y presupuesto.
La duración total incluye la espera; la fase de locomoción y el gasto de carrera
no. Los nudos de reservas incluyen la salida, sin introducir scheduler o planner
alternativo. Rutas sin espera conservan sus reglas anteriores. El ABI de muestras
sigue de ancho 18 y el de timing de ancho 20; la capacidad de hold versión 1
expone por separado puerta, inicio y fin.

`nav_gate_prepare_waiting_route` recibe las mismas políticas de locomoción que la
preparación común. **No recibe tiempos, duración ni selección de puerta desde JS**:
el nativo consulta la geometría/ruta y motores cercanos ya certificados, elige el
último final de apertura y construye el hold inicial. No retima una curva reservada,
ya recorrida o de una asignación anterior. Falta de binding/certificado, cierre,
pausa o pose indefinida rechazan sin tocar generación/ruta.

Esta preparación comprueba el mundo estático mediante el kernel existente; solo
omite la frontera de capacidad circular de las puertas registradas. No omite
muros, polígonos, terreno, props, ni el rechazo de overlays worker-passable sin
propietario modelado. **No se toma como prueba física completa:** lleva
`gateCandidate=true`, scope `unadmitted-desert-gate-candidate`,
`authorizedPassage:false` y `authorizedAutonomy:false`. Tanto reserva como
ejecución nativas lo rechazan, también después de terminar el hold. El evaluador
de candidatos no escribe posiciones físicas. No basta esperar 0,6 s para abrir
un permiso inseguro.

La sustitución revoca exactamente la generación anterior y publica el timetable
nuevo en el mismo slot. No cambia tarea/objetivo, no vuelve a pedir una ruta y
muestrearlo no repite clearance, sensores, barridos o planificación. No hay todavía
holds a distancia para puertas posteriores ni offsets persistentes entre
intenciones; tampoco leases que impidan cerrar sobre un cruce admitido.

Ocho pruebas WASM: identidad/revocación y geometría conservadas; marcha, carrera
limitada, carga, huida lenta/incapacitada y recuperación sin gasto durante espera;
prohibición de reserva/ejecución antes y después de abrir; hechos incompletos,
parada y conversión tardía; bloqueo por muro y rechazo de paso automático sin
ownership; selección de varios motores y mil muestras sin trabajo geométrico.
Standalone/pthread reconstruidos; **375 dirigidas + 39 de streaming/geometría +
74 de receta/estado**, todas aprobadas sin skips. Logs `native-gate-waits-*.tap`
en `.cache`. Siguen abiertos A6-04.e/f y los once puntos principales: no hay
aceptación real de cruce de personajes ni ACK causal de mutaciones físicas.

## A6-04.f — Recibo de retirada de trabajo GPU previo (parcial)

El ACK `intent-control-applied` existente confirma el espejo de permisos en el
receptor. **No certificaba que los comandos GPU ya enviados hubieran terminado**.
La publicación incorpora ahora `fenceGpu()`: toma la época, secuencia y tiempo del
log enviado y solicita un `IntentControlFence` por el mismo canal directo, con
ID de recibo monotónico y versión de capacidad 1. No crea un log autoritativo,
una cola de mutaciones ni un scheduler; mantiene promesas transitorias de ACK.

El receptor comprueba esa frontera contra su espejo actual, fuera del FIFO de
recursos, y llama `device.queue.onSubmittedWorkDone()` inmediatamente. Solo tras
resolver devuelve `intent-control-fenced` para la identidad exacta solicitada.
La revocación ya aplicada limita los siguientes dibujos por su registro existente;
la preparación tardía sigue pasando por admisión y no puede resucitar versiones.
El drain no bloquea el bucle de dibujo ni la recepción de otros eventos.

No se acepta un ACK ordinario como recibo GPU. Tampoco un recibo de otra
sesión/época, secuencia, tiempo, ID o versión. Conexión retirada, timeout,
fallo/device loss o GPU rechazada no producen confirmación exitosa; los fences
pendientes se rechazan al cerrar. Límite de 64 peticiones pendientes y rechazo
del agotamiento de IDs. No se activa automáticamente esta operación desde las
mutaciones síncronas del mundo ni se cambia su semántica de producto.

Siete pruebas adicionales contrastan recibos separados, identidades falsas,
retiro/timeout, GPU sin terminar mientras recursos están bloqueados, secuencia
futura, fallo GPU y el intercambio completo publicación/receptor.
Batería dirigida completa: **382 aprobadas sin skips**
(`.cache/native-gpu-fence-regression.tap`). Las baterías nativas de streaming/
geometría (39) y receta/estado (74) también pasaron sin skips sobre estos mismos
binarios, reconstruidos para el incremento de esperas; no se declara limpia la
suite general.

La auditoría `/tests/browser/native-route-control-fence.html` ejecutó tres veces
el harness con WASM real, Workers de preparación/dibujo hermanos, WebGPU NVIDIA
Turing y readback de uniformes. Bloqueos de **500,060–500,075 ms**, **15 dibujos**
durante cada bloqueo, un único paquete preparado y continuación de la ruta ajena.
En las tres ejecuciones llegó el recibo GPU dentro del bloqueo y la primera ruta
quedó limitada al tiempo nativo de revocación. Evidencia persistida en
`performance/native-control-gpu-fence-20261109.json`.

**No cierra f:** `onSubmittedWorkDone` no es ACK de presentación/compositor, ni
ordena por sí solo el reloj lógico con el dibujante. El harness usa un triángulo,
no personajes animados ni una mutación física pendiente. Falta ligar una propuesta
nativa todavía no efectiva a dependencias/revocaciones, todos los consumidores
vivos y sus relevos, recibo válido y commit condicionado en la frontera causal;
también publicación de los recursos que representan esa misma mutación. Un ACK
antiguo no puede reutilizarse como permiso general para un mundo o conexión nuevos.
El recibo actual es un requisito de esa transacción, **no** autorización de
mutación/autonomía. Siguen abiertos e/f y los once puntos principales de A6.

### Propuesta de motor pendiente y commit condicionado (incremento de A6-04.f)

La preparación de motores se ha separado en propuesta y aplicación dentro de
Wild Engine. `nav_gate_motion_stage` reutiliza los mismos sensores y barridos de
la preparación inmediata, pero guarda solo una propuesta transitoria. No cambia
ninguna hoja, objetivo o certificado vivo. Una propuesta pendiente por autoridad,
sin otra cola de trabajo ni planificador. Ticket monotónico seguro, sesión nativa,
secuencia y tiempo explícitos; no se reutiliza al resetear intenciones.

El commit compara metadatos nativos, no vuelve a recorrer rutas o repetir
clearance: tiempo, sesión, versión del mundo, revisiones/hechos de entidades,
secuencia de intenciones, reservas y versión del registro físico. Esta última
versión es no reseteable y vive en el registro de cuerpos existente; altas,
movimientos, retirada y reset la modifican. Altas idénticas y mutaciones rechazadas
no. Evita que borrar/recrear un cuerpo o vaciar/rellenar el registro produzca una
falsa igualdad de pruebas. Saturación de versión/ID rechaza nuevas propuestas.
Cambios explícitos de puerta, binding, política o proyección del cursor retiran
la propuesta; no hay reintento periódico.

`prepareNativeGateMotionAfterGpuFence` pertenece al bridge de intenciones, dueño
de la época exacta. No recibe tickets o recibos externos como permiso: propone
en C++, espera una petición **nueva** de la publicación directa actual y comprueba
época/identidad de conexión y recibo antes del commit. Exige igualdad exacta del
tiempo nativo con el tiempo publicado; un drain no inventa un reloj más reciente.
Cambios de pausa/resultado/preparación o de reloj durante la espera rechazan.
Retiro/reemplazo de la fuente seleccionada también rechaza. La limpieza de una
petición vieja no puede cancelar una propuesta de la sesión nueva.

Los argumentos numéricos del commit C++ son su precondición de metadata, **no**
una autenticación del transporte. Esa autenticación y el await del recibo fresco
corresponden al bridge/publicación existentes. No se cambia el tiempo lógico ni
se añade una pausa oculta para completar el commit. Si la simulación avanzó,
se aborta y la siguiente frontera explícita decidirá qué hacer. La preparación
inmediata opt-in se conserva, sin presentarla como coordinación gráfica.

Quince pruebas nuevas con WASM real cubren tickets de un uso, busy/cancelación,
ausencia de efectos antes del commit, cuerpos/ABA/reset/no-op, mundo, reloj,
hechos/cursor, reservas sin nueva generación, época, cambios de política,
relevo/retiro y limpieza de sesiones. Standalone/pthread reconstruidos con ABI
de transacción versión 1. **397 dirigidas + 39 de streaming/geometría + 74 de
receta/estado**, todas aprobadas sin skips; logs `native-gate-transactions-*.tap`
en `.cache`.

`/tests/browser/native-gate-transaction.html` une el bridge y publicación reales
con el draw Worker WebGPU. Cuatro ejecuciones NVIDIA Turing mantienen **15 dibujos
por bloqueo de 500,060–500,105 ms**, con un paquete preparado. En tres, el motor
vivo no cambia durante staging y se instala después del recibo GPU. En la cuarta,
un cuerpo cambia a la región de contacto mientras la propuesta espera: llega un
ACK GPU válido, pero C++ rechaza el commit y conserva el motor anterior. El
barrido realiza cinco evaluaciones sobre el cuerpo nativo y ninguna más al
completar o rechazar la propuesta. Evidencia íntegra descargada del navegador:
`performance/native-gate-transactions-20261109.json`.

**Límite vigente:** es una transacción del motor/clearance de cuerpos del servicio
opt-in, no instalación de collider ni recursos visuales de la puerta. Sigue
`authorizedPassage:false` y `authorizedAutonomy:false`. El harness representa las
rutas con un triángulo; no mueve personajes ni una hoja física/gráfica. Falta
extender la propuesta diferida a las otras mutaciones, relacionar recursos y
todos los consumidores/relevos del runtime, y completar el reloj causal. La fuente
seleccionada del harness no demuestra por sí sola cobertura de consumidores
temporales/no registrados. No se cierran A6-04.e/f ni aceptación A–F.

### Barrido de objetos canónicos y otras hojas (incremento de A6-04.e/f)

El modo explícito `staticObjects:true` añade un certificado **de objetos**,
separado del de cuerpos. `spatial-gate-world.inc` visita los mismos índices de
barreras/polígonos y listas de props sólidos residentes; no mantiene otro mundo,
collider store o modelo de navegación. Vistas síncronas, candidatos locales
ordenados, props deduplicados por identidad canónica. Las máscaras de paso de
actores no vuelven intangible un objeto para la hoja.

Las distancias hoja/rectángulo orientado, hoja/polígono, hoja/disco canónico y
hoja/hoja usan los kernels geométricos nativos existentes. Para muros se invierte
la matriz `c/s` almacenada, sin asumir norma uno de sus columnas float. El mismo
solver de intervalos sirve ahora para cuerpos y objetos: distancia Lipschitz,
cota angular/escala y subdivisión adaptativa con presupuesto finito. Otras hojas
suman sus cotas de velocidad y los fines de ambos motores. La envolvente circular
solo selecciona candidatos; no se usa como collider del giro. La tolerancia
incluye snapping en ambas poses y aritmética; incertidumbre rechaza.

Dominio inicial: objetos residentes de Desierto, envolvente de hasta 16 m por eje,
coordenadas por debajo de 1.000.000 m y hoja no degenerada. Fuera de él retorna
unsupported, y ausencia de registros residentes retorna unknown: nunca se
interpreta como espacio vacío. La receta sólida de Desierto alcanza menos de
7,21 m de radio, dentro del halo canónico de 10 m. No se certifica relieve, agua,
altura/anclaje de hoja o contacto 3D por comprobar objetos proyectados.

El certificado se instala solo después de completar **todo** el lote de cuerpos,
objetos y hojas. Altas de muros/polígonos y restauración canónica de props pasan
por preflight contra el giro restante y la pose final; rechazo precede a IDs,
índices y datos vivos. Batches no publican sus piezas seguras si otra colisiona.
Cambios de soporte/datos cercanos o retirada de chunks necesarios se vetan
conservadoramente. Liberación gráfica no cancela motores para liberar sus datos:
el frontier de pins nativo despierta la retención al retirar el certificado.

Las transacciones conocidas y ajenas extienden la revisión de la prueba sin
volver a recorrer geometría. Un cambio de mundo no reconocido no puede seguir
avanzando su reloj: setters y ejecutor común consultan un único stamp de cohorte,
no vuelven a validar rutas. Reconciliación solo de política y preparación solo
de cuerpos retiran el certificado de objetos; no son atajos para concederlo.
Registro de otra hoja también protege el barrido certificado existente.

La preparación diferida usa el mismo ticket de motor y recibo GPU. Un certificado
pendiente no veta una mutación autoritativa nueva, pero ese cambio de mundo hace
obsoleta la propuesta y el commit la rechaza aun con un ACK GPU válido. Una vez
instalado, el certificado sí protege contra geometría futura interceptada.
Capability de objetos versión 1 y witness de ocho doubles; los contratos de
estado de puerta (14), timing (20), muestra (18) y barrido de cuerpos (6) no cambian.

**No se ignoran marcos propios:** tanto los proxies rígidos actuales como los
polígonos autorados de los tres materiales móviles se comprueban. Las proyecciones
producen contactos conservadores en la unión de la bisagra y se rechazan. No
demuestran por sí mismas un defecto en el modelo 3D; falta una regla de unión/
collider físico autorada y sustituir las envolventes del grafo donde corresponda.
No se ha inventado una excepción por ID/owner para obtener permiso de cruce.

Veinte pruebas de objetos más dos de coordinación con WASM real cubren contacto
intermedio con inicio/mitad/fin libres, rectángulos orientados, polígonos y todas
las máscaras, contención, hoja degenerada, intrusión micrométrica, otras hojas e
IDs grandes, altas/batches atómicos, pose final, props/restauración, datos/pins,
terreno remoto y protección de reemplazo del mundo sin cuerpos ejecutándose.
Standalone/pthread reconstruidos y ABI comprobado. **419 dirigidas + 39 de
streaming/geometría + 74 de receta/estado**, todas aprobadas sin skips; logs
`native-gate-objects-*.tap` en `.cache`. No se declara limpia la suite general.

`/tests/browser/native-gate-objects.html` ejecutó cuatro auditorías NVIDIA Turing
con WASM, publicación y GPU reales: **15 dibujos por bloqueo de
500,060–500,125 ms**, un paquete preparado, cinco evaluaciones de cuerpo y cinco
de objeto sin repetirlas al completar el recibo. En tres instala el certificado
y después veta un obstáculo nuevo que interceptaría el giro; en la cuarta se
introduce ese obstáculo mientras la propuesta espera y se rechaza el commit.
Evidencia íntegra descargada del navegador en
`performance/native-gate-objects-20261109.json`.

Siguen `authorizedPassage:false` y `authorizedAutonomy:false`. El harness dibuja
un triángulo/readback, no la hoja ni personajes. Faltan unión física del marco,
collider/recursos de puerta y soporte 3D, esperas posteriores, reservas/admisión
de cruce y recuperación; también reloj causal, consumidores/relevos de producto,
las otras mutaciones diferidas y aceptación real con personajes. **e y f siguen
abiertos**, al igual que los once puntos principales de A6.

### Esperas intermedias en la ruta nativa (incremento de A6-04.e)

El mismo `RouteSlot` incorpora ahora una lista ordenada de holds por distancia,
con puerta, inicio, fin y retraso acumulado. La geometría y sus puntos no cambian.
Un hold inicial sigue siendo legible mediante el contrato previo; una ruta con
solo esperas posteriores **no** se confunde con una ruta estática admitida.
Toda la lista se liga a la misma generación revocada/sustituida del intento.

`spatial-gate-route-ranges.inc` obtiene intervalos nativos de activación sobre la
polilínea existente: círculo de proximidad y distancia disco/polígono convexo
autorado, mediante recortes de semiplanos, bandas de arista y círculos de vértice.
Intersecta proximidad con el alcance real del prefijo, no con un hit remoto del
resto de la ruta. Una pequeña anticipación de 1e-8 m evita colocar el hold después
del límite numérico. Tangencias mal condicionadas y geometría no soportada
rechazan sin sustituir el handle anterior. No hay consultas geométricas en JS,
muestreo periódico de ruta o un segundo planificador.

Las fronteras se ordenan por distancia/ID; al incorporar cada una se descuentan
las esperas anteriores y se compara su llegada con el final del motor. Llegar
después de la apertura no añade una espera ficticia. Relojes incompatibles,
puertas no certificadas o cerrándose rechazan: el compilador no crea futuras
solicitudes de apertura ni concede reservas de paso. Los holds del mismo punto
se consolidan en el último final relevante.

El evaluador común localiza holds por búsqueda binaria y conserva exactamente
posición/distancia, fases y presupuesto durante la parada. Marcha, carrera,
agotamiento dentro de una arista, carga, huida lenta/incapacitada y recuperación
mantienen las reglas existentes al reanudar. La lectura de nudos nativos incluye
ambos límites de cada espera, puntos geométricos y cambios de velocidad, de modo
que cada intervalo siga siendo afín para los kernels de reservas/barridos. No se
escanea toda la lista de holds al evaluar una pose.

Capacidad plural de holds versión 1, filas de cuatro doubles (puerta, distancia,
inicio, fin) y lector de nudos con aislamiento de época/versión. Los contratos de
timing (20), muestra (18), hold inicial y log de intenciones no cambian. Preparación
y lectores siguen dando `authorizedAutonomy:false` y `authorizedPassage:false`.
Incluso un candidato que ya no necesita espera permanece no reservable/ejecutable.

Trece pruebas WASM nuevas cubren dos paradas separadas, parada solo intermedia,
paridad de fases/presupuesto con el mover existente, nudos completos y afinidad,
prefijos con desvío, llegada tardía, reloj futuro no autorizado, tangencia,
identidades obsoletas, los tres materiales/yaw/cuatro aproximaciones y mil
evaluaciones sin repetir trabajo estructural. Tareas directas, riego y reparación
conservan tarea/objetivo/lease y no repiten el planner. La primera premisa de ese
test suponía una ruta recta restaurada: el planner real añade un conector de
cuadrícula, por lo que la segunda puerta ya abre antes de llegar. Se conserva
ese caso (una espera) y se contrasta otro reloj inicial más corto (dos esperas),
sin modificar la ruta del planner ni constantes/reglas para obtener verde.

Standalone/pthread reconstruidos, ABI comprobado. **432 dirigidas + 39 de
streaming/geometría + 74 de receta/estado**, aprobadas sin skips, logs
`native-gate-multiwaits-*.tap` en `.cache`. No se declara limpia la suite general.

**Límite:** solo compila candidatos sobre relojes que ya están abriendo/abiertos
y certificados en esa frontera. Faltan solicitud de apertura futura, leases que
mantengan el hueco y revocación dirigida por cambio de ese reloj antes de admitir
la trayectoria. Tampoco instala marco/hoja físicos, apoyo 3D, ejecución de producto
o GPU de personajes. e/f y los once puntos principales siguen abiertos.

### Reproducción GPU del timetable con espera intermedia (diagnóstico)

`/tests/browser/native-gate-multiwaits.html` construye un intento nativo de
trabajador con presupuesto urgente de 0,05 m y dos motores ya certificados.
El engine genera una espera de salida (10–10,15), agotamiento de carrera dentro
de la primera arista (10,170833...), una parada posterior tras recorrer
0,09999999 m (10,217129...–10,6) y el resto de la trayectoria. Preparación solo
convierte los nudos/poses que devuelve C++ a una tabla GPU inmutable; no decide
paradas, fases, presupuestos o ruta.

Un único paquete gráfico reproduce la tabla en shader. Cada ejecución bloquea
realmente el Worker preparador **dos veces durante 500 ms**: el primer readback
comprueba posición/fases detenidas en el hold intermedio y el segundo comprueba
reanudación y presupuesto ya agotado. El mismo sampler WGSL sirve a los vértices
y al readback privado de diagnóstico. El reloj se copia en la cola GPU antes de
ese readback; no se publican posiciones periódicas desde JS ni se vuelve a entrar
en geometría/planning nativos mientras se dibuja.

El primer intento de diagnóstico conservaba el mismo grupo de recursos para
render y cómputo. La guarda existente detectó una mutación de un paquete publicado
y la retuvo, produciendo ceros en el readback. **No se relajó esa guarda:** el
diagnóstico usa ahora buffers/layout/módulo privados con la misma tabla/sampler,
solo leyendo una copia ordenada del reloj. El cómputo de inspección no forma parte
del paquete reproducido. También se reutiliza el comportamiento del lector de
fixtures existente: aceptar gzip binario o texto ya decodificado por HTTP.

Tres ejecuciones reales NVIDIA Turing, seis bloqueos de **500,055–500,405 ms**,
**15 dibujos durante cada bloqueo**, un paquete por ejecución, 30 replays, cero
paquetes de cómputo repetido, errores GPU, forks uniformes u operaciones diferidas. Los
readbacks coinciden con el evaluador nativo con error absoluto de campos menor
de **6e-7**, dentro de la tolerancia diagnóstica de 2e-5. Se conservan exactamente
los contadores de rangos/prefijos/sensores, barridos, clearance, planning y log.
Evidencia íntegra descargada del navegador:
`performance/native-gate-multiwaits-20261109.json`.

**No es aceptación con personajes:** se dibuja un triángulo, no mallas animadas.
La autoridad no avanza cuerpos ni consecuencias; el reloj de presentación del
diagnóstico no resuelve el reloj causal de producto. El error medido tampoco es
un certificado de clearance físico GPU. No se activan autonomía, cruce, nuevos
permisos de recurso, ni se sustituye el movimiento protegido/histórico actual.
e/f, A6-08/09/10 y los demás puntos principales siguen abiertos.

## Cierre de A6-04.e-R1 — Mecanismo nativo marco/hoja y apoyo 3D

Se cumple el entregable fijo e-R1 para la clase nativa validada: puertas intactas
zarzas/empalizada/reforzado, con apoyo plano verificado en Desierto. No se activa
en la partida normal. Integración/ciclo de vida, admisión de cruces, personajes
y aplicación causal siguen en sus IDs pendientes; no se cierran e/f ni A6.

### Un mecanismo cinemático, no una excepción por IDs

Las puertas existentes son cinemáticas: el reloj de 0,6 s prescribe la rotación
de la hoja en un conjunto. El modelo físico nativo es la **unión ocupada** de
marco y hoja, incluida toda zona donde se solapen. No se declara que sus piezas
estén separadas ni se emite un certificado de ausencia de contacto interno.
Tampoco se eliminan triángulos, se mueven bisagras o se ignoran objetos externos
por compartir un ID/owner. La consulta de un cuerpo en el solapamiento devuelve
ambos componentes ocupados y bloquea la mutación. Un polígono externo idéntico al
marco sigue bloqueando la instalación, no se convierte mágicamente en parte propia.

`prepare_gate_mechanisms.py` exporta la misma partición y triangulación autorada
que `splitGateBridge`, con posiciones float, flags de hoja y calibración. Header
C++ inmutable, manifest de procedencia y `--check`; JSON normalizado a LF y assets
binarios con hash exacto. No hay cambios en mallas, bisagras o velocidades. Son
17.415/6.081/6.861 vértices de los tres mecanismos originales, no cajas de QA.

### Apoyo, colisión y dibujo comparten el estado nativo

El montaje consulta los triángulos de terreno residentes y encierra alturas por
sus vértices, sin callback del renderer ni muestreo de pocos puntos. Mantiene la
raíz existente `surface(float(x),float(z)) + .025`, pero exige un datum plano
validado para esta clase. Datos ausentes o terreno no plano rechazan sin instalar
parcialmente ni desplazar cuerpos/raíz. Los cambios posteriores de ese apoyo y
la retirada de sus datos pasan por las protecciones nativas ya existentes.

Marco, hoja y alturas viven en el `NativeGate` existente, con asset canónico y
aceleraciones derivadas de ese mismo asset, no otro registro de mundo. Las
consultas de cuerpo/segmento recortan geometría 3D a su intervalo vertical nativo
y conservan la unión de las regiones ocupadas; segmentos/puntos degenerados de
proyección tampoco se descartan. En el datum se reutilizan secciones preparadas;
no se recorren triángulos del asset en cada consulta habitual. Animales mantienen
además la política existente de ver la envolvente completa del muro.

La instalación preflighta cuerpos, futuras rutas y objetos antes de publicar.
Las partes fijas también participan en veto de geometría posterior y colisiones
con otros mecanismos. Una preparación solo de cuerpos o reconciliación de
política no desactiva la protección física de un mecanismo instalado. Un stamp
de soporte/mundo obsoleto no se reautoriza silenciosamente.

El engine exporta matrices de raíz/bisagra y geometría ligada a sesión/época y
serial no reutilizable. `NativeWall.bindNativeGateMechanism` valida una vez la
geometría/partición autorada y toma la base nativa. Vinculado, `update` consume
esas matrices: no decide apertura, reloj ni altura. `gateOpen` de la entidad no
puede sobrescribir la pose nativa. Una pose ausente, vieja o de otra instancia,
o una transición visual/de ciclo de vida no soportada, rechaza sin fallback.
El camino de paredes no vinculadas conserva su comportamiento anterior.

### Evidencia del criterio de cierre

Nueve pruebas nuevas verifican procedencia, los tres materiales con dos giros y
dos escalas, cinco fases del motor, colisión cerrada/abierta, raíz/hoja compartidas,
regiones de contacto interno aún ocupadas, política animal, montaje desconocido/
no plano, rechazo atómico sobre cuerpo/marco externo, protección de soporte y
rechazo de identidades/geometry/lifecycle falsos. Las cinco pruebas previas de
articulación también pasan. Standalone/pthread reconstruidos con ABI de mecanismo
versión 1. Batería ampliada: **446 dirigidas + 39 de streaming/geometría + 74 de
receta/estado**, todas aprobadas sin skips. No se declara limpia la suite general.

`/tests/browser/native-gate-mechanism.html` ha dibujado las tres **mallas reales**
en WebGPU NVIDIA Turing, usando la clase `NativeWall` de producto vinculada al
engine. En cinco estados nativos (0/20/50/80/100 %) se comparan todos los vértices
mundiales de C++ con la geometría entregada al dibujo; error máximo **6,98e-8**
antes de GPU. La consulta física nativa da bloqueado al cerrar y libre al abrir
para el corredor de trabajador. La cola GPU termina sin error de validación.
Esta diferencia es de geometría de preparación, no un readback de posiciones GPU.

Evidencia: `performance/native-gate-mechanism-20261109.json` y captura PNG homónima;
logs `.cache/native-gate-mechanism-*.tap`. El primer intento del showroom detectó
URLs de assets relativas al documento que devolvían HTML. Se corrigió la resolución
desde la raíz y se validan tipo/alineación; no se cambiaron assets o expectativas.

**Resultado:** e-R1 cerrado como componente nativo en la clase explícita anterior;
quedan e-R2–R4 y f-R1–R4 (**7 de 8**). No se generaliza a apoyos inclinados,
destrucción/morph o física excepcional sin la transición correspondiente. La
aceptación con personajes y la activación del runtime no están hechas ni se
deducen de este cierre. `authorizedPassage:false` y `authorizedAutonomy:false`
siguen vigentes. El siguiente bloqueo del tablero es e-R2.

## Avance de e-R2 — Admisión atómica nativa; entregable aún abierto

`nav_gate_admit_route` / `admitNativeGateRoute` admiten una ruta de trabajador
ya elegida, sin pedir otra al planner ni corregir su geometría desde JS. En una
frontera nativa se preparan tiempos, esperas, aperturas futuras de cada puerta y
reservas de cruce; se prueban mundo estático, marco/apoyo del mecanismo de e-R1,
hoja móvil y abierta durante **toda** la ruta, tráfico y objetos/otros mecanismos.
Un fallo en una puerta posterior no publica motores, ruta o reservas parciales.
Se reutilizan `ActiveIntent`, `RouteSlot`, `NativeGate`, cuerpo, suscripciones y
el log nativo existentes, no un scheduler, registro o planificador adicional.

El reloj escalar existente permite un arranque futuro (`at > effectiveTime`);
se incluyen principio y fin del motor en los nudos de prueba continua. Un reloj
prometido se mantiene inmutable al admitir otro cruce compatible. Las esperas
están en el mismo timetable: mantienen el gasto de carrera/fases detenido, y
conservan tarea/objetivo. La nueva generación se reserva para el cuerpo físico
existente y entra en el ejecutor nativo común, con comprobación de coherencia
de sus referencias de puerta. En pasos ordinarios solo se muestrea/proyecta y
se comprueban metadatos; no hay geometría ni planificación por tick.

Cada puerta guarda referencias a actor/cuerpo/slot/generación e intervalo de
traversal conservador. Las reservas no se eliminan por vencer ese intervalo:
perduran hasta liberar la ruta. La política no puede reescribir su motor ni
congelarlo durante una ruta que continúa ejecutándose; deshabilitar motor en
ese estado devuelve `crossing-reserved`. Tampoco se puede retirar su puerta o
reasignar el cuerpo ligado sin revocar primero. Al llegar no se publica aún
una consecuencia de gameplay: la liberación en frontera de acción es e-R3.

Al cancelar antes/durante una apertura se congela su pose actual: la trayectoria
de un cuerpo que queda detenido no hereda la prueba de su movimiento anterior.
Las demás rutas que dependían de esa apertura se revocan mediante la cola
iterativa de paradas existente, que también propaga conflictos con cuerpos ya
inmóviles. Si el paso ya está completamente abierto se mantiene así. Un evento
posterior de motor solo puede cerrar si las reservas se han liberado y la
ocupación/trayectorias lo permiten; no se añade un sondeo periódico de rutas.

**No está terminado e-R2:** esta revocación todavía libera la polilínea y no
conserva/reanuda el sufijo con offsets de fases y presupuesto. Tampoco se acepta
una inversión diferida de un motor que aún está cerrando: necesita representar
el tramo anterior y el nuevo sin sustituirlo silenciosamente por una pose fija.
Se rechaza sin cambiar nada; puertas estacionarias cerradas/parciales y relojes
de apertura ya certificados sí entran por la nueva admisión. No se programa un
cierre automático al vencer el intervalo ni se activa esta API en gameplay.

Una prueba con tareas reales detectó conectores de la rejilla anterior que
contactan el marco de zarzas. Se conserva el fallo físico: esa ruta no se
admite, no se ensancha el paso ni se retocan las mallas. Las pruebas cubren tanto
el rechazo con contacto nativo de marco como tareas directas/riego/reparación
admisibles con un corredor autorado alineado con su conector. La integración
del planner con esos corredores sigue siendo parte del trabajo de producto.

Pruebas reproducibles: `tests/spatial-native-gate-crossings.test.js`, standalone
y ABI pthread. Incluyen tres materiales, múltiples puertas, promesa compartida,
cancelación con dependientes, contacto después de acabar el motor, rechazo
atómico, fases/presupuesto/carga/huida, tareas, cambios de soporte rechazados,
liberación y cierre posterior, épocas/generaciones y contadores sin trabajo
geométrico/planning en 300 avances ordinarios. No son una aceptación gráfica
con personajes ni acreditan coordinación causal/GPU. Los candidatos anteriores
siguen explícitamente sin admitir; `nativeCrossingAdmitted:true` distingue esta
API de una autorización de producto/GPU, que permanece desactivada.

**IDs cerrados en este avance: ninguno.** Tablero sin renumerar: e-R1 cerrado,
e-R2–R4/f-R1–R4 pendientes (**1 cerrado, 7 pendientes**).

Regresión de este avance: **462 dirigidas + 39 de streaming/geometría + 74 de
receta/estado**, aprobadas sin skips, con standalone/pthread reconstruidos.
Logs `.cache/native-gate-crossings-regression.tap`,
`.cache/native-gate-crossings-legacy-stream-geometry.tap` y
`.cache/native-gate-crossings-legacy-recipe.tap`. No se declara limpia la suite
general; se mantienen documentados sus fallos históricos.

## e-R2 — Sufijo suspendido y readmisión por evento, sin planner

Se elimina el bloqueo de pérdida del sufijo: la suspensión de una ruta nativa
resumible conserva su `RouteSlot` asignado y su pose ejecutada, pero revoca la
generación ejecutable en el log de control. El estado de espera no publica otro
handle de movimiento ni aparece en el baseline de rutas activas. Un token de
reanudación de sesión/época/slot/generación solo sirve para ese comando; no puede
usarse como ruta, reserva ordinaria o muestra temporal ejecutable.

La cola iterativa de paradas retiene así las rutas dependientes de una apertura
cancelada o de un cuerpo detenido; también las invalidaciones geométricas de
rutas resumibles. El planner genérico no reemplaza un sufijo suspendido al cambiar
un sector. Cambiar objetivo, cancelar la intención, retirar/resetear el cuerpo o
restaurar la autoridad sí lo liberan definitivamente. El slot no puede reutilizarse
mientras está suspendido, y el cuerpo detenido no puede moverse/religarse desde
fuera sin resolver primero esa propiedad nativa.

`nav_gate_resume_route` vuelve a probar estáticos, puertas y tráfico del sufijo
desde la posición física exacta. Reutiliza las mismas funciones de admisión y el
ejecutor común. No hay ruta nueva del planner. Como la espera no tiene suscripciones
activas de movimiento, el tráfico futuro se consulta desde los límites del sufijo
contra el mismo índice inverso nativo, sin instalar suscriptores especulativos.
Un fallo no cambia reloj, token, geometría, presupuesto ni eventos publicados.
El comando no recibe posiciones, presupuesto o fases nuevos desde JS.

La nueva ruta usa tiempos/distancias locales del sufijo y offsets acumulados
nativos de distancia, tiempo de movimiento, fases de carrera/marcha/carga y sus
distancias. En reposo esos valores no avanzan; reanudar no reinicia una animación
ni repone carrera. Funcionan esperas, cambios de velocidad por agotar carrera,
huida lenta, puntos duplicados, esquinas y suspensiones repetidas. Si el resto ya
no pasa por una puerta, se admite como sufijo estático nativo, no se reintroducen
tramos cruzados. No es todavía persistencia entre acciones o guardados.

Son comandos/eventos explícitos de la autoridad, no una cola universal de retries,
un sondeo temporal o un nuevo planificador. Si no queda un cohort ejecutándose,
la autoridad readmite y arranca el ejecutor común en esa misma frontera, como en
la admisión inicial. No se permite pasar a trabajo antes de la llegada confirmada.
No se activa esta API en gameplay ni se concede autonomía/pasaje de producto/GPU.

Doce pruebas nuevas (`tests/spatial-native-gate-resume.test.js`) pasan en WASM,
además de las 16 previas de admisión: suspensión manual y por eventos reales,
reanudación/fallo atómico, fases/velocidades, tráfico futuro, tareas y retiro del
objetivo, control de generaciones/épocas, reset y 300 avances sin geometría/planner.
Standalone/pthread reconstruidos; **474 dirigidas + 39 + 74** aprobadas sin skips.
Logs `.cache/native-gate-resume-regression.tap`,
`.cache/native-gate-resume-legacy-stream-geometry.tap` y
`.cache/native-gate-resume-legacy-recipe.tap`.

Este incremento no cierra otro ID. Para e-R2 queda la composición de una apertura
futura con un motor que ya está cerrando, sin congelar su tramo anterior. Tablero
aún **1 cerrado, 7 pendientes**; no se declara aceptación con personajes.

## Cierre de A6-04.e-R2 — Ruta completa, reservas y reanudación nativas

Se cumple el criterio fijo de e-R2 en la clase física nativa validada de e-R1:
puertas intactas de zarzas/empalizada/reforzado sobre apoyo plano residente de
Desierto, con las reglas físicas y de locomoción existentes. Este cierre no
activa gameplay/GPU ni cierra e-R3/e-R4 o la coordinación causal f-R1–R4.

### Último bloqueo: preservar un cierre previo hasta su inversión

`NativeGate` conserva un prefijo de su reloj ya autorizado cuando una ruta pide
una apertura futura. Hasta el instante de activación sigue cerrando (o permanece
cerrada si ya acabó ese movimiento); después abre desde la pose prevista allí,
sin salto, pausa inventada ni cambio de la regla de 0,6 s. No hay un scheduler
general: es un prefijo local del mismo motor, no otro controlador o entidad.

Las cotas de velocidad y nudos del kernel continuo común incluyen prefijo,
agotamiento del cierre, inversión y fin de apertura para cuerpos, objetos y
otras hojas. Preparar/reconciliar/reemplazar un motor limpia el prefijo anterior
solo tras tomar la pose nativa actual. Promesas ya reservadas siguen inmutables.
Cancelar antes del cierre, cuando la puerta aún está en apertura 1, también
retira el movimiento futuro: comparar solo apertura actual con objetivo final
sería insuficiente. Se congela y se suspenden dependientes, igual que a mitad
de la apertura. Los rechazos de admisión dejan intacto el cierre original.

### Criterio observable satisfecho

| Requisito acordado | Resultado observado |
|---|---|
| Ruta completa por puertas que inicialmente no abren | Admisión atómica de la polilínea existente por una o varias puertas cerradas; además se compone con un cierre en marcha en los tres materiales. No se pide otra ruta ni se ensancha el hueco. |
| Reservar intervalo e impedir cierre sobre el cruce | Reservas de actor/cuerpo/sesión/slot/generación y tiempos nativos; política y retirada de puerta no pueden romper la promesa. La ocupación del cuerpo detenido protege el paso aun tras cancelar su intención. |
| Invalidar y reanudar por eventos | El log revoca la ruta, el mismo slot retiene el sufijo y su estado, y el comando nativo de reanudación lo readmite tras probar las nuevas dependencias. Fallar no pierde geometría ni publica una ruta parcial. |
| Conservar locomoción y arquitectura | Offsets nativos preservan distancia/fases/carrera; misma tarea/objetivo y cuerpo. No hay planner JS, planificador duplicado, polling de rutas o validación geométrica durante los avances ordinarios. |

El caso integrado de aceptación recorre dos puertas inicialmente cerradas,
suspende ante la segunda tras cruzar la primera, identifica el sufijo exacto,
rechaza reanudar con un muro en el futuro y, tras retirarlo por evento, readmite
y alcanza el final. Conserva los estados de locomoción y la llegada permite el
fin nativo. Los **300 avances ordinarios** no incrementan trabajo de geometría,
sensores, barridos ni consultas de planificación. Repetir el mismo registro de
comandos en otra instancia WASM da el mismo resultado normalizado de autoridad.

Evidencia persistida: `performance/native-gate-crossing-resume-20261109.json`.
Reproducción: `tests/spatial-native-gate-route-acceptance.test.js`. Complementan
las 16 pruebas de admisión, 12 de suspensión/reanudación y cuatro de inversión
de reloj: materiales, varias puertas, promesas compartidas, tareas, tráfico
anticipado, geometría rechazada, cancelación dentro del paso, resets y tokens
obsoletos. Standalone/pthread reconstruidos; **479 dirigidas + 39 + 74** aprobadas
sin skips. Logs `.cache/native-gate-e-r2-regression.tap`,
`.cache/native-gate-e-r2-legacy-stream-geometry.tap` y
`.cache/native-gate-e-r2-legacy-recipe.tap`. No se declara limpia toda la suite.

### Límites que no se confunden con el cierre

La API anterior de candidatos sigue sin admitir. La admisión nueva diferencia
`nativeCrossingAdmitted:true` de permisos de producto/GPU que continúan falsos.
El ejecutor y sus comandos se validaron realmente en WASM, no con personajes
dibujados. No es aceptación de e-R4, de fallos/relevo ni del reloj físico/gráfico.
Tampoco persiste fases entre acciones/guardados, produce rutas nuevas compatibles
con todos los conectores del planner heredado o resuelve todo el tráfico. Esas
dependencias ya pertenecían a A6-01/02/03, e-R3/e-R4 y f; no se añaden nuevos IDs.

Las reservas se liberan en eventos, no al vencer un timer. El cierre posterior
requiere liberación y prueba de ocupación/trayectorias; no se programa un cierre
a ciegas sobre el destino retenido. La integración de esos eventos con el juego
y guardado sigue en e-R3. Antes de activarla se debe resolver la frontera causal
f-R1 y el resto de coordinación pendiente.

**Cerrado en este turno: A6-04.e-R2.** Tablero fijo: e-R1/e-R2 cerrados;
**e-R3, e-R4 y f-R1–R4 pendientes (2 cerrados, 6 pendientes)**. Los padres e/f
siguen parciales y los 11 puntos principales A6 abiertos. Siguiente bloqueo:
f-R1, frontera causal de tiempo y comandos.

## Cierre de A6-04.f-R1 — Tiempo causal ejecutado y control directo

Se cumple el criterio fijo de f-R1 en el camino opt-in de ejecución nativa:
simulación y dibujo comparten una frontera finita de tiempo ejecutado, con
pausa/velocidad/revocación por el canal directo. No se presenta tiempo que una
decisión posterior pueda invalidar en el pasado ni se corrige mediante rebobinado.
No se activa el nuevo movimiento en gameplay, ni se cierran todos los consumidores
y recuperación (f-R3), las otras transacciones (f-R2), aplicación gráfica de las
mutaciones (f-R4) o aceptación con personajes (e-R4).

### El preparador no concede tiempo futuro

El mecanismo anterior podía conceder a un paquete todo el reloj futuro de su
ruta, sin probar que una orden de pausa o revocación llegaría antes del dibujo.
Detectar después una revocación tardía era un fallo explícito, no una prevención.
El nuevo reloj cambia la autorización, no relaja esa protección.

`nav_intent_clock_commit` publica desde el mismo `IntentState` nativo una frontera
`committedThrough`, versión de reloj, high-water de intenciones, sesión y política
de pausa/velocidad. Solo puede activarse con un cohort ejecutado/coherente; una
ruta cruda, no reservada o sin empezar no concede futuro gráfico. La ejecución
nativa actualiza cuerpos antes de extender la frontera. Un avance aún no
publicado tampoco amplía el permiso del dibujante. No hay otra copia de rutas,
registro de cuerpos, planificador o scheduler.

En este modo `nav_intent_set_time` no puede adelantar el tiempo fuera del ejecutor,
y una pausa nativa rechaza los avances sin mover cuerpos ni consumir fases. La
coherencia de membresía se comprueba al cambiar la secuencia de intenciones;
los avances comunes reutilizan las comprobaciones de metadatos/stamp existentes,
sin geometría, sensores o validaciones completas de rutas. La política se entrega
como un hecho de comando autorizado; no se deriva de recursos gráficos o wall time.

### Mismo canal independiente, dos contadores explícitos

La base y el observador nativos entregan reloj e intenciones al transportador
existente. Los cambios de ruta se publican antes del permiso que los cubre. El
contador de reloj no se confunde con el de transiciones: cada permiso nombra su
high-water de intenciones, y el receptor rechaza saltos, otras épocas/sesiones,
fronteras regresivas y anclajes inventados. Una base nueva requiere un reloj
nativo comprometido en esa frontera; no hereda un ACK antiguo. No se actualiza
en caliente un consumidor histórico ya vivo: su reloj previo podría haber
presentado futuro. Intentar ese cambio cierra la conexión y requiere otra base
consciente del reloj, sin fingir un fence retroactivo. El relevo completo y su
integración con todos los consumidores permanecen en f-R3.

La conversión de transporte añade un anclaje absoluto para interpolación, sin
decidir rutas, posiciones, duración autorizada o presupuesto. Un avance conserva
el anclaje; pausa o cambio de velocidad lo sustituye en el tiempo nativo actual.
Ese tiempo nunca es inferior a la frontera que el consumidor pudo dibujar.
Los ACKs de reloj identifican su versión y frontera exactas. Los recibos GPU
siguen separados de los ACKs de aplicación y ahora incluyen versión de reloj.
Cambiar política invalida una propuesta de motor anterior aun con idéntico tiempo
lógico y secuencia de intención, evitando reutilizar su recibo/decisión.

El receptor remoto aplica el reloj por fuera del FIFO de recursos. Una vez
activo en esa conexión, utiliza el permiso directo, no la lease futura del
preparador; omitir una etiqueta de ruta en otra generación no permite eludirlo.
Se conserva además el límite de validez de los recursos preparados: el tiempo
no supera ni la frontera nativa ni ese techo. Si una pausa ancla el reloj nativo
más allá de unos recursos vencidos, esos recursos quedan en su techo anterior,
sin rebobinar o ampliarse hasta que una generación válida los sustituya. Una
generación futura espera también a su inicio válido: ni sus recursos nuevos ni
sus bindings pueden adelantar el reloj causal para hacerse visibles antes.
La propuesta/consumo de tiempo
ya existente continúa rechazando rebobinados, y el float enviado a GPU sigue
redondeándose hacia abajo. Una nueva ruta no se dibuja antes de su asignación.
Los frames con compute de un solo uso no se vuelven repetibles por cambiar de
reloj. El silencio solo permite agotar la última frontera finita, no seguir
indefinidamente por tener un plan completo. Una conexión vieja conserva como
máximo su límite finito; el relevo global/fallos sigue en f-R3.

No es reproducción histórica como unidad nueva de locomoción: la GPU conserva
la ruta/timetable completo, sin posiciones JS periódicas ni nuevos paquetes
durante los bloqueos. Lo que se publica es la frontera escalar ya ejecutada por
la autoridad. Si la autoridad se retrasa, el tiempo gráfico se detiene en ella;
la existencia de una ruta futura no autoriza extrapolar sobre decisiones aún no
ejecutadas. La preparación puede quedar bloqueada sin detener la autoridad o
el replay de dibujo. El fallback histórico de producto se mantiene protegido.

### Criterio observable y evidencia real

`/tests/browser/native-causal-clock.html` crea el mecanismo físico y un trabajador
admitido/ejecutado en WASM, comparte sus nudos nativos con el preparador y envía
**un solo paquete** a un Worker WebGPU NVIDIA Turing. El reloj futuro propuesto
por ese paquete no puede saltarse el permiso directo de la autoridad.

1. **Pausa y cambio de velocidad:** preparación bloqueada 500,07 ms; 15 dibujos,
   todos en tiempo nativo 10, aunque la lease preparada permitiría avanzar.
2. **Reanudación a velocidad ×2:** preparación bloqueada 500,06 ms; 15 dibujos,
   tiempo 10,04–10,96 dentro de las fronteras ejecutadas que llegan directamente.
3. **Silencio y revocación:** preparación bloqueada 500,03 ms; 15 dibujos detenidos
   en 11,00038, sin superar el último avance nativo. La revocación y su recibo GPU
   llegan unos 2,25 ms después de aplicar el comando, antes del desbloqueo.

Los 46 dibujos (45 replays) no producen errores GPU. Todas las muestras son
monótonas y quedan dentro de una frontera nativa ya comprometida. Los readbacks
GPU de posición/fases/carrera coinciden con el sampler nativo (error máximo
8,59e-7); no aumentan contadores de geometría, sensores, barridos o planificación.
Es un triángulo diagnóstico, no un personaje. No certifica todavía las mutaciones
gráficas ni las reglas de producto/guardado ante todos los fallos.

Evidencia persistida: `performance/native-causal-clock-20261109.json`; la prueba
`tests/native-causal-clock-evidence.test.js` verifica también el registro retenido.
Pruebas WASM/ABI pthread, permisos, ACKs falsos, pausa/cambio de velocidad y un
cohort WASM real con el host GPU instrumentado completan la cobertura dirigida.
Regresión: **493 dirigidas + 39 de streaming/geometría + 74 de receta/estado**,
aprobadas sin skips. Logs `.cache/native-causal-clock-regression.tap`,
`.cache/native-causal-clock-legacy-stream-geometry.tap` y
`.cache/native-causal-clock-legacy-recipe.tap`. No se declara limpia toda la suite.

**Cerrado en este turno: A6-04.f-R1.** Tablero fijo: e-R1/e-R2/f-R1 cerrados;
**e-R3, e-R4 y f-R2–R4 pendientes (3 cerrados, 5 pendientes)**. Los padres e/f
siguen parciales y los 11 puntos principales A6 abiertos. Siguiente bloqueo:
f-R2, propuesta/commit condicionado de las demás mutaciones.

## Avance parcial de A6-04.f-R2 — Primera barrera propuesta y drenaje GPU

**No se cierra f-R2 ni ningún otro ID en este incremento.** La operación cubierta
es exclusivamente **añadir una barrera orientada** en la autoridad nativa, sobre
el dominio/ejecutor ya validado y con un consumidor causal opt-in. No cubre aún
polígonos, lotes, cambios/eliminaciones de overlay, residencia, props o terreno.
Las APIs históricas y protecciones existentes se mantienen; no se activa este
camino en gameplay ni se finge que todas las mutaciones ya estén coordinadas.

### Propuesta sin efecto y comprobación de dependencias

`spatial_barrier_proposal_stage` construye el mismo `Barrier` float y forma que
el índice canónico, sin asignar ID ni cambiar el mundo. El preflight de cuerpos,
puertas y candidatos de ruta corre nativamente sin retirar rutas. El ticket de
un uso pertenece al `IntentState` existente y contiene exclusivamente el input
de esa propuesta y referencias de vigencia: sesión, instante, secuencias de
intención/hechos/reloj, revisiones de cuerpos/entidades/reservas/mundo y una
revisión del motor de puerta. No se crea otro mapa de obstáculos o planificador.

El commit vuelve a usar el alta canónica y sus protecciones existentes, pero solo
tras validar ticket, reloj, sesión y todas las dependencias. Cambios de cuerpo,
terreno/residencia/overlay, intención, ejecución, política de reloj o motor de
puerta durante la espera rechazan sin publicar la propuesta; el ticket no puede
reutilizarse. La prevalidación no retira ninguna ruta ni consume un ID; un cuerpo
en la geometría propuesta rechaza igualmente. El evento de commit aplica la
protección ya existente: revoca exactamente los futuros afectados y propaga
paradas antes de publicar el obstáculo. JS convierte el input y transporta el
recibo; no revalida rutas ni decide contactos.

### Quiescencia no es un ACK de recepción

Un `fenceGpu` de prefijo por sí solo no impide que se envíen dibujos nuevos
después de recibir el fence y antes del commit. `IntentMutationQuiesce` entra por
el canal directo y detiene las siguientes presentaciones **antes** de capturar
`onSubmittedWorkDone`. También espera/cierra el paso a submits GPU independientes
de un frame, que comparten la cola. El recibo menciona sesión, época, secuencia de
intención, instante, versión de reloj e ID de hold. Un recibo equivocado, cierre,
timeout o cambio de dependencias no autoriza commit. El hold se libera solo
después de publicar en el canal directo las revocaciones y la frontera de reloj
posteriores al commit, en ese orden. Si no se pueden publicar, se cierra el canal
en vez de fingir un release seguro.

La presentación posterior al release tiene una frontera temporal mínima igual
al instante físico, y jamás puede ampliar el techo de recursos preparado. Más
importante: **un commit efectivo invalida la generación gráfica anterior**. No se
reproduce la ruta antigua con una posición redondeada justo antes del obstáculo;
un frame ya admitido queda detenido y un frame todavía esperando compilación se
rechaza explícitamente sin resucitar. Los submits independientes antiguos también
se rechazan de forma cerrada. Hasta que se entregue un paquete nuevo no se hacen
nuevos dibujos: la última imagen permanece visible. Esto no pretende representar
ya el obstáculo nuevo ni resolver la sincronización de sus recursos; eso es f-R4.

### Evidencia y límites

`/tests/browser/native-barrier-mutation.html` ejercita WASM y WebGPU reales con un
trabajador nativo y triángulo diagnóstico. Durante un bloqueo síncrono de preparación
de **500,09 ms**, se comprueba que la barrera y ruta aún no cambian al proponer;
cinco dibujos preceden a la quiescencia. El drenaje, commit y revocación se
completan antes de terminar el bloqueo; la barrera pasa de 121 a 122 y se revoca
la ruta exacta en el tiempo 10,25. No se envían dibujos del paquete anterior
después de liberar. No hubo errores GPU. No se ha dibujado un muro nuevo ni un
personaje, y no se afirma que todos los dibujantes estén cubiertos.

Evidencia: `performance/native-barrier-mutation-20261109.json`, verificada por
`tests/native-barrier-mutation-evidence.test.js`. Pruebas WASM/ABI pthread y de
transportes cubren preflight, rutas no afectadas, recibo falso, estado obsoleto,
cancelación, motor revisado, sesión/token, hold GPU y una compilación antigua que
termina después del commit. **517 dirigidas + 39 + 74** aprobadas sin skips; logs
`.cache/native-barrier-quiescence-regression.tap`,
`.cache/native-barrier-quiescence-legacy-stream-geometry.tap` y
`.cache/native-barrier-quiescence-legacy-recipe.tap`. No se declara limpia la
suite general.

**IDs cerrados este turno: ninguno.** Sigue f-R2 hasta cubrir los otros tipos de
mutación y sus variantes; f-R3/f-R4 y e-R3/e-R4 siguen abiertos. El tablero fijo
permanece en **3 cerrados, 5 pendientes**; los padres e/f siguen parciales.

## Cierre de A6-04.f-R2 — Mutaciones nativas condicionadas al dibujante

Se cumple el criterio fijo de f-R2 en el dominio nativo validado de A6-04.a–d:
**overlays, residencia, props y terreno** tienen propuesta todavía no efectiva
y commit condicionado al recibo del dibujante. Es un camino opt-in con una
conexión causal, no activación de producto. f-R3 sigue cubriendo todos los
consumidores, relevo y fallos; f-R4 sigue cubriendo la aplicación de los recursos
gráficos y la prueba con personajes. Los padres e/f permanecen parciales.

### Las cuatro familias usan la misma frontera, no otra autoridad

El ticket nativo de un uso y la quiescencia GPU del incremento anterior se
reutilizan mediante un payload temporal inmutable en `IntentState`. No se crea
otro registro del mundo, planificador, scheduler de movimiento ni test JS de
colisión. Los buffers que recibe WASM son solo entrada serializada: después de
proponer, cambiar esos buffers o el objeto JS no modifica el candidato retenido.
Un solo ticket pendiente evita intercalar una propuesta de barrera y otra familia.

| Familia | Operaciones nativas propuestas y confirmadas |
|---|---|
| Overlay | Alta y lotes de barreras con retiradas/altas atómicas; polígonos de 3–64 vértices, retirada y cambios de permeabilidad. |
| Residencia | Alta síncrona, retiro/lotes y `releaseOnly`, además de publicación de un trabajo realmente preparado en pthread. |
| Props | Supresión de una identidad canónica y restauración del conjunto autorizado de identidades. |
| Terreno | Lotes de asentamientos, adición o reemplazo, usando la receta y los vetos de apoyo existentes. |

Las funciones canónicas siguen siendo propietarias del preflight, los datos y
el commit. Para residencia, props y terreno se introduce una **vista de propuesta**
síncrona: ejecuta las mismas pruebas, pero el ticket indica que todavía no se
pueden publicar datos ni retirar rutas. Las recetas de props/terreno usan sus
vistas scratch existentes y devuelven antes de intercambiar el estado vivo.
Los buffers de entrada antiguos se guardan y restauran; no se sobrescribe una
preparación ajena. Las rutas afectadas permanecen reservadas y sus handles válidos
hasta el commit. Un cuerpo o apoyo actual incompatible rechaza la propuesta antes
de pedir el recibo GPU.

El commit valida sesión, reloj, high-water de intenciones, cuerpos, entidades,
reservas, mundo y revisión del motor; luego llama la operación nativa canónica,
que conserva sus vetos y retiros de rutas antes de publicar el cambio físico.
Las recetas de props/terreno se vuelven a calcular en esa frontera: es coste de
dos eventos, no un scheduler, planner duplicado ni comprobación por tick. Queda
por medir/reducir el coste estructural, y la quiescencia puede congelar dibujo
hasta que f-R4 entregue recursos nuevos. Un trabajo pthread cancelado después de
proponer devuelve rechazo sin publicar el chunk. Cambiar política, cuerpo o
mundo mientras se espera invalida el ticket; un recibo viejo no confirma nada.

La adición/retiro de chunks entrega identidades/resultados nativos exactos al
espejo JS de residencia ya existente; JS no escoge qué chunk cambiar. Si la
conversión falla después de una mutación física, el resultado se informa como
`committed-control-failed` y se cierra el canal retenido. Una excepción durante
el commit no se libera como si el mundo siguiera intacto. El enlace del stream,
recursos y recuperación de producto sigue pendiente, sin fallback silencioso.

### Evidencia del criterio de f-R2

`/tests/browser/native-world-mutations.html` ejecuta **seis casos reales
WASM/WebGPU NVIDIA Turing**, cada uno con su autoridad, canal directo y bloqueo
síncrono de preparación de 500 ms: polígono que revoca una ruta, alta y retiro
de residencia, supresión/restauración de prop y mutación de terreno. En cada uno
el estado y ruta son idénticos antes del recibo; el commit ocurre durante el
bloqueo después del drenaje; la generación previa no vuelve a dibujarse. Hubo
5–6 dibujos antes de cada hold y ninguno de ese paquete después del release;
no hubo errores GPU. La prueba previa de barrera orientada también sigue pasando.

Las pruebas nativas/transportes adicionales verifican lotes y permeabilidad,
identidades de polygon, entradas malformadas, cuerpos/apoyo protegidos, futura
evicción y terreno que revocan **solo al commit**, restauración de prop bajo un
cuerpo o en una ruta futura, rechazo ante cambios de reloj para las cuatro
familias, pérdida del canal, datos de entrada inmutables y actualización exacta
del espejo de residencia. También ejercitan publicación pthread real y su
cancelación durante la espera. Si la conversión JS falla tras publicar, el
canal se cierra y no se confunde con una propuesta abortada.

Evidencia: `performance/native-world-mutations-20261109.json`, comprobada por
`tests/native-world-mutation-evidence.test.js`; la barrera inicial está en
`performance/native-barrier-mutation-20261109.json`. Standalone/pthread
reconstruidos; **536 dirigidas + 39 de streaming/geometría + 74 de receta/estado**
aprobadas sin skips. Logs `.cache/native-world-mutations-regression.tap`,
`.cache/native-world-mutations-legacy-stream-geometry.tap` y
`.cache/native-world-mutations-legacy-recipe.tap`. No se declara limpia la suite
general ni se convierten cantidades de tests en porcentaje de producto.

**Cerrado en este turno: A6-04.f-R2.** Tablero fijo: e-R1/e-R2/f-R1/f-R2
cerrados; **e-R3, e-R4, f-R3 y f-R4 pendientes (4 cerrados, 4 pendientes)**.
Los 11 puntos principales A6 siguen abiertos. La siguiente dependencia es f-R3.
