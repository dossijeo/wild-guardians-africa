# Adquisición preparada de una puerta nueva

La compra prepara una entidad, un mecanismo y sus tres proxies dentro de la adición de mundo kind2. Reutiliza `PendingBarrierProposal`, `WorldResourcePreview` y la confirmación causal existente para una puerta residente que conserva la asignación activa de Farm.

## Estado demostrado

Las pruebas dirigidas de WASM adquirieron zarzas, empalizada girada y reforzado. Verificaron un mecanismo, tres proxies, la pose preparada y la protección contra retirada prematura. La ruta original fuera del corredor sigue avanzando después del commit. Retiming conserva identidad y matrices. También se comprobaron cancelación, obstáculos vecinos, recibos ajenos y cambios del mundo. Pasaron siete pruebas en standalone y las mismas siete en pthread. Los seis exports nuevos se añaden a ambas variantes y se conservaron los imports y el Worker auxiliar.

El primer ensayo esperaba -1 al repetir el commit consumido. La comprobación usa ahora -2, compara el snapshot completo y verifica que el cuerpo anterior sigue avanzando.

## Contrato de ABI aditiva

Los exports anteriores siguen admitiendo su clase anterior. La variante de puerta no se puede adquirir mediante el commit genérico ni el commit de muros sólidos.

| Operación | Firma y lectura |
|---|---|
| Versión | `spatial_world_gate_addition_version()` → 1 |
| Preparar | `spatial_world_gate_addition_stage(id,modelId,x,z,yaw,sx,sz)` → 1; modelos 1 zarzas, 2 empalizada, 3 reforzado. Escala de la entidad cotizada, no de otra geometría. |
| Ticket | `nav_intent_barrier_proposal_ticket/ptr` existente: `[session,ticket,sequence,time,clockSequence,kind=2]` |
| Proxies | `spatial_world_gate_addition_proxies_ptr(session,ticket)` → 18 float32: `[x,z,halfX,halfZ,yaw,passMask]` × 3, marco izquierdo/derecho/envolvente, máscaras `[0,0,1]`. Son datos preparados, todavía sin barreras vivas. |
| Pose | `nav_gate_addition_proposal_pose(session,ticket)` → 1; leer los 40 doubles del `nav_gate_mechanism_pose_ptr()` existente: `[entityNumericId,modelId,mechanismId,baseY,supportMin,supportMax,sampledAt,opening,rootMatrix16,leafMatrix16]`. |
| Revalidar | `spatial_world_gate_addition_revalidate(session,ticket)` → 1; releer ticket, snapshot y pose. Conserva origen de preparación y geometría; repite pruebas físicas con el reloj actual. |
| Confirmar | `spatial_world_gate_addition_commit_bound(session,ticket,sequence,time,clockSequence,preparedTicket)` → 1 |
| Recibo | `spatial_world_barrier_binding_ptr()` → 5 doubles `[1,preparedTicket,preparedAt,currentTicket,currentAt]` |
| IDs adquiridos | `spatial_world_proposal_result_count()` → 3 y `spatial_world_proposal_result_ptr()` → tres int32 en el mismo orden canónico. Asociarlos a UNA entidad y al mecanismo, no a tres muros. |
| Cancelar/liberar | `nav_intent_barrier_proposal_cancel` y `spatial_world_proposal_resource_release` existentes |

Antes de leer memoria de preparación, exigir snapshot vigente y pose válida. Un getter raw no constituye permiso. Copiar arrays antes de otra llamada que pueda crecer o reutilizar memoria WASM. El `entityId` string de Game debe corresponder al ID numérico del mecanismo y a la misma cotización; no derivarlo de IDs de barreras. El recibo conserva las fronteras existentes de recursos y control.

La repetición de un commit consumido devuelve -2, sin nueva adquisición. Un `preparedTicket` ajeno devuelve -9 y conserva la propuesta válida, igual que la adición sólida. Las API genérica/sólida rechazan esta variante con -1. Otros rechazos nativos conservan su significado de geometría bloqueada, datos incompletos o frontera obsoleta; no deben presentarse como éxito ni provocar cobro.

## Propiedad y publicación

El modelo original calcula las tres formas; el draft conserva un nodo de mapa ya preparado para la única puerta nueva. Mientras espera GPU no se registra ninguna puerta ni barrera y no se consume el ID de mecanismo. Preparar prueba soporte, cuerpos, vecinos, marcos/hoja y rutas afectadas. El proof compartido conserva las comprobaciones del instalador bootstrap.

En commit se comprueban frontera, origen, siguiente identidad y coherencia antes de transferir el candidato. El lote canónico existente instala los proxies y el mismo commit inserta el nodo ya preparado del mecanismo, actualiza prueba estática y soporte, y publica el recibo de mundo. No se llama al instalador bootstrap después de publicar barreras. Cancelar destruye solo el candidato. El guard de retirada de proxies sigue vigente.

La apertura inicial se obtiene de la ocupación nativa y queda fija (`from == target`) durante esta adquisición. Para el caso fuera del corredor se prepara la hoja original en esa pose: no hace falta un clock que la anime en la primera captura y no se concede autonomía. El posterior motor usa el binding existente sobre la misma pared/hoja. La entidad adquirida debe incorporarse a la proyección de puertas de la autoridad; no debe volver al controlador JS de apertura ni quedar fuera del conjunto restaurado.

La referencia tipada de la puerta conserva el modelo y la pose semántica de la cotización, además de las matrices y los proxies calculados en WASM. La integración inicial detectó un ULP de diferencia al reconstruir en JavaScript el ancho del marco izquierdo. La preparación gráfica comprueba la entidad, el modelo, la orientación, la escala y la apertura antes del commit. El espejo adopta los tres IDs y las cotas exactas del recibo nativo.

## Ejecución e integración

```powershell
$env:QA_BARRIER_WASM='.cache/native-gate-addition-b7f-binaries/standalone/spatial-savanna.wasm'
.cache/tooling/node20.exe --test tests/native-gate-addition.test.js
Remove-Item Env:QA_BARRIER_WASM
```

Con los binarios integrados basta ejecutar `tests/native-gate-addition.test.js`. El control materializa soporte plano antes de publicar el reloj y coloca la puerta fuera de la ruta original. Pasaron 61 pruebas del checkout, incluida la compra y cancelación desde la autoridad, el espejo, las guardas de los proxies y los propietarios gráficos originales. La compilación de producción con WebGPU Worker y dibujo remoto completó el empaquetado.

## Compra y dibujo

El recorrido ordinario de Desierto confirmó una puerta de zarzas en doce regiones residentes con el Farm de `youngMale` en marcha. Durante la espera del READY real, Farm siguió avanzando y la puerta y su débito siguieron pendientes. La confirmación vinculó el ticket preparado 3 al adquirido 4. Adquirió la entidad `structure-1000000`, el mecanismo 1 y los proxies 116, 117 y 118. Game emitió un solo `PlacementCommitted`, cobró 10 monedas y rechazó el identificador de orden repetido.

La recarga de ese estado en otra instancia de autoridad conserva la puerta y el débito. Farm adquiere una ruta en la época nueva para el mismo trabajador. Pasaron los dos controles de autoridad con WASM y el Host de pruebas.

Edge con NVIDIA Turing mostró la puerta y mantuvo el cuerpo 1, la raíz y las 32 geometrías originales de Farm. El trabajador avanzó sobre la asignación original sin Stop24. El consumidor drenó con cero errores WebGPU. El primer dibujo del ticket 4 registró 40,8 ms a 30 Hz y 1,9 ms de CPU de dibujo. El Host registró una oportunidad retenida justo antes de liberar la mutación. Quedan la cadencia a 60 Hz, las compras que alteran una ruta y la retirada preparada. El paso por el vano tiene su propio control. [Recibo de compra y binarios](performance/native-gate-addition-20261121.json), [control del vano](native-gate-preparation-readiness-20261121.md).

La elección aplica el patrón de preparación/confirmación/cancelación de [Jolt v5.3.0 BodyInterface](https://github.com/jrouwe/JoltPhysics/blob/v5.3.0/Jolt/Physics/Body/BodyInterface.cpp) al propietario de mundo existente. La cotización y efecto únicos siguen la separación entre orden y creación del actor observada en [OpenRA release-20250330 PlaceBuilding](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Traits/Player/PlaceBuilding.cs). No se incorporan dependencias de estos motores.
