# Idle nativo pasa a Home al vencer el contrato

Avance de componente sobre `4117b084f`, 2026-11-16. e-R3/e-R4/f-R4 y A6/A/B/C siguen abiertos. El siguiente pendiente de esta vertical es admitir la publicación Home que llega mientras Surface adopta Idle y comprobar el relevo en el consumidor GPU real; Idle inicial, vencimiento de tareas activas o pendientes, puertas y productor ordinario conservan sus pendientes.

## Referencia y decisión

Código fuente consultado: [DetourCrowd v1.6.0, `requestMoveTarget` y `resetMoveTarget`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L573-L624), y `updateMoveRequest` en el mismo archivo. Ambos cambios de objetivo conservan el agente activo y su posición; la petición y el corredor ejecutable tienen estados distintos. Adaptamos esa separación al `ActiveIntent` y al protocolo de recursos existentes. No importamos su cola, ajuste al navmesh ni política de rutas parciales; Wild Engine mantiene la autorización de una ruta completa. No hay nuevas dependencias, controlador, ejecutor ni registro paralelo.

## Cambio

`nav_intent_idle_home_request` exige sesión, secuencia y liquidación Idle vigentes, trabajador sin tarea/acción y cuerpo físico exacto. Lee pose, radio, fases y presupuesto de ese propietario nativo; el llamador aporta el destino semántico. Emite una petición Home nueva en `AwaitingResources`, excluye nuevas reservas de tareas y conserva la asociación física de la liquidación anterior. Su recibo histórico no cambia de Idle a Home. Repetir la misma solicitud es idempotente; cambiar origen, destino o sesión no reemplaza el propietario.

Game solicita la transición antes de avanzar si el contrato diario ya terminó, o exactamente después del paso que alcanza la hora de salida del perfil. Mientras prepara Home, conserva el cuerpo inmóvil y permite avanzar al compañero. La guardia de la frontera sólo se abre para Idle genuino y los propietarios Home ya soportados. Una tarea en movimiento o pendiente de recursos sigue rechazando su vencimiento antes de avanzar el reloj; conservar un cuerpo Idle anterior no basta para atravesar esa frontera.

El nuevo origen utiliza la misma petición tipada y propuesta Home 18 ya existentes. La propuesta conserva exactamente un origen semántico, aunque el Idle anterior siga reteniendo el cuerpo; el commit emite la ruta y retira esa asociación. Se conservan economía, entrega única, fases y reglas de marcha de Home.

El espejo de control conserva la prueba y el registro Idle durante esta petición sólo si coinciden actor, cuerpo, sesión, época, perfil, pose y secuencia. La ruta Home emitida revoca ese registro. El roster prepara una sustitución reversible sobre ese mismo actor; sólo admite el Idle exacto como precedente de una petición Home. Cancelación restaura materiales/visibilidad y retirada elimina ambos propietarios. Los arranques gráficos históricos siguen protegidos.

La notificación ordinaria de tareas conserva ahora `pending-home-resources` aunque el trabajador no tenga tarea. El evento nativo sin tarea/objetivo utiliza los `null` canónicos del decodificador; el control acepta esa representación sin aceptar un identificador no nulo ni omisiones.

## Validación

Resultados finales en [el registro](performance/native-idle-home-validation-20261116.json): **702/702 pruebas en 66 archivos**, con 12 casos nuevos (403349,7872 ms). Ambos módulos nativos compilan y la compilación del producto pasa en **44.35 s**. Los 16 archivos originales protegidos conservan su hash tras la compilación. Es una regresión seleccionada; no se declara verde la suite completa del repositorio.

El control de sólo lectura con Game en `4117b084f`, conservando los demás módulos y WASM actuales, reproduce el rechazo del Idle vencido: un fallo esperado y 11 casos omitidos (`Native task game cohort contains an unsupported mover`). El cargador sustituye sólo ese módulo en memoria, sin reemplazar archivos del checkout; no es una comparación de rendimiento del padre completo.

Las pruebas de transporte usan WASM real, los puertos de recursos/control, cliente y host reales, con cola GPU simulada. Para evitar reutilizar una liquidación gráfica histórica, la prueba admite primero la entrega a Idle y después Home en los mismos canales. Las pruebas del roster usan los modelos, clips y terreno originales con servicios de render/admisión simulados. Esto no acredita hardware ni la ausencia de tirones en la partida integrada.

Durante el desarrollo se detectó el borrado del marcador por la notificación de tareas y la diferencia `null`/0 en eventos sin tarea. También se corrigieron preparaciones de prueba: arranque histórico rechazado, llamada a Game sobre el estado previo de una entrega aún no liquidada, código de rechazo de upsert y sincronización manual que omitía relojes intermedios. Los resultados finales sustituyen esos ensayos fallidos, no los convierten en pases.

## Pendientes y alcance

La espera de adopción de Idle en Surface aún sólo reconoce Idle o una tarea siguiente; debe reconocer también el Home inmediato con su pose retenida. Falta llevar esta transición al laboratorio GPU existente y verificar preparación bloqueada, continuidad del compañero, identidades residentes, selección, cero creaciones después de READY y drenaje real. Este incremento no prueba el productor ordinario, sustitución de una partida viva ni recuperación incremental integral con los 3123 recursos sanos; tampoco cierra Idle inicial, otras cancelaciones/finales, puertas, B o C. La migración continúa según el plan A → B → C → D.
