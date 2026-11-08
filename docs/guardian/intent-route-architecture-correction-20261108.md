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
