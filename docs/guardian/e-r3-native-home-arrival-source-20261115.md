# Llegada Home y retirada nativa preparada

Actualización posterior: [participante de ausencia reversible en el roster](e-r3-native-home-absence-roster-20261115.md). La conexión a Surface, admisión directa y hardware sigue pendiente; no se anuncia la capacidad gráfica de retirada.

Continúa el [consumidor Home sobre el actor residente](e-r3-native-home-route-consumer-20261115.md) y el [plan principal](integrated-gpu-migration-plan-20261104.md). Wild Engine puede preparar la retirada del cuerpo que ha ejecutado el corredor completo hasta la entrada real de su aldea y proyectar después `home` en Game. **La ausencia gráfica preparada todavía no está implementada**: la publicación y el host reales rechazan esa clase. No cambia ningún cierre A6/e-R3/e-R4/f-R4/A/B/C.

## Referencias aplicadas

Se leyó [DetourCrowd v1.6.0, `removeAgent` y `getActiveAgents`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L536): el agente deja de participar mediante su registro existente y el pool conserva su objeto. Se contrastó además [Box2D v3.1.1, `b2DestroyBody`](https://github.com/erincatto/box2d/blob/v3.1.1/src/body.c#L321): validación del propietario, retirada de vínculos y proxies, y liberación de la identidad desde el mismo mundo. Wild Guardians adapta esos patrones mediante su eliminación de cuerpo y callbacks nativos ya existentes. La frontera preparada y la generación exacta añaden los requisitos de nuestro protocolo; no se incorporan otro motor, dependencia, cola ni registro de cuerpos.

## Implementación

La propuesta **19** ocupa el mismo `PendingBarrierProposal`. Conserva la asociación Home emitida, su actor/cuerpo, asignación, handle, aldea, destino, pose y fases del extremo ejecutado. Rechaza una ruta todavía en movimiento, una fuente ajena o cancelada y un extremo distinto del Home nativo. Preparar, esperar y cancelar mantienen intactos el cuerpo, ruta, reservas y semántica `returning`.

La revalidación prepara una frontera actual y comprueba que la fuente y todo el extremo físico permanecen iguales; permite que avance el reloj común mientras el cuerpo llegado sigue retenido. El commit condicionado aplica las comprobaciones comunes de sesión, propuesta, reloj, secuencias, mundo, cuerpos y reservas. Correlaciona también el ticket preparado exacto, incluso al revalidar tarde.

Sólo después llama a la eliminación del registro físico existente. Su callback revoca ordenadamente la ruta, libera cruces y reservas, desliga el cuerpo y elimina la intención activa. El trabajador permanece en el registro nativo existente como inactivo y sin cuerpo, con la secuencia de retirada que sólo emite este commit. La marca se descarta al cambiar elegibilidad/posición o ligar un cuerpo nuevo; una fila reconstruida sin cuerpo no puede fabricarla. El resultado de 52 valores conserva las dos fronteras y la secuencia real de retirada como recibo histórico síncrono, sin emitir otro permiso de movimiento ni mantener un mapa de finalizaciones.

El perfil `home-arrival` reutiliza el transactor de admisión común. Antes del commit vuelve a comprobar el Game propietario, aldea y entrada actuales, estado `returning`, ausencia de tarea/caja/recuperación y pose/fases realmente ejecutadas. Exige `nativeHomeArrivalVersion=1`, plantilla exacta y fotograma retenido. Tras el resultado nativo correlacionado proyecta `home`, conserva las fases, elimina el marcador Home activo y no vuelve a liquidar la entrega. El guardado conserva únicamente la semántica ordinaria del trabajador llegado.

`Game.tick` admite ese trabajador como inactivo consultando sus registros nativos actuales: con la secuencia de retirada preparada vigente, sin elegibilidad, cuerpo ligado o intención activa, y con semántica/entrada coherentes. Cambiar sólo la etiqueta JS a `home` no concede esa aceptación ni elimina el cuerpo. No se amplía con ello el soporte de Idle inicial, recuperación o las otras clases todavía pendientes.

## Validación y límites

La [evidencia de fuente](performance/native-home-arrival-source-validation-20261115.json) registra compilación, regresión y sus límites. Las pruebas ejercitan los módulos nativos reales standalone y pthread; los fotogramas preparados y recibos de drenaje de la nueva admisión son **dobles explícitos**.

- Ambos artefactos canónicos compilan y exponen los **10 exports** de propuesta, resultado y lectura de inactividad. La propuesta tiene 24 valores; el resultado, 52; la traducción temporal, 8.
- **642/642 pruebas en 60 archivos**, sin omisiones, 110,551 s, incluyendo las **18 nuevas**. Tras limitar la consulta de inactividad a trabajadores con estado `home`, la validación final de los cuatro archivos afectados es **40/40**, sin omisiones, 15,707 s. Esa selección está incluida en las 642 y no se suma.

- Compilación final de producto correcta en **46.35 s**, con los avisos existentes; los **16 hashes originales protegidos** mantienen sus valores exactos después de compilar.

Los casos comprueban retención durante preparación/cancelación, eliminación exclusiva del cuerpo llegado y revocación directa, invalidación del handle anterior, rechazo de ruta incompleta, fuente ajena o retirada, revisión de cuerpos cambiada, frontera de drenaje incorrecta y ticket preparado ajeno; revalidación tardía con el extremo idéntico; proyección a `home` y tick posterior sin recrear el cuerpo ni cobrar otra vez; rechazo de recibos sin versión/plantilla y de cambios de entrada, pose, fases o incapacidad. La publicación y el host reales rechazan la nueva plantilla/asociación hasta implementar su consumidor gráfico.

La primera integración reveló que el guard del cohort de Game todavía exigía tarea activa incluso después de la retirada nativa. El guard se extendió con la lectura de inactividad nativa descrita. El control de etiqueta falsa detectó además que una fila reconstruida sin cuerpo ligado podía parecer inactiva aunque el cuerpo antiguo seguía presente. La secuencia emitida sólo por el commit preparado cierra ese hueco. Reconciliar una etiqueta incoherente puede revocar la ruta, pero conserva el cuerpo y sigue sin autorizar inactividad; la prueba no exige conservar un permiso que el motor debe poder revocar por seguridad.

No hay todavía evidencia GPU de la desaparición del actor al llegar. La ejecución NVIDIA/Turing anterior acredita el movimiento Home, su selección y reutilización incremental; no se atribuye a esta retirada. La recuperación integral del ensayo de 3123 recursos permanece abierta. Guardar un trabajador ya llegado conserva su semántica `home`, pero no su marca nativa de retirada: la admisión de un cohort nuevo con trabajadores inactivos pertenece todavía al flujo de restauración/productor pendiente.

## Siguiente punto

Preparar y retener la ausencia del actor en el consumidor existente, admitirla contra la revocación nativa real y demostrar con hardware que ocultación y eliminación física comparten la misma frontera. Mantener actores y lotes ajenos, sin reconstrucción de escena. Después continúan la admisión nueva del Home guardado, cambio de contrato desde Idle activo, Idle inicial, otros finales/cancelaciones, puertas, productor ordinario, recuperación y aceptación A6/A/B/C antes de D.
