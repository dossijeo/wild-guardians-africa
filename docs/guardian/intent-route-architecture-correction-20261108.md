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
