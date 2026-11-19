# Checkpoint de fuente en el cursor retenido — 2026-11-19

Continúa `2fdd772a9`, A4/e-R3/f-R4. La Surface retenida exige que estado y efectos coincidan con su frontera actual; el handoff anterior solo ofrecía el checkpoint antiguo del diario. Se añade al replay existente la proyección de un checkpoint completo en el cursor retenido y la reproducción exclusiva del sufijo posterior. **El host/WorldWorker/cliente/UI ordinarios todavía no seleccionan este camino ni conservan sus puertos durante el handoff.**

## Referencia de código y decisión

Se volvieron a inspeccionar `masterTryPartialResynchronization` y `addReplyReplicationBacklog` de [Redis 8.2.1, `replication.c`](https://github.com/redis/redis/blob/cd0b12938b6c99978440c6f7e44e34d7ff0aa537/src/replication.c), revisión y SHA-256 fijados en el recibo. La primera valida identidad de historia y rango conservado; la segunda encuentra el punto solicitado y omite los bytes anteriores. Se conserva ese patrón: verificar la historia completa y su frontera antes de omitir las publicaciones ya aplicadas. Aquí el cursor cuenta fronteras de publicación, no bytes, y requiere además terreno/estado/efectos coherentes.

La implementación reutiliza el diario, decodificador incremental, validación de headings y parser de descriptores nativos existentes. No introduce un diario, caché persistente, autoridad, dependencia o propietario adicional. La proyección es temporal, limitada por capacidad y devuelta como copia separada; la base original del diario permanece disponible.

## Comportamiento

- `projectRetainedPresentationCheckpoint` exige un cursor dentro del diario confirmado y valida la historia completa contra el handoff de terreno de fuente. Rechaza candidato pendiente, huecos, época/revisiones incompatibles, encoder fallido, historia incompleta o capacidad excedida.
- Reconstruye el último snapshot completo, poses declaradas, headings y chunks/revisiones hasta ese cursor. Una publicación `unchanged` conserva snapshot y tiempo previos. El checkpoint no reemite eventos anteriores. Los efectos de presentación/trabajo proceden del consumidor en esa misma secuencia/tiempo; la igualdad semántica exacta y la admisión gráfica siguen siendo responsabilidad de la Surface.
- Las retiradas conservan su revisión y `capturedAt` de fuente. Un handoff de base puede incluir tombstones, permitiendo readmisión posterior con su revisión real. Se refuerza el validador existente para distinguir una revisión viva de una retirada y contrastar el tiempo exacto de esta última. No se fabrican revisiones o tiempos para superar una carencia del diario.
- El parser nativo se comparte entre la copia del descriptor publicado y la reconciliación gráfica. Copiar la identidad de un commit no acredita que el consumidor aplicara sus recursos. La reconciliación sigue exigiendo el batch gráfico real y la Surface sigue exigiendo admisión de escena/control directo antes de dibujar.
- `createPresentationRecoveryReplay({retainedCheckpoint:...})` solo admite fronteras atómicas. Envía el checkpoint proyectado y `retainCurrent:true`, después las entradas posteriores. Conserva la base original del diario, las confirmaciones por ID/frontera, las esperas de commit y el rechazo de un cambio de base durante una espera. Puede consumir nuevas entradas anexadas durante replay; no duplica las del prefijo.
- El receptor temporal transmite el modo retenido a la transacción y rechaza flags ambiguos antes de invocarla. El camino fresco sigue siendo el valor por defecto y no transmite el campo nuevo.

## Validación

**23 pruebas nuevas pasan.** Con los cuatro módulos anteriores cargados mediante un loader separado, el baseline final obtiene **2 pases negativos y 21 fallos** (los dos negativos también aceptan el `TypeError` de API ausente; no demuestran validación retenida anterior). El loader conserva las URLs originales de importación y el checkout actual; sus fuentes anteriores se contrastan con `2fdd772a9`.

Las pruebas usan el diario y decodificador reales en modos completo/incremental, el productor real de revisiones de terreno, snapshots guardados reales, eventos emitidos por `Game`, MessageChannel y el receptor temporal. El último caso aplica el sufijo a `createConfirmedStateReceiver` real: secuencia3→6, incluido `unchanged`, eventos posteriores una sola vez, objeto de datos del trabajador conservado. Los payloads geométricos y registros nativos de esta nueva selección son fixtures de contrato; no constituyen una autoridad C++ o una admisión GPU nueva. Los efectos son DTO de frontera para este protocolo, no una prueba GPU de VFX activo.

Se cubren retirada/readmisión, tombstones en una nueva base, snapshot/heading/pose/identidad nativa incorrectos, eventos previos omitidos, ACK aplazado, cursor fuera de rango, hueco posterior, cambio de base durante la espera, entradas anexadas, flags estrictos y capacidad combinada del diario y la proyección al crear el checkpoint. El decodificador del diario puede ampliar su caché de lectura ya contabilizada; no se confunde esa variación con un cambio de base o de entradas.

Pasan **422 dirigidas/27 archivos**, **4032 de 4033 seleccionadas/315 archivos**, 1 omisión opcional, cero fallos/cancelaciones en esas selecciones; build Vite **49.95s**, cinco sintaxis. Se congelan **536 inputs, 64 nativos intactos y 16 ajenos exactos**. No se recompila WASM. Los dos fallos separados de negociación/host timeline reproducidos en `8bbf5daa7` siguen fuera de esta selección y documentados en su recibo; no se proclama suite universal.

Se conservan los intentos iniciales: un error de cierre de objeto en producción, fixtures que bajaban el tiempo guardado e invalidaban turnos de incursión/muros, una expectativa que ignoraba la caché de lectura del decoder, y publicaciones de prueba sin cabecera `unchanged`/IDs de evento genuinos. La primera regresión ampliada se detuvo por su árbol de procesos propio después de detectar ese último defecto del fixture, antes de editar los inputs congelados; su log parcial y hashes se guardan por separado y no se cuentan como regresión completa. El caso con receptor real y eventos `Game` corrige esa debilidad. Baseline y validación finales se ejecutan de nuevo con fuentes congeladas.

**Sin GPU nueva en esta entrega.** Las cuatro sesiones NVIDIA, 9 chunks/175 nodos/180 generaciones conservadas, 80 objetos frente a 1.893 frescos y noop cero pertenecen a `2fdd772a9`. No prueban este nuevo sufijo en el handoff ordinario ni ausencia de tirones.

Fuentes fijadas, listas, logs completos, intentos y hashes: [recibo de validación](performance/native-retained-cursor-validation-20261119.json).

## Siguiente punto

El relevo ordinario todavía cierra los puertos y desecha el codificador. Debe congelar el productor en una frontera verificable, obtener el cursor/efectos actuales del consumidor, conservar o sustituir explícitamente sus canales sin intercalado y usar esta proyección/sufijo antes de liberar la Surface con la frontera nativa final. Después siguen productor/cohort/paradas/relevos ordinarios, cadencia y plataforma. A6/e-R3/e-R4/f-R4/A/B/C abiertos; f-R3 seguridad conserva su cierre; D no iniciado.
