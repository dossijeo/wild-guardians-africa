# Proyección y carga semántica del ciclo Idle en Game

Continúa el [consumidor preparado sobre el actor residente](e-r3-native-idle-cycle-consumer-20261116.md), desde `88f44002b`. Game adopta ahora la fase realmente ejecutada por la familia 21 y conserva sus datos semánticos al guardar/cargar. El siguiente REST permanece como petición hasta su adquisición preparada; un paseo pendiente continúa reteniendo el cuerpo. La ejecución del paseo, aproximación, cambios de ancla y productor ordinario siguen pendientes. No cambia ningún cierre A6/e-R3/e-R4/f-R4/A/B/C.

## Referencia de implementación

Antes de diseñar la proyección se consultó el código real de [Bevy/Rapier v0.31.0, `apply_rigid_body_user_changes` y `writeback_rigid_bodies`](https://github.com/dimforge/bevy_rapier/blob/v0.31.0/src/plugin/systems/rigid_body.rs). Separa el destino cinemático siguiente de la posición actual, devuelve resultados ejecutados a componentes y compara valores antes de activar su seguimiento de cambios. Se adapta ese patrón a la autoridad y al reloj de Wild Guardians: proyección desde la vista nativa validada en la misma frontera, conservando los canales existentes de intención y recursos. Se reutiliza el restaurador semántico anterior. No se añade dependencia ni otro integrador o registro de actores.

## Frontera ejecutada e intención

`projectNativeIdleCycle` exige el Game propietario, `executedThrough === state.elapsed`, actor, perfil, centro, cuerpo estacionario, pose y acumuladores de locomoción correspondientes al origen real. Copia la fase privada de la vista nativa y evita sustituirla si sus valores no cambian. No avanza contadores ni RNG en JavaScript. El proyector del cuerpo 20 sigue devolviendo `null` cuando el propietario actual es 21: no concede a la fase inicial retenida la autoridad del ciclo en marcha.

El validador de la siguiente propuesta comprueba que Game refleja la fase ejecutada. Obtiene la fase inicial solicitada del sucesor nativo por separado. Por ejemplo, una vigilancia agotada con REST pendiente mantiene `mode:watch`, `remaining:0` durante preparación/cancelación; sólo el commit 21 siguiente instala el REST. Copiar anticipadamente la petición a `worker.idleState` ya no satisface el validador. El wrapper del transactor proyecta después de la adquisición actual y comprueba el epoch antes de modificar Game.

El tick, reconciliación, comprobación de cohorte y frontera de regreso reconocen la nueva vista dentro de sus rutas existentes. El vencimiento diario o de perfil crea Home mediante la API de Game y el cuerpo raíz real. Una cosecha recién madura puede reclamar al trabajador mediante la tarea ordinaria y su TaskStart preparado. Una vez sustituida la intención, sus proyectores de tarea/Home gobiernan Game y el getter del ciclo anterior deja de estar disponible; el consumidor directo conserva su captura de fase hasta el relevo gráfico existente.

## Guardado y permisos nuevos

Se conserva `idleState` ejecutado: ancla, modo, elapsed, remaining, RNG privado y approachRetry. La carga existente convierte el marcador semántico en una petición inicial nueva sobre otro mundo físico; mantiene la pose mientras prepara nuevos permisos 20/21. Los snapshots no contienen referencias ni asociaciones del ciclo. Un ticket con el epoch anterior se rechaza antes de llamar a la ABI.

Se verifican las cargas de descanso o vigilancia en marcha y de una vigilancia agotada con REST o paseo pendientes, en standalone y pthread. Al agotarse, se conserva la vigilancia ejecutada. Tras la nueva admisión de duración cero, la autoridad reconstruida obtiene la misma intención semántica y el mismo RNG/destino. La revisión de navegación derivada pertenece al mundo nuevo y no se exige que reutilice el valor anterior. Ningún permiso o camino físico anterior se restaura desde ese resultado esperado.

## Validación

Resultados, comandos, hashes y lista completa de regresión en [la validación](performance/native-idle-cycle-game-validation-20261116.json).

- **1128/1128 pruebas de regresión**, 97 archivos, 607750,5987 ms; build de producto correcto en 47,28 s. Las dos pruebas adicionales de carga de descanso se verifican después en la suite de 22 pruebas descrita abajo.
- **22 pruebas nuevas de Game:** cuatro perfiles por descanso/vigilancia; REST deseado frente a vigilancia ejecutada; cancelación y adquisición siguiente; pose/propietario/watermark ajenos; paseo pendiente; tarea genuina; fin de jornada y vencimiento diario; ocho combinaciones de carga semántica en ambos módulos. El fixture falla si se intenta usar navegación o movimiento JS ordinarios para estos actores.
- **73 pruebas dirigidas** de Game/admisión/control gráfico/roster, seguidas por la ampliación a las 20 pruebas de Game y la regresión completa; después se añadieron dos casos de restauración de descanso y pasan las 22 pruebas de Game. Los otros ocho archivos de código, incluidos los dos de producto, conservan exactamente los hashes de la regresión/build. Las colas GPU simuladas de esos protocolos no sustituyen la prueba hardware.
- [REST siguiente en NVIDIA/Turing](performance/native-idle-cycle-game-repeat-gpu-20261116.json): fuente, puertos, Surface y Host reales; proyección de Game y preparación sin asignar manualmente la intención a la fase actual. Primer ciclo 96 recursos de protocolo y siguiente 68; cero después de READY. No hay shaders, pipelines ni pipeline-layouts nuevos en el siguiente ciclo.
- [Home inmediato mediante la API de Game, NVIDIA/Turing](performance/native-idle-cycle-game-home-gpu-20261116.json): 21 usa 96 y Home 98 recursos de protocolo; cero después de READY. La adquisición del ciclo se publica antes de que el contrato terminado solicite Home, incluyendo la adopción pendiente de Surface.

Ambos escenarios hardware conservan 577 IDs vivos de texturas y buffers de vértices/índices. Durante cada preparación el Host registra, además de los IDs anteriores, 18 copias de uniformes / 4512 bytes y 18 bindings dependientes. No copia buffers estáticos o texturas existentes y no crea ni copia recursos después de READY. El compañero avanza durante ambos bloqueos de 1,8 s; se comprueba distancia acumulada para cubrir las vueltas de su corredor. Pasan selección ordinaria sobre el checkpoint con watermark retenido, cero errores GPU/runtime/página/consola/HTTP y retirada drenada. Esta selección no mide latencia de clic sobre un objetivo que sigue moviéndose.

El hardware utiliza el mismo checkpoint mínimo de desierto 640×360, calidad `muy_baja`, nueve sectores y dos actores originales del informe anterior. Home termina en el corredor comprobado del fixture. Se ejercitan el proyector y API de contrato reales; la bomba del escenario no es el tick completo ni el scheduler ordinario de recursos. El tick completo se prueba en CPU con la fuente WASM real. La carga comprobada es la del snapshot semántico: los checkpoints de autoridad completos y sustitución de una partida viva siguen sujetos a su aceptación integrada.

Los dos módulos nativos/fuentes compiladas y los 16 archivos locales ajenos protegidos conservan sus hashes. No se modifican los kernels de movimiento, grafos TSL ni propietario GPU de este componente.

## Siguiente punto pendiente

Ejecutar el paseo que ya produce la autoridad nativa y preparar su presentación sobre el mismo cuerpo. Después deben quedar resueltos su llegada y regreso a descanso, aproximación, cambios de ancla y fuentes estacionarias genuinas tras moverse o liquidar una entrega. La familia 21 aún depende del cuerpo inicial 20 y sus ciclos sucesivos.

La petición de paseo pendiente no autoriza movimiento; el tick mantiene la vigilancia terminal mientras el compañero avanza. Siguen abiertos otras clases/finales/puertas, productor ordinario, nacimiento en vivo, sustitución de partida, recuperación incremental integral de los 3123 recursos sanos y cierres A6/A/B/C. Se continúa por esa política dentro de la autoridad existente, antes de una campaña D.
