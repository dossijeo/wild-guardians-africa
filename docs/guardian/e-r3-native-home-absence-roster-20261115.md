# Ausencia Home reversible en el roster residente

Continúa la [llegada y retirada nativa](e-r3-native-home-arrival-source-20261115.md). El roster gráfico existente puede preparar la ausencia del mismo actor, restaurarla al cancelar y conservar sus recursos Home hasta presentar el resultado. **El transporte, Surface y admisión directa de esta ausencia todavía están pendientes**; la capacidad gráfica no se anuncia y las protecciones actuales permanecen. No cambia ningún cierre A6/e-R3/e-R4/f-R4/A/B/C.

## Referencias y decisión

Se leyeron las implementaciones reales de Three r180: [`Renderer._projectObject`](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Renderer.js#L2645) omite un objeto invisible antes de construir su lista de dibujo; [`Object3D.remove`](https://github.com/mrdoob/three.js/blob/r180/src/core/Object3D.js#L772) separa el hijo y actualiza padre/eventos sin destruir por ello sus recursos compartidos. La vida del binding residente sigue el patrón de referencias ya contrastado en [el consumidor Home](e-r3-native-home-route-consumer-20261115.md).

Se adapta la visibilidad de la raíz existente, sin otra escena, actor, ruta GPU, variante, textura ni material. No se prepara un pipeline para un objeto que estará ausente. La captura temporal no debe cambiar la imagen o selección que el usuario sigue viendo mientras espera el commit.

## Contrato del participante

`prepareNativeHomeArrivalProposal` comprueba la asociación Home exacta instalada, el extremo y fases de la entidad confirmada, su aldea y ausencia de tarea/caja/recuperación. Ocupa el slot `nativePending` del mismo actor. No mueve ni libera el cuerpo nativo.

El propietario que grabe el fotograma deberá seguir este orden:

1. `activate` oculta temporalmente la raíz para grabar el paquete de ausencia.
2. `afterCapture` restaura la visibilidad anterior **antes de esperar el ACK del paquete**. READY conserva el cuerpo presentado y su selección.
3. Cancelar o invalidar restaura el propietario anterior. Revalidar tarde permite reutilizar la plantilla original o refrescarla sin asignar otros recursos.
4. `finalize` exige el resultado tipado de la retirada nativa y sus recursos/fronteras exactos. Sólo entonces mantiene oculta la raíz.
5. `retire`, después de presentar el fotograma retenido, libera el propietario Home anterior mediante la retirada diferida existente. Si una publicación ya eliminó el actor, no lo libera otra vez.

La selección ordinaria sigue acertando en el extremo mientras la ausencia está READY y deja de ofrecer ese actor tras el commit. La geometría, índices y materiales originales permanecen idénticos durante preparación y rollback. El slot y vida del roster actuales resuelven cancelación, eliminación antes del commit y eliminación antes de presentar, sin otro controlador o cola.

## Validación y límites

La [evidencia del componente](performance/native-home-absence-roster-validation-20261115.json) distingue estas pruebas de una aceptación gráfica integrada. Los fixtures usan los recursos originales y la autoridad C++ real para el extremo y la eliminación, con admisión/renderizador dobles y commits ABI de prueba explícitos. Todavía no certifican el paquete retenido ni el drenaje GPU real de esta clase.

Las ocho pruebas nuevas cubren origen exacto, revalidación tardía conservando la plantilla, refresco tardío, cancelación antes/después de capturar, eliminación antes del commit o presentación sin fugas, fuente/semántica ajenas y selección ordinaria antes/después del commit. La preparación no añade propietarios del registro ni vuelve a adquirir el actor. La selección de gráficos Home junto al nuevo componente pasa **15/15**, sin omisiones.

La regresión completa pasa **650/650 pruebas en 61 archivos**, sin omisiones, 115,444 s. Incluye las 642 anteriores y las ocho nuevas; la selección de 15 no se suma. Los artefactos nativos permanecen iguales a `214f2a758`.

Compilación de producto correcta en **42.31 s**, con los avisos existentes. Los **16 hashes originales protegidos** mantienen sus valores exactos después de compilar.

El siguiente incremento debe conectar este participante al protocolo de recursos, grabación de Surface, correlación directa de la revocación nativa y ACK de drenaje existentes. Sólo entonces podrá anunciarse `nativeHomeArrivalVersion=1` y demostrarse la ausencia en hardware conservando los actores/lotes ajenos y sin creaciones después de READY. La restauración nueva, las demás clases pendientes, el productor ordinario, la recuperación integral de los 3123 recursos y la aceptación A6/A/B/C siguen abiertos.
