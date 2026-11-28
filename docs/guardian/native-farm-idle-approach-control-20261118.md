# Control de aproximación Idle desde Farm

Continúa la [fuente nativa de aproximación](native-farm-idle-approach-source-20261118.md) y el [plan integrado](integrated-gpu-migration-plan-20261104.md). El controlador admite preparar22 desde una Farm23 realmente instalada y transfiere el permiso al recibir su asociación nativa exacta. No crea20/21/24 ni concede dibujo a una propuesta. Roster/actor y Surface/puertos/Host/GPU de la nueva aproximación siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Referencias y adaptación

Se consulta el código real de [`RawId`/`Id<T>` de wgpu26](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/id.rs#L42): índice y época forman la identidad y el tipo distingue familias. Se revisan también [`LifetimeTracker::triage_submissions` y `schedule_resource_destruction`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs#L296), que vinculan la retirada a envíos completados. Se reutilizan los handles con generación/sesión, el registro/prueba Farm, leases Stroll y la instalación atómica existentes. No se añade registro, propietario, fence, dependencia o evaluador de movimiento/fases en JavaScript.

## Preparación e instalación

`completedFarmStrollSourceMatches` adapta la correlación existente de Farm→Idle21 al descriptor acotado `sourceFarm` de22: mismo actor/cuerpo, flags/perfiles/centro, época/sesión, asignación, radio, extremo y final REAL. `strollFarmPreparationSourceMatches` exige la Farm actual y su prueba gráfica ya instalada. Datos nativos sin instalación previa no permiten tomar prestado el cuerpo ni recuperar permisos retrospectivamente.

La propuesta22 sólo queda preparada. Farm continúa actual mientras se prepara/revalida o cancela el candidato. La preparación exige el watermark de su secuencia de control. El hecho nativo debe ser exactamente `RouteReplaced`, estado1, con revocación del handle Farm actual y la asociación22 tipada, sin otra familia mezclada. El registro Farm queda acotado a su final físico real, incluso si fue adquirido tarde, y su prueba deja de ser actual.

El nuevo registro conserva únicamente la asociación Farm inmutable y el hecho de que estaba admitida; no conserva una cadena de leases ejecutables. La asociación22 emitida puede estar preparada mientras espera su instalación. El dibujo exige la instalación exacta de referencia preparada/real y reloj causal actual, con rechazo de bootstrap histórico, lotes inválidos o asociaciones cambiadas. Datos de fase alterados no pueden sustituir la asociación nativa al instalar.

Se valida la secuencia real entre dos actores: hecho del compañero, su reloj, hecho del relevo y reloj del relevo. El hecho22 puede recibirse antes de su propio watermark y cerrar Farm, pero no autoriza dibujo hasta la instalación. Las sondas iniciales que se saltaban un reloj intermedio o intentaban preparar contra una frontera nativa no confirmada se conservan como errores del ensayo; no se relajan la continuidad de `clockSequence` ni la igualdad del cursor del reloj.

Los orígenes inicial/ciclo/restauración de Stroll y Farm→Idle21 mantienen sus ramas existentes. Una aproximación22 realmente instalada puede pasar a REST21 o a una parada retenida mientras Home espera recursos, sin revivir el permiso Farm.

## Validación y límites

Pasan las20 pruebas nuevas y83 dirigidas en5 archivos. La regresión de255 archivos termina con2861/2862 aprobadas, cero fallos/cancelaciones y una comparación opcional omitida. Build correcto en1m 41s; sintaxis de3 módulos correcta. Los421 inputs probados y64 inputs/artefactos nativos permanecen idénticos al congelado. No se reconstruye WASM. Los cinco controles negativos fallan exactamente una vez, con19 casos filtrados y cero cancelaciones.

Las pruebas nuevas usan WASM standalone/pthread, fuente/journal/reloj/controlador reales y los cuatro perfiles. Las instalaciones gráficas son un setup de confianza: no hay paquete retenido, recibo de dispositivo ni drain de esta aproximación. Se prueban preparación prolongada/cancelación, adquisición tardía, falta de prueba padre o watermark, corrupción de fuente/evento/asociación, instalación atómica, eliminación/retiro/dispose, REST21 y parada/Home.

Los cinco negativos de sólo lectura cargan el controlador anterior o retiran únicamente la igualdad del cuerpo, cota física Farm, watermark de preparación o igualdad `RouteReplaced`. Cada uno falla exactamente una vez como se esperaba. El primer ensayo nuevo detectó que se aceptaba `RouteAssigned` con una revocación: se restringe el nuevo relevo al evento que emite la autoridad. No se cambia la clasificación de otras familias.

No hay GPU nueva. La regresión GPU del relevo estacionario de `9c5b49a2a` conserva su alcance anterior y no acredita este controlador ni la nueva caminata. Las mediciones globales anteriores, incluido Home264/147ms, siguen sin aceptación ni atribución de causa. Permanecen actor/roster/Surface de la aproximación, restauración y reintentos nativos sin camino, productor/cohort, recuperación incremental integral de3.123 recursos y cadencia/plataforma.

Los [resultados y hashes](performance/native-farm-idle-approach-control-validation-20261118.json) identifican los inputs. Se conservan16 archivos ajenos, el worker pthread sin seguimiento y los bytes anteriores de los cuatro documentos principales.
