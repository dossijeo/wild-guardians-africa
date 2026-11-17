# Publicación y control del paseo restaurado

Continúa el [guardado/carga WALK de Game](e-r3-native-idle-stroll-restoration-game-20261117.md). La petición restaurada vinculada llega al control directo y puede atravesar la transacción asíncrona22 existente. La procedencia semántica, la adquisición nativa y la instalación gráfica siguen siendo pruebas diferentes. El roster/Surface y la aceptación GPU del origen restaurado permanecen pendientes; no se abre la interfaz de guardado ni se cierran A6/e-R3/e-R4/f-R4/A/B/C.

## Investigación y decisión

Antes de adaptar el mecanismo se consulta el código real de [`prepare_assets`, Bevy v0.17.2](https://github.com/bevyengine/bevy/blob/v0.17.2/crates/bevy_render/src/render_asset.rs). La cola descarta por ID las preparaciones anteriores de assets retirados o actualizados; el preparador recibe el recurso previo y la salida preparada se instala al terminar correctamente. La implementación también limita las transferencias por bytes. Se aprovecha aquí el patrón de conservar identidad, invalidar fuentes sustituidas y distinguir preparación de instalación, usando el registro de actor, su petición pendiente y su asociación22 ya existentes. La rama de extracción de Bevy retira el asset anterior antes de preparar; no se adopta esa política de visibilidad, porque aquí rige el hold de recursos existente. No se añade la cola ni el presupuesto de Bevy: esta tarea no necesita otro propietario o dependencia.

La separación entre declaración, cuerpo y ruta nueva ya se fundamentó en el código real de DetourCrowd/Rapier en el incremento anterior. Se mantiene: un snapshot guardado no concede permisos de la autoridad anterior, y una petición de recursos tampoco prueba que esos recursos estén preparados o instalados.

## Implementación

El baseline del bridge añade `pendingIdleStrollRequests` sólo cuando existen peticiones vinculadas reales. Los eventos de estado6 incorporan `idleStrollRequest` únicamente si su secuencia coincide con el nacimiento nativo de la petición. La declaración sin cuerpo no entra en esa lista ni se convierte en un ID físico ficticio; la primera vinculación exacta publica su nacimiento nuevo. El sender original transporta baseline/eventos sin crear un canal adicional. El Host original entrega el campo al control existente y valida duplicados/sesión en vez de ignorarlo.

El control copia y congela la referencia, valida época, sesión, actor/cuerpo, nacimiento, tiempo y exclusión de otros propietarios. Sólo devuelve metadatos cuando la petición y el watermark actuales coinciden. La admisión22 reconoce explícitamente el request restaurado o la decisión del ciclo21 habitual; mantiene estricta esta última y nunca fabrica un ciclo para la restauración. La referencia preparada y la adquirida deben conservar la misma fuente.

El evento de adquisición conserva la procedencia en el registro de ruta existente. Omitirla o sustituirla no avanza el cursor. Una asociación emitida sigue sin conceder dibujo hasta recibir el reloj causal y realizar la instalación exacta en la frontera correspondiente. La instalación valida el lote antes de modificar propietarios; rechaza duplicados, tickets/cuerpos/fases sustituidos, bootstrap histórico y referencias ajenas. Los actores nuevos se registran después de validar el evento, evitando que un rechazo deje un contexto parcial.

Task/Home durante la espera invalidan las admisiones del request anterior. El relevo Home compara la identidad y los valores de la pose retenida con su fuente restaurada real; no los etiqueta como un origen20/21. La cancelación de una preparación conserva la petición para reintentar, pero no instala una asociación posterior en una admisión del ticket cancelado. Cerrar el control invalida sus leases.

`startNativeIdleStrollAfterGpuQuiescence` reconoce también la petición restaurada actual. Reutiliza preparación, revalidación temporal, drain, commit ligado, publicación causal y release originales. Cada espera comprueba que la fuente nativa y los valores retenidos de Game sigan siendo los mismos. Si cambia el ancla o termina el contrato, el paseo anterior no se adquiere; una preparación abortada conserva pose/destino/RNG para el reintento. La proyección posterior usa la ejecución nativa ya conectada a Game.

## Evidencia y continuación

Se añaden **26 casos** y pasan **53 pruebas específicas**, incluyendo regresiones del paseo habitual. Usan guardado/carga y autoridad nativa reales, los cuatro perfiles, standalone/pthread, baseline/evento del primer vínculo, reloj retrasado, retiming, fuente omitida/alterada, rechazo atómico, cancelación/reintento, Task/Home, contrato/ancla cambiados durante preparación y cierre. Dos MessageChannels reales ejercitan el protocolo asíncrono existente. El Host original acepta un baseline válido y rechaza duplicados o sesión ajena sin enviar comandos gráficos ficticios.

Los recibos de preparación/drain son dobles deterministas. Estas pruebas no acreditan recursos residentes, presentación, picking ni GPU de la restauración. No se recompilan los WASM ni se repite hardware: los 62 inputs/binarios nativos permanecen exactos y no se modifica el preparador/roster/Surface. La regresión Task GPU del incremento anterior sigue siendo su evidencia histórica, no una prueba del control nuevo.

Pasan **1.838 pruebas del núcleo en 165 archivos**, sin fallos, cancelaciones ni omisiones en esa selección. La [evidencia de validación](performance/native-idle-stroll-restoration-control-validation-20261117.json) registra selección completa del núcleo, resultados, build, hashes y preservación de los 16 archivos locales previos y del helper pthread. Los siete fallos antiguos reproducidos sobre el padre siguen abiertos para C.

El siguiente punto es admitir este origen en los puertos de recursos, roster y Surface originales y demostrar la adquisición en GPU sin reconstruir geometría/bancos inalterados. También siguen pendientes el productor/cohorte ordinarios, la parada preparada durante WALK activo, otros finales/clases/puertas y la recuperación incremental integral de 3.123 recursos. No se inicia D.
