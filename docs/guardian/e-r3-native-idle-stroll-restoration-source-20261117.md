# Fuente nativa de restauración del paseo

Continúa [TaskStart móvil en el consumidor original](e-r3-native-idle-moving-task-consumer-20261117.md). Este incremento incorpora la declaración nativa de WALK guardado y su adquisición mediante el preparador22 existente. Conserva posición, orientación, fases, presupuesto, destino y stream privado reales, sin restituir permisos de la autoridad anterior. Es aceptación de fuente por ABI: siguen pendientes el guardado/carga de Game, la referencia tipada y su publicación/control, los consumidores originales y la aceptación GPU de la restauración. A6/e-R3/e-R4/f-R4/A/B/C siguen abiertos.

## Implementación consultada

Se consulta el código real de [`dtCrowd::addAgent`, `removeAgent`, `requestMoveTarget` y `updateMoveRequest`, DetourCrowd v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp). El alta reinicia corredor, frontera, velocidades y estado del objetivo; una petición posterior conserva el nuevo destino y calcula desde `ag->npos`. Se adapta esa separación entre valores semánticos, cuerpo actual y corredor nuevo a los propietarios que Wild Engine ya utiliza. La posición guardada permanece exacta; no se adopta el ajuste de Detour a la posición del navmesh.

Se reutilizan `ActiveIntent`, su petición pendiente, la pose genérica `NativeWorkerPoseResourceRequest`, el slot de propuesta, el planificador, las reservas y puertas actuales. No se introduce otro registro de cuerpos, controlador, cola, presupuesto o dependencia.

## Declaración y adquisición

`NativeIdleStrollResourceRequest` conserva sólo los valores semánticos guardados y la identidad de la nueva autoridad. La declaración exige trabajador elegible, centro y ancla actuales, valores finitos y límites del ancla. Rechaza sustituir una intención diferente, un cuerpo ya vinculado o una cohorte ya admitida. Una repetición exacta es idempotente; alterar el estado confirmado no sustituye la declaración.

Sin cuerpo no hay referencia de recursos utilizable. La primera vinculación exacta completa radio, flags e identidad física y emite una nueva secuencia de nacimiento. Se reutiliza la protección existente contra desplazamiento, cambio de radio/flags, revinculación y retirada del cuerpo. La coherencia nativa exige también el ancla original vigente. Las reclamaciones Task no pueden descartar esta fuente pendiente.

El preparador22 distingue una decisión de ciclo21 de una declaración WALK restaurada. Esta última conserva explícitamente `sourceCycleSequence=0`; no inventa una adquisición20/21 ni una decisión aleatoria. El sobre nativo continúa usando22, los kernels de fase/timing, pruebas de reservas y puertas, revalidación temporal y commit ligado existentes. La rama de ciclo conserva su referencia al camino ya elegido, sin añadir una copia de ese vector.

Al adquirir, la declaración pendiente se libera y la asociación22 retiene una sola copia inmutable de su procedencia. El getter de fuente reconoce la asociación ejecutada y su suspensión posterior. Cancelar la preparación conserva la intención; retirar el cuerpo o reiniciar la autoridad elimina su fuente. El snapshot de petición tiene28 valores copiados y los listados reutilizan los buffers de resultados del mismo intent, sin historial de trayectorias.

La restauración cerca del destino no exige de nuevo la separación mínima con la que originalmente se eligió WALK. Si el guardado ya está en el extremo ejecutado, el preparador admite un22 de longitud cero sobre el mismo cuerpo; su blueprint REST utiliza una sola transición original de RNG y requiere después su adquisición21 real. No se obtiene un permiso de movimiento del guardado.

## Evidencia y continuación

Pasan43 pruebas específicas, incluidos15 casos nuevos con los cuatro perfiles en standalone/pthread, pose/fases reales de una autoridad anterior, preparación/revalidación/adquisición, cancelación, metadatos malformados, vinculación exacta, protección/retirada física, llegada y un compañero Home independiente. Mientras el nuevo WALK espera, el cuerpo retenido permanece exacto y el compañero continúa. Las pruebas usan ABI de fuente y no acreditan ni carga de partida por Game ni permisos gráficos.

Pasan **1.785 pruebas del núcleo en 161 archivos**, sin fallos ni omisiones en esa selección. Ambos módulos nativos se recompilan mediante el script canónico con los exports nuevos. La [evidencia reproducible](performance/native-idle-stroll-restoration-source-validation-20261117.json) registra selección del núcleo, regresión GPU del relevo Task anterior, build, hashes y preservación de los16 cambios locales y del helper pthread original. Los siete fallos antiguos reproducidos sobre el padre continúan pendientes para la validación integradaC.

El siguiente punto es conectar guardado/carga y referencia explícita de esta fuente, manteniendo cerrados los consumidores que todavía exigen un origen21. Después se validarán los puertos/roster/Surface y GPU de una autoridad nueva. También siguen pendientes otros finales/clases/puertas, productor/cohorte ordinarios y recuperación incremental integral de3.123 recursos. No se iniciaD ni se declara terminada la restauración móvil.
