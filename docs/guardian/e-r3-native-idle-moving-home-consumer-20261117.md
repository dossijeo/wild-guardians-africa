# Home desde el paseo suspendido en el consumidor original

Continúa la [fuente tipada y petición Home desde22 retenido](e-r3-native-idle-moving-home-data-20261117.md). El roster reconoce ahora ese origen en el preparador Home existente. Conserva la presentación suspendida mientras se prepara el regreso y adquiere la ruta18 sobre el mismo actor, cuerpo y bancos residentes. La aceptación usa Surface, puertos y Host originales en NVIDIA/Turing. A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos.

## Código consultado y adaptación

Se consulta el código real de [`prepare_assets`, Bevy v0.17.2](https://github.com/bevyengine/bevy/blob/v0.17.2/crates/bevy_render/src/render_asset.rs). El camino de assets aplazados descarta versiones retiradas o sustituidas, entrega el asset anterior a `prepare_asset` y sólo inserta el preparado cuando devuelve `Ok`. Se adapta la comprobación del propietario anterior y su reemplazo preparado al slot `nativePending` existente del roster. No se añade cola, presupuesto, coordinador o dependencia. La publicación física/gráfica sigue usando el transactor y la barrera de consumidores actuales.

La separación entre nuevo destino y agente físico retenido sigue la implementación real de [`requestMoveTarget` y `updateMoveRequest`, DetourCrowd v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp), ya contrastada al implementar su fuente. El regreso usa la pose final nativa y la petición Home18 existentes; no fabrica una fuente estacionaria20/21 ni reactiva el corredor22 anterior.

## Propietario y cambios lógicos permitidos

Al adquirir la parada, el estado gráfico existente conserva una copia tipada de su procedencia22 y los valores finales recibidos. `homeProofCurrent` contrasta la petición Home con ese cuerpo, perfil, flags, pose y fases antes de preparar. La generación suspendida y la fuente22 siguen siendo metadatos de procedencia; el control directo concede por separado el tiempo de dibujo.

El cambio confirmado a `returning` cancela únicamente los campos lógicos correspondientes de WALK: marcador de admisión, Idle y destino. La validación del cuerpo suspendido reconoce esa cancelación exacta y exige la pose/fases finales. El resto de la política continúa fijado: cambiar contrato, tarea, perfil u otros campos invalida la preparación. Esta compatibilidad lógica no concede movimiento ni sustituye la comprobación nativa de la petición.

La presentación suspendida permanece válida durante la activación temporal del candidato Home que la reemplaza. Se identifica por el candidato y la referencia Home del mismo `nativePending`; una preparación ajena no conserva esa vigencia. Esto permite captura, rollback, cancelación y selección sobre los recursos anteriores hasta el relevo, sin relajar el contrato general de las suspensiones.

Se reutilizan el preparador Home, la variante/materiales del actor, la admisión de pipelines y la captura de comandos existentes. Surface y los puertos usan el template Home y la asociación revalidada que ya transportaban. El antiguo dato de ruta22 sólo se retira después del relevo y su fence; geometrías, índices, bancos y actor siguen residentes.

## Pruebas y hardware

Pasan **1.727 pruebas en 153 archivos, 228.559,2585 ms**, y el build en **45,76 s**. Se verifican los 151 inputs ensayados y los 61 inputs/artefactos nativos, sin recompilarlos en este incremento; los 16 archivos locales protegidos y el helper pthread original sin seguimiento permanecen exactos.

Los casos nuevos usan los cuatro perfiles, GLB y bancos originales, fuente12/22/18, terreno y roster reales, con renderer y reloj de picking deterministas. Comprueban captura, activación/rollback, cancelación, retirada, selección, conservación de geometría y vencimiento del plazo anterior22 mientras Home espera recursos. Alterar la pose final o el contrato invalida sólo su candidato. Estas pruebas unitarias no se presentan como evidencia de GPU.

El ensayo en NVIDIA/Turing añade Home después de la parada móvil real. El contrato termina por el reloj de Game, sin alterar el contrato fijado del trabajador, y `requestNativeIdleHome` consume la fuente suspendida real. Se publica y adopta el estado Home pendiente antes de preparar. No se modifica la velocidad, el destino Idle, el RNG o la duración del paseo.

La autoridad y el compañero continúan durante **54 frames en 1.800 ms** de preparación bloqueada. Con el candidato listo, otro bloqueo íntegro de **1.800 ms** permite **54 frames** y la adquisición Home dentro de ese intervalo. La frontera preparada es **27,76 s** y la adquirida **30,04 s**. La selección ordinaria identifica al trabajador que regresa y al compañero con sus tiempos consumidos; no cambia la pose CPU del rig.

Se conservan **678 IDs de geometría/bancos**. La textura de ruta22 obsoleta se identifica por actor/decisión y se retira tras el fence. Home prepara **70 recursos de protocolo**: 36 buffers, 16 bind groups, 16 layouts, una textura de datos de la nueva ruta y un sampler. No hay shaders, pipelines ni copias de buffers estáticos/texturas residentes nuevos. Las copias internas del Host se contabilizan aparte: **120 uniformes, 13.664 bytes, y 120 bindings**. Hay **cero asignaciones tras READY**, cero errores de página/GPU/red y drenaje confirmado al cerrar. [Evidencias y comandos](performance/native-idle-moving-home-consumer-validation-20261117.json).

## Continuación

La parada móvil de cuerpos suspendidos y este relevo Home tienen aceptación en su dominio opt-in. Siguen pendientes tarea durante paseo, restauración móvil, aproximación/anclas/bloqueos, otros finales/clases y motores de puertas, productor/cohorte ordinarios y recuperación incremental integral de 3.123 recursos. La prueba no habilita la cohorte ordinaria de Game ni acredita todas las especies o perfiles en hardware. No se inicia D ni se anuncia ausencia global de tirones.
