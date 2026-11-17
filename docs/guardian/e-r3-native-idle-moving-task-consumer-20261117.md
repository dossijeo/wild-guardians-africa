# TaskStart móvil en el consumidor gráfico original

Continúa la [fuente TaskStart desde la parada móvil](e-r3-native-idle-moving-task-source-20261117.md). El roster reconoce la procedencia retenida22 en su preparador TaskStart14 existente. La presentación suspendida sigue dibujándose y seleccionándose hasta adquirir el sucesor sobre el mismo actor y cuerpo. El ensayo NVIDIA/Turing utiliza Surface, puertos y Host originales. A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos.

## Código consultado y adaptación

Se vuelve a consultar la implementación real de [`prepare_assets`, Bevy v0.17.2](https://github.com/bevyengine/bevy/blob/v0.17.2/crates/bevy_render/src/render_asset.rs). En el camino aplazado descarta versiones retiradas/sustituidas, pasa el recurso anterior a `prepare_asset` y publica el preparado cuando devuelve `Ok`. Se adapta la comprobación de procedencia y sustitución preparada al slot `nativePending` del roster. La publicación continúa bajo el transactor y la barrera actuales; no se añade cola, coordinador, presupuesto o dependencia.

`taskStartContinuesHeldStroll` contrasta el paquete14 con la fuente final suspendida: actor, cuerpo, perfil, época/sesión, secuencia, fecha, radio, posición y fases/presupuesto iniciales. La comprobación es pura y puede utilizarse durante la activación temporal del candidato. El preparador sigue exigiendo la petición admitida por control directo, soporte de terreno, variante y trabajador/tarea actuales.

Se contrasta la implementación de `applyConfirmedTaskAssignments` y `cancelIdle`. El propietario suspendido reconoce únicamente sus cambios lógicos: tarea, estado, marcador de admisión, cancelación de Idle/destino, revisión de camino y aproximación vacía. Exige tarea asignada al mismo trabajador, camino vacío y pose final exacta; los demás campos, incluido el contrato, siguen fijados. El candidato conserva además su snapshot completo y valida la tarea/objetivo concretos. Cambiar pose, contrato o tarea invalida la preparación.

La presentación suspendida reconoce la activación del candidato14 correspondiente en el mismo slot pendiente, como ya hacía para Home18. Permite captura, rollback y cancelación sin retirar el actor anterior. Al adquirir, el preparador reutiliza geometrías, índices y bancos originales, instala el programa Task y retira el dato22 obsoleto tras su fence. No se cambian los binarios nativos de este incremento ni los contratos de transporte.

## Pruebas y hardware

Pasan **1.770 pruebas en 160 archivos**, sin fallos ni omisiones. Los siete fallos antiguos documentados sobre el padre permanecen fuera de esta selección del núcleo y abiertos paraC. Las pruebas específicas pasan24 casos con cuatro perfiles, GLB/bancos, fuente nativa, terreno y roster reales, usando renderer y reloj de picking deterministas. Comprueban adquisición, captura, activación/rollback, cancelación, retirada, selección después del plazo original22 e invalidación por pose/contrato/tarea. La preparación Home existente comparte ahora el fixture real de parada; sus casos continúan pasando. Estas pruebas no se presentan como evidencia de hardware.

El ensayo GPU solicita una cosecha sobre una planta que ya estaba residente mientras22 continúa activo, conserva la misma tarea hasta la parada12 preparada y sólo entonces confirma la reclamación pendiente. Adopta esa publicación antes de preparar14. El destino, velocidad, RNG y duración de WALK permanecen bajo sus APIs originales. Autoridad y compañero siguen avanzando durante la preparación y la adquisición.

NVIDIA/Turing conserva **685 IDs de geometría/bancos**. Se retira exclusivamente la textura22 identificada por actor/decisión después de sustituir su programa. La frontera preparada es **28,02 s**, la adquirida **30,30 s**. Ambos bloqueos de **1.800 ms** conservan **54 frames**; la adquisición ocurre dentro del segundo. Las selecciones ordinarias identifican al trabajador y al compañero desde sus frames consumidos, sin modificar la pose CPU del rig.

TaskStart prepara **70 recursos de protocolo**:36 buffers,16 bind groups,16 layouts, una textura de datos de ruta y un sampler. Reutiliza shaders y pipelines, sin copias de buffers estáticos/texturas residentes. El Host contabiliza por separado **122 copias de uniformes,14.688 bytes y122 bindings**. Hay cero asignaciones después de READY, cero errores de página/GPU/red y drenaje confirmado al cerrar. La [evidencia de validación](performance/native-idle-moving-task-consumer-validation-20261117.json) registra regresión, build, hashes y preservación.

## Continuación

TaskStart desde el paseo detenido tiene aceptación en este dominio opt-in. Siguen pendientes restauración móvil, otros finales/clases/puertas y productor/cohorte ordinarios. Los siete fallos reproducidos sobre el padre en los dos archivos antiguos siguen siendo deuda de validación integradaC. La recuperación incremental integral de3.123 recursos también sigue abierta: este ensayo conserva recursos en un relevo concreto y no acredita ausencia global de tirones. No se iniciaD.
