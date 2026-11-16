# Vista ejecutada del paseo Idle en Game y transporte en vivo

Continuación del [actor residente 22](e-r3-native-idle-stroll-roster-20261116.md). Se incorpora la lectura del paseo realmente adquirido al modelo de Game y al transporte confirmado existente. No activa la cohorte ordinaria del tick ni declara restaurable un paseo; esas fronteras requieren todavía fuentes genuinas de tarea/Home/descanso y una petición nueva al cargar. Surface y hardware siguen pendientes.

## Fuente consultada y adaptación

Antes del diseño se leyó código real de [Bevy/Rapier v0.31.0](https://github.com/dimforge/bevy_rapier/blob/v0.31.0/src/plugin/systems/rigid_body.rs), `apply_rigid_body_user_changes` y `writeback_rigid_bodies`: separa el destino cinemático solicitado de la posición ejecutada y evita activar cambios cuando los valores coinciden. Se adapta ese patrón al proyector y frontera nativos existentes, junto con la distinción local entre transporte en vivo y guardado restaurable. No se introduce integrador, controlador, reloj, registro de cuerpos o dependencia.

## Vista actual y frontera

`projectNativeIdleStroll` exige el Game propietario, actor/cuerpo/perfil/centro correspondientes, watermark ejecutado igual a `state.elapsed` y la posición previamente proyectada. La primera adopción parte de la vigilancia terminal y pose verdaderas del ciclo 21. Después exige el mismo ancla, destino y RNG privado del propietario 22. Escribe pose y fases leídas de la fuente; no mueve cuerpos, consulta caminos ni reproduce un corredor en JS. Reutiliza el registro de posiciones proyectadas anterior.

La vista contiene `nativeRouteAdmission:native-idle-stroll`, path nulo y semántica WALK con destino original. `elapsed` y `remaining` permanecen cero como en la rama WALK histórica; la edad de ejecución nativa no se confunde con el contador privado de descanso. ApproachRetry se lee de la fuente. Sólo se sustituyen valores/objetos cuando cambian. Al llegar se mantiene WALK y su RNG: el REST deseado de la fuente no concede una fase nueva ni consume su secuencia privada.

El wrapper preparado proyecta después de la adquisición y commit reales, conservando el contexto Game21 durante preparación/drenaje. Una retirada devuelve `null` desde el propietario nativo. El tick comprueba la presencia de este propietario antes de cualquier posible fallback JS, y sigue rechazando la cohorte 22 antes de avanzar. No se cambia su clasificación C++ ni se permiten los relevos a tarea/Home/REST sobre la pose inicial anterior.

## Transporte y guardado

El validador existente `livePhysics:true` acepta sólo la vista semántica canónica de un trabajador Idle activo, sin tarea/caja/recovery ni handles nativos o polyline. Rechaza destino, fase, RNG o campos ajenos inválidos. El codec confirmado puede publicar esa vista para la adopción de Surface.

El guardado persistente continúa rechazando la clase y `confirmedStateSaveAvailable` devuelve falso. Esto mantiene el mismo criterio de disponibilidad que ya separa otras vistas físicas vivas de un checkpoint restaurable. La carga nueva del paseo, con su pose actual y destino/RNG semánticos, permanece pendiente; no se fabrica un permiso 20 o un corredor histórico para aparentar soporte.

## Validación

Comandos, archivos y hashes en [el informe](performance/native-idle-stroll-live-game-validation-20261116.json).

- **11 casos nuevos:** cuatro perfiles con pose/fases/RNG nativos, llegada retenida frente al REST deseado, Game/watermark/pose/intención ajenos, transporte vivo frente a guardado, cohorte ordinaria cerrada, pérdida del propietario sin fallback, proyección sólo después del commit preparado y pthread.
- **40/40 pruebas dirigidas**, 15489.511 ms; incluyen fuente/control/puertos reales con recibo GPU simulado y guards anteriores del transporte vivo.
- **419/419 pruebas enfocadas en 35 archivos**, 228223.2132 ms, incluyendo familias nativas anteriores, roster/clock/picking, Game ordinario y persistencia/transportes. Es evidencia de componente, sin nueva afirmación de regresión completa del repositorio o aceptación integrada.
- **Build correcto en 47.47 s.** Las 52 entradas comprobadas permanecen idénticas durante regresión/build. Las 17 entradas nativas, 16 archivos locales ajenos protegidos y helper pthread original no cambian; no se recompila WASM.

La primera selección dio 418/419: el fixture histórico del roundtrip Combo creaba una incursión nocturna generada sin su plan ejecutado y el guardado la rechazaba. Se reprodujo el mismo fallo sobre un archivo aislado del padre `0a948dade`, con cinco entradas relevantes equivalentes al commit tras normalizar los finales de línea de Git. Se corrige sólo el fixture para registrar el plan nocturno completado que corresponde a esa incursión. No se modifica la lógica de incursiones ni se relaja el validador; el archivo corregido y la selección completa se vuelven a ejecutar. Los logs fallidos y la evidencia del padre se conservan identificados en el informe.

## Siguiente punto

Completar la preparación/adopción 22 en Surface mediante esta vista ejecutada real y verificar dibujo/selección y conservación de recursos en hardware. Después siguen las fuentes actuales de tarea/Home/descanso tras moverse, cohorte ordinaria, restauración semántica, aproximación/anclas/bloqueo y productor ordinario. Otras clases/finales/puertas, nacimiento/sustitución en vivo, recuperación incremental integral de 3123 recursos sanos y cierres A6/e-R3/e-R4/f-R4/A/B/C siguen abiertos. No se inicia D.
