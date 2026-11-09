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
