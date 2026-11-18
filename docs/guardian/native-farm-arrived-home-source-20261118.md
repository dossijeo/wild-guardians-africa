# Fuente Farm23 terminada → Home19/18

Continúa el [relevo Farm23 terminada a Task en el consumidor original](native-farm-idle-phase-20261118.md) y el [plan integrado](integrated-gpu-migration-plan-20261104.md). La fuente Home existente acepta ahora el extremo real de Farm23, conserva su cuerpo durante19 y adquiere18 sin parada24 ni historia Idle. Este incremento acredita fuente/ABI y la API pública de Game; control, admisión y consumidor del nuevo relevo siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Implementaciones consultadas y decisión

Se reconsulta el código real de [`dtCrowd::requestMoveTarget` y `resetMoveTarget` de DetourCrowd1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L607) y [`NavigationAgent3D::set_target_position`/`_request_repath` de Godot4.4-stable](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/navigation_agent_3d.cpp#L643). Cambian el destino y el estado de navegación del agente existente; mantienen su cuerpo. Se adapta ese patrón al portador de pose y al request Home actuales. No se añade dependencia, planificador, registro de cuerpos, export, formato/version de DTO o evaluador de movimiento JavaScript.

La condición terminal se comparte con la reclamación Task ya implementada: cuerpo Farm actual, cache de ejecución, llegada efectiva, running/velocidad cero y tiempo no anterior al final nativo real. La misma entrada ABI Farm distingue el origen completado del retenido por24; la entrada Idle sigue sin aceptar Farm. Una llegada móvil no obtiene este permiso.

## Retención del cuerpo y solicitud

El request copia la última pose nativa, sus fases, radio, flags y presupuesto. Conserva la secuencia/generación Farm en los campos de ascendencia existentes. Un marcador interno del mismo request identifica que la pose procede de23 terminada; no se serializa como suspensión ni como otro cuerpo. La rama completada libera el corredor y sus reservas mediante el transactor existente, conserva el cuerpo y publica un único `RouteInvalidated`6 con el handle23 exacto y su `homeRequest`19.

La validación de Home exige el mismo actor/cuerpo/perfil, la ascendencia de la asignación anterior, la nueva secuencia de request, generación de intención cero y ausencia de reserva/suspensión. La pose sigue coincidiendo con el cuerpo registrado. La secuencia del request queda preparada antes de emitir el evento, de modo que la retención ya es válida cuando se drena la reserva del motor anterior. La rama24 conserva su slot realmente suspendido como antes.

Repetir el mismo destino es idempotente; un destino diferente es conflicto y una barrera pendiente impide el retarget. Mientras19 espera se conservan cuerpo y fases; se puede revalidar/cancelar/repreparar el candidato. Sólo el commit18 adquiere la nueva trayectoria y comienza Home. El número de cuerpos y el RNG mundial permanecen iguales. Escrituras de pose/radio/flags se rechazan mientras el cuerpo está retenido; retirarlo cierra el request.

## Puente y Game

El puente compara el origen recibido con la lectura nativa actual antes de mutar. El origen completado debe tener tiempo finito y posterior a su final real; actor, handle, cuerpo, fases y demás valores deben coincidir. La continuación Home comprueba además versión, tiempo, sesión, perfil, flags, radio y pose sin convertir23 en24.

La lectura de un extremo realmente completado puede proyectarse aunque el contrato haya vencido. Las declaraciones nuevas y las llegadas todavía móviles mantienen sus restricciones. `requestNativeFarmHome` exige contrato/hora terminados y un origen completado o realmente detenido, sin Task/caja/lesión/raid. Usa la entrada de la aldea y conserva `returning`/`pending-home-resources`, sin pasar por Idle. Después de19, Game puede mantener ese cuerpo y avanzar el Task peer; después de18 proyecta Home mediante el motor nativo.

No se habilita aquí `Game.tick` para Farm23 activa antes de declarar19. La transición automática del productor/cohort y el final hacia Idle siguen pendientes. Las pruebas de Game llaman a la API pública sobre el extremo ya atestiguado y después comprueban los ticks19/18.

## Validación y alcance

Pasan24 casos nuevos finales: cuatro perfiles, standalone/pthread, llegada con viaje o ya dentro del radio, revocación única y fuente19 exacta, identidad incorrecta, espera1.8s, revalidación/cancelación/repreparación, adquisición18, contrato expirado por la API pública, continuación de Game/peer, pin/removal del cuerpo y procedencia terminal alterada. Pasan63 dirigidos con las regresiones de Farm24→Home y Farm23→Task. Las primeras pruebas corrigieron el nombre del campo público del evento y la publicación del reloj causal antes de preparar18; no se modificó ese requisito del protocolo.

Los dos controles negativos de sólo lectura fallan una vez cada uno, con23 casos filtrados y cero cancelaciones. El WASM de `6d7253bed` rechaza el nuevo request terminal; se carga por un loader que cambia sólo la URL del fixture, sin sustituir el binario de producto. El segundo elimina sólo la comprobación de tiempo finito de la continuación y acepta indebidamente procedencia infinita. Un intento previo con variables de entorno no seleccionaba el WASM de ese fixture de URL fija y no se cuenta como control negativo.

Pasan2.657/2.658 pruebas de248 archivos, con una comparación opcional omitida y cero fallos/cancelaciones. Build pasa en1m44s. Se congelan406 entradas y64 fuentes/artefactos nativos; ambos módulos se reconstruyen con flags/exports canónicos. Cambian C++, el include Home y ambos WASM. El módulo JS pthread y su worker conservan bytes.

La regresión hardware aislada con los binarios finales corresponde al relevo ANTERIOR Farm23 terminada→Task6/14: NVIDIA/Turing conserva645 IDs inmutables, sustituye una textura de movimiento, prepara70 recursos y crea0 después de READY, con0 shaders/pipelines nuevos. Hay54 dibujos en cada bloqueo1800ms, picking de ambos actores, adopción5 y drain real. Su ventana completa de relevo contiene127 muestras, máximo33.51ms y0>50ms; captura completa875 muestras, máximo66.64ms y2>50ms. Es una ejecución timing sin PNG; no prueba el consumidor del nuevo Home ni ausencia global de tirones.

Una sonda del siguiente tramo confirma el pendiente del controlador anterior: rechaza el evento con `Native farm arrival transition requires prepared lifecycle` y `admitHome` rechaza la asociación nueva. El controlador queda en secuencia4 frente al evento nativo5 del fixture; su lease antigua no es evidencia de haber aplicado ese evento. No se toma esa instalación de prueba como recibo gráfico o aceptación del nuevo Home.

La [evidencia estructurada](performance/native-farm-arrived-home-source-validation-20261118.json) separa código, ABI de confianza y hardware de regresión. Se preservan los16 archivos locales ajenos, el worker pthread sin seguimiento y los bytes previos de los cuatro documentos principales. Siguen control/puertos/actor/Surface del final23→Home, final Idle, productor/cohort, recuperación incremental integral de3.123 recursos y aceptación global de cadencia/plataforma. Los siete fallos históricos fuera de selección conservan su alcance.
