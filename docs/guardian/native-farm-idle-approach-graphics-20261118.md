# Actor Farm → aproximación Idle22

Continúa el [control de aproximación](native-farm-idle-approach-control-20261118.md) y el [plan integrado](integrated-gpu-migration-plan-20261104.md). El roster prepara la caminata22 sobre el actor Farm residente y permite después su relevo a REST21. Conserva `arriving` hasta la adquisición real22, sin fabricar20/21/24 ni anticipar la proyección Game. Surface/puertos/Host/GPU de la aproximación siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Referencias y decisión

Se consulta el código real de [`Mesh.copy` de Three.js r180](https://github.com/mrdoob/three.js/blob/r180/src/objects/Mesh.js#L111), que comparte referencias de geometría/material, y [`SkeletonUtils.clone`](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/utils/SkeletonUtils.js#L388), que reconstruye las asociaciones del esqueleto al crear una instancia. La adaptación conserva incluso el actor ya creado. No añade dependencia, propietario, registro de bancos, reproductor o evaluador de trayectoria/fases en JavaScript.

## Fuente, recursos y continuidad de propietario

La rama Stroll reconoce `sourceFarm` mediante `idleCycleContinuesCompletedFarm`, la comprobación existente de la fila terminal nativa23 inmutable. Contrasta asignación/cuerpo/perfiles/flags/centro/época/sesión, radio, posición, yaw, fases/presupuesto y la política Farm capturada. Distingue el final REAL instalado del tiempo preparado que permanece en la fila; no vuelve a muestrear la trayectoria en JavaScript.

Mientras prepara, la entidad sigue `arriving`/`native-farm-arrival`, sin Idle, tarea, destino o aproximación de tarea anticipados. Los orígenes frío/restaurado y ciclo→paseo conservan sus ramas. Sólo después de finalizar22 se proyecta su WALK real de Game con destino ancla y descanso conservado.

Se reutilizan variante, reemplazo de binding, retarget de reloj, rollback y retirada diferida existentes. La unión de capacidades Walk/Run/Idle conserva los bancos ya preparados aunque la aproximación nunca corra. Raíz, mallas, geometrías e índices mantienen identidad. Los bancos mantienen objeto, datos y versión y no reciben `dispose` antes de cerrar la fixture, incluidos Run y Alert no usados por la aproximación. Sólo los datos de movimiento Farm se sustituyen por el programa22; al adquirir REST21 estacionario se retiran también los datos22.

La entidad llegada desde una aproximación mantiene el descanso de nacimiento y el ID de destino del ancla mientras espera REST. La validación de21 reconoce esos valores únicamente si la asociación Stroll tiene `sourceFarm`; el paseo local mantiene descanso0 y destino `idle-worker`. No se amplían sus exclusiones.

## Validación y límites

Pasan las33 pruebas nuevas y172 dirigidas en6 archivos. La regresión de256 archivos termina con2894/2895 aprobadas, cero fallos/cancelaciones y una comparación opcional omitida. Build correcto en1m 30s; sintaxis de3 módulos correcta. Los423 inputs probados y64 inputs/artefactos nativos permanecen idénticos al congelado. No se reconstruye WASM.

Las pruebas usan los cuatro perfiles, Farm walk/run y llegada con/sin desplazamiento, WASM normal y pthread, modelo/bancos/terreno originales, picker y compilador TSL real. Renderer, admisión y reloj enviado de picking son dobles; no hay recibo de dispositivo ni paquete retenido/drain nuevo. Color y sombra usan los mismos bancos Walk/Run/Idle y no conservan tags de reloj Farm. La raíz permanece estática al seleccionar el extremo y la nueva caminata nativa.

Se prueban espera de preparación, cancelación/rollback, retarget compatible sin nuevos propietarios, fuente Farm adquirida tarde, cuerpo/asociación ajenos, política/pose/perfil/centro cambiados, escritura Game anticipada y relevo real a REST21 sobre el mismo actor. La validación de recibo no retira Farm ante una asociación falsa. El log inicial conserva una expectativa demasiado estrecha del mensaje de error; las fuentes alteradas se hacen coherentes con su wrapper y filas para ejercitar la comprobación del roster, además de los validadores DTO existentes.

Tres controles negativos de sólo lectura cargan el roster anterior o eliminan únicamente la igualdad del cuerpo o la política Farm en el comprobador compartido. Cada uno falla una vez como se esperaba, con32 casos filtrados y cero cancelaciones; no modifican código de producto.

No hay GPU nueva. La prueba de Surface deberá comprobar identidad física de recursos, selección, cadencia y continuidad de las fases con el preparador bloqueado. Los recibos anteriores del relevo estacionario no acreditan la aproximación. Las mediciones globales, incluido Home264/147ms, permanecen sin aceptación ni causa atribuida.

Los [resultados y hashes](performance/native-farm-idle-approach-graphics-validation-20261118.json) delimitan la evidencia. Se preservan16 archivos ajenos, el worker pthread sin seguimiento y los bytes anteriores de los cuatro documentos principales. Siguen Surface/puertos/Host/GPU, restauración y reintentos nativos sin camino, productor/cohort, recuperación incremental integral de3.123 recursos y aceptación de cadencia/plataforma.
