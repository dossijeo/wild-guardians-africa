# Fuente semántica de Idle inicial sin historial ficticio

Avance de fuente sobre `1b462fd08`, 2026-11-16. Esta entrega declara una petición inicial y protege su cuerpo; **no implementa todavía su admisión gráfica ni el ejecutor de los ciclos Idle/Alert/paseo**. No se activa la partida ni cambia ningún cierre A6/e-R3/e-R4/f-R4/A/B/C.

## Código consultado y decisión

[DetourCrowd v1.6.0, `addAgent`, `removeAgent` y `getActiveAgents`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L482-L635) mantienen un agente activo sin objetivo, con velocidades iniciales nulas y pertenencia al registro físico existente. Se adapta esa distinción entre presencia física y objetivo ejecutable. No se importa el ajuste a una posición cercana del navmesh: Wild conserva la posición exacta y rechaza un cuerpo distinto.

Se contrastaron además `src/simulation/idle.js`, `idleFarmAnchor` en Game y `workerPose` en `src/rendering/worker-actions.js`. Idle tiene descanso, vigilancia y paseo, un flujo xorshift32 privado, tiempos de animación propios y un ancla de finca o aldea; el paseo no consume presupuesto de carrera. Ya existen los clips y bancos originales Idle/Alert. Esta petición conserva sus datos; no sustituye esa conducta por disponibilidad estacionaria indefinida ni desarrolla otro generador aleatorio. La ejecución de la política completa sigue pendiente.

## Propiedad y contrato

`NativeWorkerPoseResourceRequest` reúne los metadatos de pose ya usados por Home. Las dos peticiones se guardan en el mismo `ActiveIntent`; no hay otro mundo, registro de cuerpos, ejecutor o cola. Home conserva su ABI y significado.

La nueva declaración `nav_intent_request_initial_idle` exige un trabajador disponible, sin tarea/acción ni intención anterior, centro activo y cuerpo exacto si ya está asociado. Acepta estado todavía sin inicializar, descanso o vigilancia; rechaza el paseo porque su ruta todavía requiere su propia migración. No fabrica Carry, caja, liquidación, Home, suspensión ni ruta de longitud cero. Los datos de pose, fases, presupuesto, perfil, ancla, tiempo de fase, tiempo restante, RNG y reintento de acercamiento permanecen en la petición nativa.

Antes de asociar el primer cuerpo no existe una referencia utilizable. La asociación exacta completa radio/flags y emite una secuencia nueva; un rebind distinto, una pose/participación/radio incompatible o un cuerpo ajeno no la completan. Repetir la declaración idéntica no cambia su secuencia; cambiar sus datos no reemplaza silenciosamente la petición. La misma protección física existente impide mover o incapacitar ese cuerpo mediante upsert. Retirada y reset invalidan la fuente.

El índice de tareas conserva su elegibilidad: una tarea genuina puede sustituir esa petición mediante `AwaitingResources`. El commit heredado sin recursos preparados se rechaza antes de asignarla. El nuevo TaskStart sigue esperando su admisión normal sobre el mismo cuerpo. El nacimiento también puede invalidar y revalidar la candidata preparada de otro trabajador mediante el reloj y las pruebas existentes, sin bloquear su avance.

Los getters tipados son consultas de esta fuente, no permisos. No se anuncia una versión de admisión al consumidor, no se amplía el bootstrap gráfico histórico y no se añaden marcadores a todos los Idle heredados. El camino ordinario anterior no solicita esta API automáticamente. El cache nativo puede avanzar al compañero con este cuerpo retenido; `nativeGameExecutionState` sigue rechazando la clase inicial sin proyector/ejecutor de Game. No hay fallback silencioso que declare migrada esa cohorte.

## Validación

[Registro final de validación](performance/native-initial-idle-request-validation-20261116.json): **732/732 pruebas en 68 archivos**, incluidos 15 casos nuevos y la suite de Idle heredado (408107,7355 ms). Ambos módulos nativos compilan; sus fuentes y binarios conservan los hashes de ese build. El producto compila en **45,64 s**. Los 16 archivos originales protegidos conservan su hash tras la compilación. Es una regresión seleccionada; no se declara verde toda la suite del repositorio.

Los casos de fuente usan el WASM real y un compañero TaskStart genuino. Se conservan los cuatro perfiles y los tres estados iniciales admitidos, y se captura también una transición descanso → vigilancia del código de juego original con su RNG privado. No se mueve un cuerpo ya autorizado ni se utiliza una entrega ficticia para preparar la prueba.

Los primeros ensayos detectaron dos errores de los nuevos fixtures: el centro real usa `farm-structure-N`, no `farm-center-N`, y la ausencia de ruta devuelve -1. La revalidación de una candidata ajena requiere confirmar el nuevo watermark de intención antes de volver a preparar, como exige el protocolo existente. No se atribuyen esos fallos a una regresión anterior.

## Siguiente punto

Faltan el proyector y las declaraciones semánticas de Game/carga, la admisión estacionaria inicial por el transactor común y el consumidor GPU, con transición válida a tarea/Home, cancelación y restauración. Después deben migrarse los ciclos de descanso/vigilancia y el paseo ambiental completo con sus reglas y RNG; un permiso estacionario inicial no bastará para cerrar Idle. Siguen pendientes otras clases y puertas, productor ordinario, sustitución de una partida viva, recuperación integral de los 3123 recursos sanos y aceptación A/B/C antes de D. Este incremento no acredita ausencia de tirones ni vuelve a ejecutar hardware sobre una clase que aún carece de admisión.
