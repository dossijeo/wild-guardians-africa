# Productor ordinario: Harvest15 → Carry16

Continúa e-R3/f-R4 desde [la corrección de paridad](native-crop-selection-parity-20261120.md). La misma autoridad que contrata al trabajador, recibe la madurez del cultivo y ejecuta Task14/Harvest15 llega ahora a Carry16. Se cualifica el consumidor y el productor ordinarios existentes; no se reimplementa el componente de consecuencias ni se modifica producto, física, ABI, reloj, selector o dependencias.

## Referencias y ensayo

Se relee fuente real de Dawn, revisión922930e3193753e58591f14a96ab116e5d630964: [ObjectStorage Allocate](https://github.com/google/dawn/blob/922930e3193753e58591f14a96ab116e5d630964/src/dawn/wire/server/ObjectStorage.h) distingue reservado de utilizable y exige generaciones crecientes; [ServerDevice](https://github.com/google/dawn/blob/922930e3193753e58591f14a96ab116e5d630964/src/dawn/wire/server/ServerDevice.cpp) conserva la reserva al completar el callback de pipeline. Se verifica la copia de [Comlink4.4.2 requestResponseMessage](https://github.com/GoogleChromeLabs/comlink/blob/v4.4.2/src/comlink.ts): conserva el resolver por ID y envía el mensaje y sus transferibles originales. Se aprovecha el interceptor ya usado por Farm/Task/Action; no se importa ninguna biblioteca ni se crea otro protocolo.

La opción QA_NATIVE_BIRTH_FOLLOW_CONSEQUENCE exige el recorrido Action previo. El mismo puerto retiene el resultado preparedTaskConsequenceTemplate auténtico y observa nativeTaskConsequenceBinding del commit real. El preparador se bloquea1,8s con READY retenido y otros1,8s tras reenviarlo sin modificar. La autoridad y el draw Worker conservan sus puertos independientes.

Antes de adquirir Carry, el cultivo y la tarea siguen presentes, no aparece la nueva caja y el trabajador no la posee. La imagen nativa mantiene Harvest en su fase terminal mientras continúan publicaciones y reloj. Tras el commit real se comprueba cultivo retirado, tarea eliminada, caja con sourcePlantId y carrierId correctos, estado carrying/native-delivery y cuerpo2. El ticket efectivo y el tiempo de ejecución enviados al consumidor corresponden al commit emitido; no se usa el instante de la plantilla como inicio retrospectivo. Carry avanza durante el bloqueo y conserva al compañero.

La primera ejecución llega a Carry pero la guarda QA suponía nueve nodos nuevos. El modelo tiene también copias GPU del cuerpo sobre geometrías existentes. Se contrasta la fábrica real y se añade una observación de las SkinnedMesh canónicas: se exige una copia por geometría de cuerpo y nueve copias rígidas que reutilizan geometrías ya presentes, sin alterar raíz, huesos o mallas originales; el compañero no adquiere nodos. Se conserva ese fallo como diagnóstico y se repite el mismo caso con la guarda correcta, sin cambiar producto. Esa ejecución positiva se reutiliza en la matriz porque sus seis hashes coinciden, en vez de repetirla.

## Resultados nuevos

| Caso GPU | Pared | IDs invariantes | Fábricas agregadas Farm READY / posteriores | Mayor intervalo desde la primera publicación del contratado |
| --- | ---: | ---: | ---: | ---: |
| olderFemale | 64.299s | 576 | 119 / 1423 | 182.920ms |
| olderMale | 65.463s | 576 | 119 / 1426 | 334.100ms |
| youngFemale | 64.590s | 585 | 154 / 1564 | 212.465ms |
| youngMale | 64.019s | 585 | 154 / 1549 | 222.850ms |
| task-control | 29.702s | 585 | 154 / 132 | 47.835ms |

Los cuatro perfiles adquieren Carry16 en hardware NVIDIA/Turing y seleccionan al trabajador después de la retirada autoritativa del cultivo. No cambia la prioridad de volúmenes compartida con la ruta heredada. Ambos actores nativos siguen usando su banco con refs2/pending0; se conservan576 IDs del inventario de cada perfil mayor y585 de cada perfil joven. No se destruyen esos recursos ni se duplican módulos WGSL idénticos. El control sin las nuevas opciones conserva Task14. Cero errores de fuente/navegador/red/GPU en los cinco casos; drenaje real y autoridad viva hasta el cierre gráfico. Las cuatro capturas se inspeccionan con modelos, caja y sombras originales en ese encuadre limitado, sin certificar paridad completa.

Los dos bloqueos de Carry tienen54 dibujos cada uno en los cuatro perfiles. Las publicaciones y el reloj avanzan1,70–1,72s, el cuerpo permanece en el extremo durante READY y avanza1,786–1,807 unidades después de adquirir Carry. Los contadores de fábricas en esas inspecciones son:

| Perfil | Antes del bloqueo READY | Después del bloqueo READY | Después del commit |
| --- | ---: | ---: | ---: |
| olderFemale | 3335 | 3335 | 3352 |
| olderMale | 3339 | 3339 | 3356 |
| youngFemale | 3592 | 3592 | 3609 |
| youngMale | 3575 | 3575 | 3592 |

Son cero fábricas nuevas durante la espera READY observada y17 hasta la inspección posterior al commit. Las17 no están atribuidas exclusivamente a la consecuencia ni demostradas mínimas. Los agregados119/1423–1426 y154/1549–1564 incluyen el recorrido completo y efectos/crecimiento concurrentes, no una reconstrucción de los576/585 recursos invariantes ni el coste exclusivo de Carry.

**Cadencia abierta:** el historial amplio registra182,920–334,100ms y tres intervalos mayores de50ms en cada caso Carry. El análisis del máximo334,100ms encuentra dos submits del mismo ticket13, ninguna oportunidad de dibujo registrada entre ellos y el hold de mutación ya liberado antes del intervalo. No demuestra una espera de admisión ni identifica la causa; tampoco excluye efectos de la instrumentación. Se conservan los datos y las marcas, sin relajar límites causales o de recursos. Los54 dibujos dentro de cada bloqueo no aceptan la fluidez fuera de esas ventanas. Siguen abiertos los167,650/168/50,71ms previos y el caso global3.123.

65 controles CPU de consecuencia Game/gráficos/cultivo/admisión, canal, productor ordinario y selector pasan sin omisiones ni fallos (18.670s de pared;18577,1224ms Node). Seis módulos pasan sintaxis. Las mediciones GPU terminan antes de los controles CPU. La selección completa de365 archivos y el build son heredados de755812f61 (4838/4839, una omisión; build139,142s), no ejecuciones nuevas. No hay cambios de producto que recompilar: se verifican997 archivos de ejecución/paquetes,694 inputs de la selección registrada,64 entradas nativas,16 archivos ajenos y38 A5. La selección no representa todas las pruebas del repositorio ni elimina sus exclusiones históricas.

## Continuación

El siguiente recorrido pendiente es la llegada de la misma caja a destino y la liquidación17, disponibilidad/tarea siguiente y Home cuando venza el contrato, conservando este productor, cuerpo y consumidores. La infraestructura de componente ya existe y debe contrastarse antes de ampliar el ensayo. Las causas de los intervalos amplios requieren evidencia adicional integrada en esas comprobaciones; no se atribuyen a la política del selector ni justifican otro mecanismo experimental.

Siguen pendientes otras intenciones/cohortes, cancelación antes de READY, carga fallida, cierre GPU durante preparación, recuperación de consumidor fallido/device loss, VFX, publicación, cadencia y plataformas. WALK retenido y main pausado ya están acreditados y no se reinician. A6/A/B/C abiertos; D no iniciado; f-R3 conserva su cierre de seguridad.

Reproducción: Node20, Vite5218 y Playwright existentes; audit_native_farm_birth_world_owner.mjs con QA_NATIVE_BIRTH_SCENARIO=cancel-after-task, QA_NATIVE_BIRTH_FOLLOW_ACTION=true, QA_NATIVE_BIRTH_FOLLOW_CONSEQUENCE=true, perfiles existente/contratado iguales y QA_NATIVE_TRACE=false. Los controles desactivan las dos opciones. [Recibo, comandos, hashes y datos originales](performance/native-ordinary-harvest-carry-20261120-validation.json).
