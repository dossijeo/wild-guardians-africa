# Ruta Home nativa y proyección en Game

Actualización posterior: [consumidor Home sobre el mismo actor residente](e-r3-native-home-route-consumer-20261115.md). El alcance descrito debajo corresponde al incremento de fuente; la llegada/retirada y restauración nueva siguen pendientes.

Continúa el [cuerpo retenido tras la entrega](e-r3-native-delivery-home-pending-20261115.md) y el [plan principal](integrated-gpu-migration-plan-20261104.md). Wild Engine puede ahora preparar y admitir el corredor Home genuino desde ese propietario, conservar sus fases y proyectar el movimiento en Game. La llegada mantiene el cuerpo protegido hasta una retirada preparada. **El consumidor gráfico de Home y su retirada todavía están pendientes**; e-R3/e-R4/f-R4 y A6/A/B/C siguen abiertos.

## Referencia aplicada

Se continuó la lectura del código real de [DetourCrowd v1.6.0, `updateMoveRequest`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L749), incluido el contraste del resultado con el corredor y la petición actuales antes de adoptarlo. La adaptación utiliza el borrador y el único slot de propuesta que Wild Guardians ya tiene. La política del plan exige un corredor completo hasta la entrada real de la aldea; un extremo parcial no satisface esa intención. Se conservan los algoritmos existentes de ruta, temporización, reservas y puertas, sin otra cola ni dependencia.

## Implementación

La propuesta **18** reutiliza `PendingNativeMotionDraft` y `PendingBarrierProposal`. Recibe actor, sesión y secuencia de la asociación estacionaria emitida; lee el destino desde su Home nativo vigente. No recibe una trayectoria de JavaScript ni crea Task/Resume. Calcula el corredor nativo completo, conserva radio/perfil, fases acumuladas y presupuesto de carrera, y aplica las pruebas comunes de geometría, cuerpos, reservas temporales y puertas. El perfil de movimiento es el retorno ordinario, sin caja ni recuperación.

Preparar, cancelar y revalidar dejan intactos el cuerpo y su propietario estacionario. El commit condicionado vuelve a comprobar sesión, propuesta, tiempo, reloj, mundo, reservas, cuerpo y fuente exacta. Sólo entonces transfiere el mismo cuerpo a una ruta Home sin tarea ni lease de objetivo. Su asociación inmutable vive en el mismo `RouteSlot`; conserva la procedencia anterior como dato histórico y deja de exponerla como permiso estacionario vigente. La liberación de la ruta elimina también esa asociación.

Los encabezados de propuesta y asociación conservan las formas comunes de 24 y 52 valores; la lectura de ejecución combina un encabezado Home y la caché de pose existente. Ambos artefactos canónicos exponen los **21 exports** de propuesta, revalidación, asociación y ejecución. La referencia tipada comprueba fuente Home, actor/cuerpo, frontera, handle, extremo completo, perfil, radio y fases; rechaza alias de Task/Resume y cambios del extremo o semillas físicas.

El transactor común incorpora el perfil `home-route`, con plantilla, asociación y liberación `nativeHomes`. Exige un recibo con `nativeHomeRouteVersion=1` y la plantilla exacta antes de ejecutar C++. La preparación queda obsoleta si cambian la entrada de la aldea, pose, fases o condiciones de recuperación/incapacidad. No se emite esa capacidad desde el consumidor actual.

Game lee la ejecución del propietario nativo, proyecta posición y fases y conserva `returning`, sin caja, tarea ni copia de ruta JS. El tick no entra en el caminante Home heredado. Llegar al extremo real no cambia todavía a `home`, no oculta el actor ni libera el cuerpo. Esas consecuencias requieren su frontera preparada. Los trabajadores independientes siguen utilizando el mismo reloj y dominio físico.

Se corrigió una suposición de `notifyWorkerPlanningChange`: los retornos nativos también pueden carecer de tarea y deben conservar su marcador semántico. El guardado admite pose, aldea y estado de retorno, sin asociaciones o tickets. La carga de un Home nativo guardado se rechaza **antes** de reemplazar la sesión viva hasta implementar su admisión nueva. El consumidor gráfico rechaza por ahora `nativeHomes` tanto en bootstrap como en liberación de una mutación; las protecciones de disponibilidad estacionaria y puertas permanecen.

## Validación

La [validación registrada](performance/native-home-route-source-validation-20261115.json) distingue los controles de fuente y sus límites:

- **603/603 pruebas en 54 archivos**, sin omisiones, 95,072 s. Incluyen clases anteriores, economía, reservas, proyección, contratos, regreso ordinario, persistencia y nuevos casos Home. La selección Home final es **17/17**, sin omisiones, 11,480 s; está incluida en la regresión y no se suma.
- Ambos artefactos nativos canónicos compilan y exponen los 21 exports. Compilación de producto correcta en **45,18 s**, con los avisos existentes.
- Las pruebas nuevas comprueban retención durante preparación y cancelación, asociación exacta tras revalidación tardía, rechazo de fases/extremo/alias alterados y de una disponibilidad sin Home, conflicto real con otro cuerpo en la entrada, movimiento por el mismo tick nativo y retención al llegar, en standalone y pthread. Verifican también rechazo de recibos sin versión/plantilla y de semántica o pose modificadas, ausencia de permisos en el guardado y rechazo previo de restauración incompatible.
- Un loader de sólo lectura carga `tasks.js` de `4f53f9b2b` en su URL original con las demás implementaciones actuales: reproduce **dos fallos**, uno por módulo nativo, al borrarse el marcador Home durante la notificación. Siete casos quedan fuera de esa selección. La corrección actual pasa ambos; no es una comparación integral del commit padre.
- La primera regresión ampliada encontró dos fixtures de contratación que fundaban una aldea con una cultura distinta de la partida. El Game de `4f53f9b2b` reproduce ambos rechazos. En `4cb6f5083` se sustituyeron únicamente esos dos argumentos por `s.culture`; las **13/13 pruebas** pasan también cargando el Game anterior. Así vuelven a comprobar el retorno a la aldea original y la reasignación territorial sin cambiar la regla de cultura del producto.
- Los 16 archivos originales protegidos fuera del stream ya modificado en un incremento anterior mantienen sus hashes exactos después de compilar.

Los recibos y paquetes preparados de las nuevas pruebas del transactor son dobles explícitos. La física, fuente, temporización, asociaciones y proyección en Game usan los módulos nativos reales. **No hay aún una prueba gráfica de la ruta Home, ni una nueva afirmación de continuidad GPU o reutilización de 3123 recursos.** La evidencia GPU del incremento anterior se limita al cuerpo retenido tras la entrega.

## Siguiente punto

Conectar Home al consumidor existente de movimiento: mismo puerto de preparación y slot retenido, terreno, actor residente, variantes ya usadas de Walk/Run, reloj y selección tipados, asociación directa del control nativo y drenaje real de GPU. Sólo después anunciar su capacidad. A continuación preparar su llegada/retirada y la admisión nueva al restaurar, sin utilizar el Home heredado para anticipar efectos.

Siguen pendientes el cambio de contrato desde un Idle ya activo, Idle inicial, otros finales/cancelaciones, puertas en el consumidor, productor ordinario de todas las clases, recuperación integral y aceptación A6/A/B/C antes de D. Este componente no activa el backend principal ni modifica las reglas ordinarias de cultura, contratación o retorno.
