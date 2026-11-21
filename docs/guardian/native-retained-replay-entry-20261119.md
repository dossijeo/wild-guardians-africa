# Entrada a replay en receptores retenidos — 2026-11-19

Continúa `fb99bc8b2`, A4/e-R3/f-R4 y la recuperación incremental pendiente. Los receptores y el controlador existentes pueden entrar explícitamente en recuperación desde una frontera viva drenada, reproducir el diario y regresar al mismo canal. Conservan estado, decodificador y numeración de mensajes. **La Surface y el handoff del productor todavía no seleccionan este modo; no se acepta recuperación nativa completa.**

## Código consultado y adaptación

Se inspeccionaron `masterTryPartialResynchronization` y `replicationResurrectCachedMaster` de [Redis 8.2.1, `replication.c`](https://github.com/redis/redis/blob/cd0b12938b6c99978440c6f7e44e34d7ff0aa537/src/replication.c), fijados por revisión y SHA-256. La primera valida identidad de historia y disponibilidad/rango del offset antes de continuar; la segunda reutiliza la conexión/estado retenidos después de esa validación. La decisión aplicable es comprobar identidad y posición antes de cambiar de modo y preservar el estado que continúa la historia. No se introduce Redis, su protocolo, otra autoridad ni otra cola.

En Wild Guardians esa posición es la secuencia/tiempo confirmados y la identidad es la época del canal de terreno. La transición se hace dentro de los receptores y controlador actuales. No se reinician IDs, baseline del decodificador, proyección de supresión ni eventos ya aplicados.

## Comportamiento

- `timeline.retainedReplay` habilita `beginTimelineReplay` sin iniciar un receptor nuevo en replay. Requiere fronteras manuales, negociación completa, secuencia/tiempo exactos entre receptor, proyección, estado y reloj; colas vacías y ninguna entrada, espera de supresión, transacción histórica, hold o checkpoint pendiente.
- `allowRetainedReplay` habilita la entrada equivalente del terreno. Requiere la época ya negociada, frontera completa/aplicada, propietarios gráficos listos y ausencia de batches, reservas, esperas o propuestas nativas. Una propuesta existente se conserva y provoca rechazo de entrada; no se cancela para forzar recuperación.
- Los modos están apagados por defecto. Las capacidades de replay fresco siguen funcionando. Durante replay, tráfico vivo intercalado cierra el receptor con error; las fronteras del diario conservan el orden y no emiten recibos de aplicación viva duplicados.
- `createTemporalSurfaceRecovery({retainCurrent:true})` entra en ambos modos antes de esperar recursos, transmite la retención al preparador/callback existente, revalida el estado y fija la época durante la espera. Solo termina en `live` después de completar los dos receptores; admite un nuevo ciclo sobre esos mismos objetos. Fallo/cancelación deja el controlador en `failed` y exige terminar la Surface según el contrato existente.

No se crean propietarios, cachés persistentes, dependencias ni buffers de transporte nuevos. La recuperación de efectos y la admisión gráfica/nativa siguen perteneciendo a la Surface; un éxito de este controlador no concede por sí solo permiso de dibujo o reloj.

## Validación y límites

Baseline anterior a producción: **3 pases existentes y 8 fallos nuevos**. Después se incorporaron dos pruebas de época cambiante/cancelación en espera: el negativo de época falló antes del guard correspondiente. Pasan **13/13, 10 nuevas**. Comprueban dos ciclos en los mismos receptores, terreno antes de estado/eventos, numeración original al volver al canal vivo, un recibo por publicación, guardas de colas/entradas/supresión/hold/propuesta nativa, intercalado, estado/época obsoletos, concurrencia y cancelación. Receptores, reconciliación, reloj y observación de eventos reales en Node; recursos/GPU/autoridad de propuestas son adaptadores del fixture.

Pasan **231 dirigidas/19 archivos** y **3850 de 3851 seleccionadas/310 archivos**, con 1 omisión opcional, cero fallos/cancelaciones en esas selecciones. Build Vite **46.26s**; cinco módulos parseados. Se verifican **524 inputs**, incluidos los controles negativos, **64 nativos intactos y 16 ajenos exactos** a través de tests/build. Sin cambios de producción posteriores.

La selección amplía la anterior de 295 archivos con 15 archivos relacionados. Dos sondas adicionales se conservan separadas por fallos **reproducidos antes y después** mediante un loader que carga los cuatro módulos originales, sin modificar el checkout: `confirmed-presentation-timeline.test.js` obtiene 19/20 y el mismo `Visual handshake timed out`; `worker-runtime-host-timeline.test.js` no termina en 25 segundos en ambos estados y se retira su árbol de procesos de prueba. El primer intento conjunto de 21 archivos también conserva ese timeout y se detuvo al quedar el host esperando. No se proclama suite universal, ni se elimina el fallo de la documentación, ni se amplía esta tarea para modificar un host ajeno a la transición implementada.

Se conservan también los intentos parciales de implementación por anchors/formato de finales de línea y el ajuste de una expectativa de texto de error a su tipo `TypeError`. Un intento de prueba parcial quedó esperando una preparación que ya había rechazado: se terminó su proceso y el fixture ahora observa el fallo del controlador antes de seguir esperando. El baseline inicial significativo y los resultados finales permanecen separados.

**Sin GPU nueva en esta entrega.** La evidencia NVIDIA del preparador de recursos pertenece a `fb99bc8b2`: 9 chunks/175 nodos/180 generaciones vivas retenidas, 79 objetos para un chunk nuevo y cero creaciones al repetir el checkpoint. Es heredada y no acredita este modo en Surface/Worker ni ausencia de tirones. El último rebuild integral medido sigue siendo 1.893, y el histórico 3.123.

Logs completos sin pérdida, listas, controles anteriores/actuales, fuente consultada y hashes: [recibo de validación](performance/native-retained-replay-entry-validation-20261119.json).

## Siguiente punto del plan

Conectar el modo retenido en la Surface y el transporte existentes con un handoff del productor coherente: checkpoint completo, estado y presentación/efectos iguales, sin restaurarlos por duplicado; replay ordenado y admisión real de la frontera nativa final antes de dibujar. Mantener el rechazo de deltas parciales sin base válida. Después productor/cohort/paradas/relevos ordinarios y cadencia/plataforma. A6/e-R3/e-R4/f-R4/A/B/C siguen abiertos; f-R3 seguridad conserva su cierre; D no iniciado.
