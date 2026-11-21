# TaskAction conserva la publicación preparada hasta dibujo y adopción

Continúa A2/A4/e-R3/f-R4 desde [TaskStart](native-task-start-publication-hold-20261120.md). El recorrido ordinario del mismo contratado alcanza ahora Task14 → Harvest15. La primera prueba real reproduce Native prepared command packet unavailable tras confirmar Game la acción; se conserva como diagnóstico. Se corrige la coordinación de Action15, sin declarar completos todos los perfiles ni la cadencia.

## Implementación y fuente contrastada

Surface omitía acting en la retención usada por las familias diferidas. Se añade al hold existente con releaseOnInput:false; se conservan las comprobaciones de paquete, secuencia y frontera. Tras el dibujo real se libera el hold y se espera una publicación posterior del mismo actor, tarea y destino en native-action/acting, con clase y duración declaradas de la acción. Solo entonces se deja libre la propuesta. No cambian host, reloj, productor, ABI, dependencias o políticas autoritativas.

Se relee la implementación real de [Chromium NotifyReadyToActivate/ActivateSyncTree](https://github.com/chromium/chromium/blob/abe9acda311aa8bde88d3882c717d4d82d0c0646/cc/trees/layer_tree_host_impl.cc): exige preparación efectiva y sincroniza recursos y propiedades antes de activar. Se adapta ese patrón al hold presente, sin importar compositor, árbol o scheduler. Revisión y SHA constan en el recibo.

El harness continúa la autoridad Worker, ambos puertos, Surface, preparador y draw Worker originales. El cultivo madura por avances normales; Task14 llega y solicita el READY Harvest auténtico. Se retiene y después reenvía esa respuesta original; no se fabrican ACK, reloj, tarea o asignación. Se bloquea el preparador al estar READY y tras el commit. El compañero ya está legítimamente Idle: se exige avance de publicaciones y reloj/dibujos, sin inventar desplazamiento. El encuadre general incluye el cultivo de destino. Los dos perfiles jóvenes comparten cada uno su banco con el compañero; el control conserva la opción anterior sin followAction.

## Validación y límites

4838/4839 pruebas de la selección de365 archivos pasan, con una omisión opcional y cero fallos (718.230s de pared). Se conservan las tres exclusiones históricas; no equivale a ejecutar todo el repositorio. Los147 controles dirigidos pasan sin omisiones. Build WebGPU/Worker pasa en139.142s. Build y regresión comparten CPU después de terminar todas las pruebas hardware. Seis módulos pasan sintaxis.691 inputs,64 nativos,16 archivos ajenos y38 entradas A5 se verifican por bytes; no se recompila WASM.

| Caso hardware aceptado funcionalmente | Pared | IDs invariantes | Fábricas Farm READY / posteriores |
| --- | ---: | ---: | ---: |
| youngFemale | 53.889s | 585 | 154 / 1006 |
| youngMale | 53.382s | 585 | 154 / 999 |
| task-control | 30.994s | 585 | 154 / 132 |

Los dos Action15 y el control conservan raíces, meshes, geometrías, rigs después de admisión y585 IDs de geometría/bancos. Los bancos terminan refs2/pending0 con dos actores nativos. Ambos trabajadores pasan picking y el drenaje GPU es real, con fuente viva hasta el cierre. Cero errores de fuente/navegador/red/GPU en estos tres casos. Las imágenes de los dos casos Action se inspeccionan con modelos y sombras originales en un encuadre limitado; no prueban paridad completa.

En ambos Action la duración declarada efectiva es2,4s. El consumidor conserva la referencia plantilla inmutable, pero su executionEpoch coincide con el inicio del commit retimado y el tiempo relativo GPU enviado es1,76/1,74s dentro de la acción, sin reproducir retroactivamente la espera. El bloqueo READY de1,8s conserva el contador de fábricas:3014→3014 y2997→2997. Hasta la inspección tras commit se añaden24 llamadas en cada caso (10 buffers,4 layouts de binding,4 bind groups,2 módulos,2 layouts de pipeline y2 pipelines asíncronos), junto con una destrucción ajena a los585 IDs invariantes. El alcance compile-object concurrente no está atribuido exclusivamente a Action y no se declara mínimo. Los154/1006 y154/999 agregan preparación/relevo/efectos desde Farm; no son una reconstrucción de todos los recursos ni un coste exclusivo de Harvest.

**Cadencia abierta:** youngFemale registra46 dibujos durante READY y un hueco máximo de167,650ms, aunque no hay nuevas fábricas GPU en esa ventana; el commit registra54 dibujos y33,540ms máximos. YoungMale registra54/54 y33,495/33,475ms. Reloj y publicaciones avanzan1,70–1,72s en cada bloqueo. Sin traza causal de ese intento, no se atribuye el hueco a una causa. Se conservan los hallazgos históricos168ms/50,71ms y el caso global3.123 abierto. Reutilizar estos585 recursos no demuestra eliminación de tirones.

## Selección pendiente y siguiente punto

OlderFemale y olderMale también alcanzan y dibujan Action15 con reloj, banco, rig y recursos conservados, pero las pruebas completas terminan rechazadas al no seleccionar el contratado junto al cultivo maduro. No se incluyen entre los casos aceptados. Se preservan sus fallos y los diagnósticos: ampliar de45 a145 rayos no resuelve olderFemale;27 rayos intersectan la malla real y después la caja aproximada del cultivo sobrescribe el resultado. La primera instrumentación queda invalidada por recarga Vite tras retirarla antes de terminar; se excluye y se repite con fuente fija. La instrumentación temporal se retira por completo.

Se lee código real de [Three r180 Mesh.raycast/getVertexPosition](https://github.com/mrdoob/three.js/blob/r180/src/objects/Mesh.js), [InstancedMesh.raycast](https://github.com/mrdoob/three.js/blob/r180/src/objects/InstancedMesh.js) y [SkinnedMesh.raycast/getVertexPosition](https://github.com/mrdoob/three.js/blob/r180/src/objects/SkinnedMesh.js). Separan límites de descarte de la intersección geométrica; SkinnedMesh aplica la deformación antes de probar triángulos. Nuestro picker usa la caja lógica del cultivo como resultado final. La siguiente corrección debe resolver esa fase precisa sobre la presentación de cultivos residente, conservando oclusión real, cutout, cámara, tiempo presentado e identidad; dar prioridad incondicional al actor permitiría seleccionar ocultos. No se introduce ahora un cambio especulativo del selector ni otra arquitectura de picking.

Quedan esa selección, la continuación genuina Harvest → Carry16 → entrega17/Home y el resto de cohortes, cancelación antes de READY, cargas fallidas, cierre GPU durante preparación, recuperación de consumidor fallido/device loss, VFX, publicación, cadencia y plataformas. WALK retenido y main pausado ya tienen evidencia propia y no se reinician. A6/A/B/C siguen abiertos; D no iniciado; f-R3 conserva su cierre de seguridad.

Reproducir con audit_native_farm_birth_world_owner.mjs, Vite5218, Node20 y Playwright existentes: QA_NATIVE_BIRTH_SCENARIO=cancel-after-task, QA_NATIVE_BIRTH_FOLLOW_ACTION=true, QA_NATIVE_EXISTING_PROFILE/QA_NATIVE_NEWBORN_PROFILE=youngFemale o youngMale, QA_NATIVE_CAPTURE_MODE=visual, QA_NATIVE_TRACE=false. Los perfiles older reproducen la selección pendiente; false conserva Task14. [Recibo, comandos, hashes y evidencias](performance/native-task-action-publication-hold-20261120-validation.json).
