# TaskStart conserva su publicación hasta dibujar y adoptar la tarea

Continúa A2/A4/e-R3/f-R4 tras el [diagnóstico de frames](native-frame-gap-diagnostics-20261120.md). Una tarea real que reclama al contratado con Farm READY pendiente reproduce un fallo de coordinación en Surface: Game ya confirma Task14 y el commit gráfico rechaza Native prepared command packet unavailable. Se corrige la retención de publicación del recorrido existente; no se retiran las comprobaciones de secuencia/paquete/frontera ni se añade otro propietario, cola, reloj, dependencia o ABI.

## Cambio y referencia de fuente

TaskStart estaba fuera del hold que ya protegía Farm, Home y otras familias diferidas. Una publicación ordinaria podía actualizar el stream entre capturar el paquete y recibir su commit. La Surface incluye ahora TaskStart en esa misma retención, con releaseOnInput:false. Conserva el candidato hasta su presentación real; después libera la retención y espera la proyección autoritativa del mismo trabajador/tarea/destino antes de dejar libre la propuesta. Se admite la declaración pending-action-resources del mismo encargo si la ruta ya ha llegado; no se admiten tareas ajenas ni permisos fabricados.

Se leyó código real de [Chromium NotifyReadyToActivate/ActivateSyncTree](https://github.com/chromium/chromium/blob/abe9acda311aa8bde88d3882c717d4d82d0c0646/cc/trees/layer_tree_host_impl.cc). Distingue árbol pendiente/activo, espera preparación efectiva y sincroniza recursos y propiedades antes de activar. Adaptamos ese patrón a la retención ya presente en Wild Guardians, sin importar el compositor ni crear otro árbol o scheduler. Se registran revisión y SHA del archivo leído.

También se contrastan [DetourCrowd v1.6.0 requestMoveTarget/resetMoveTarget/updateMoveRequest](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp), que reemplaza la petición del agente e invalida su referencia previa, y [Three r180 FileLoader](https://github.com/mrdoob/three.js/blob/r180/src/loaders/FileLoader.js), que comparte cargas por URL y combina señales de distinta amplitud. Se conserva nuestro protocolo por ID y cancelación por candidato; no se aborta el banco global del compañero. No cambian productor, Game, kernel o registro de recursos.

## Reproducción y controles

El harness de altas original conserva su autoridad Worker, ambos puertos, Surface y draw Worker. Dos opciones nuevas, cancel-before-task y cancel-after-task, contratan youngFemale como el compañero y retienen el READY Farm auténtico. El cultivo del segundo centro madura mediante los avances normales de Game: genera una cosecha genuina y reclama al contratado mientras conserva pose/cuerpo2, sin adquirir Farm23. Se observa el aborto, se retiene aparte el Task READY real y se reenvía la respuesta Farm original antes o después de adquirir Task14. Los IDs son distintos; el cuerpo y época se conservan. La selección CPU repite también la respuesta obsoleta.

Antes del cambio, la primera ejecución GPU finaliza rechazada en commit de Surface. Se conservan fuente propia, estado, log y hashes de ese diagnóstico. La primera corrección alcanza Task14 sin ese fallo, pero un guarda QA comparaba el rig del recién llegado todavía en su presentación previa con el rig después de la primera admisión nativa. Cambian28 transformaciones de huesos del recién llegado; el compañero conserva las28. Se inspeccionan update y prepareNativeMotionVariant de webgpu-confirmed-worker: la presentación previa puede muestrear el clip; una variante nativa vigente deja de actualizar ese rig en CPU. El guarda final conserva identidades/raíces/geometrías desde READY, exige el rig original del compañero y compara ambos rigs después de adquirir Task, con al menos cuatro dibujos intermedios. No se declara convertido a GPU el fallback anterior a esa primera admisión.

El primer fixture CPU ya empezaba con el cultivo maduro: Game generaba la tarea antes de obtener Farm READY, por lo que no aislaba esta carrera. Se conserva su rechazo y se hace madurar después, con diez segundos restantes en CPU y ocho en hardware. No se modifican las políticas del producto ni su timeout para obtener el pase. Una segunda revisión corrige la lectura QA de la referencia Task mediante nativeResourceAdmissionProfile; no cambia la propuesta real.

## Resultados

Dos casos CPU nuevos y los tres de cancelación anteriores pasan5/5. Con los17 de altas pasan22/22, sin omisiones (43.944s Node). Otros26 controles de retención, TaskStart gráfico y canal de recursos pasan. La nueva regresión sobre365 archivos incluye la suite modificada completa: **4838/4839**, una omisión opcional, cero fallos (747.428s de pared). Build WebGPU/Worker pasa en133.312s de pared; comparte CPU con la regresión y no mide rendimiento del producto. Los seis módulos propios pasan sintaxis. No se recompila WASM; sus64 entradas permanecen exactas. La selección mantiene sus tres exclusiones históricas documentadas, que siguen abiertas; no representa todas las pruebas del repositorio.

| Caso GPU final | Pared | IDs invariantes | Fábricas durante preparación / posteriores | Banco compartido |
| --- | ---: | ---: | ---: | --- |
| before-task | 29.515s | 585 | 154 / 132 | 1 → 2 → 2 referencias |
| after-task | 30.158s | 585 | 154 / 132 | 1 → 2 → 2 referencias |
| home-control | 33.270s | 575 | 328 / 70 | perfil del contratado liberado; compañero vivo |

Los dos casos Task conservan actor/rig/mesh/geometría de ambos trabajadores y585 IDs de geometría/texturas invariantes, incluidos los bancos originales. Tras abortar Farm, dos actores nativos siguen usando el banco youngFemale con refs2/pending0, sin reconstruirlo ni duplicar WGSL idéntico. El Task14 del cuerpo2 se observa en el frame real del consumidor y en su ticket de mundo; nunca se dibuja el ticket Farm cancelado. Los dos actores pasan picking; el drenaje GPU es real y la autoridad sigue viva hasta el cierre gráfico.

Cada caso tiene tres bloqueos de preparador de1,8s y54 dibujos por bloqueo. El reloj avanza1,70–1,72s y el compañero se desplaza al menos1,47 unidades. El control de Home conserva575 IDs, adquiere Home y termina en ausencia con solo el compañero seleccionable. Cero errores de fuente/navegador/red/GPU en las tres ejecuciones finales. Las mediciones hardware fueron secuenciales, antes de ejecutar regresión/build. Las dos imágenes finales de Task se inspeccionan: modelos y sombras originales visibles en ese encuadre limitado; no paridad completa del mundo.

154/132 son contadores agregados de preparación/relevo/efectos en los casos Task, no recursos mínimos ni coste exclusivo de la Farm cancelada. Las capturas no aceptan cadencia: los huecos históricos de168ms y50,71ms siguen [documentados y abiertos](native-frame-gap-diagnostics-20261120.md). Tampoco se convierte el caso global3.123 en cerrado por conservar estos585 IDs. La recuperación WALK retenida y main pausado ya tienen evidencia propia; no se repiten como pendientes.

## Estado y reproducción

Se cierra este defecto de coordinación TaskStart y el caso acotado de sustitución Farm preparada → tarea, incluido el banco que sigue en uso. Permanecen lotes con cancelación simultánea, carga fallida/cancelación antes de READY, cierre GPU durante preparación, resto de intenciones/cohortes, recuperación de consumidor fallido/device loss, VFX, coste de publicación, cadencia y plataformas. No se activa un cohort íntegramente legacy ni se alteran las guardas de puertas/incursión. A6/A/B/C abiertos; D no iniciado; f-R3 conserva su cierre de seguridad.

Con Vite en5218 y el Playwright ya disponible, ejecutar la herramienta audit_native_farm_birth_world_owner.mjs con QA_NATIVE_BIRTH_SCENARIO=cancel-before-task o cancel-after-task, QA_NATIVE_NEWBORN_PROFILE=youngFemale, QA_NATIVE_CAPTURE_MODE=visual y QA_NATIVE_TRACE=false. El recibo conserva comandos, entornos, seis hashes de fuente, resultados completos y los intentos rechazados.690 inputs (684 previos intactos, cinco modificados y uno nuevo),64 nativos,16 ajenos y38 A5 verificados. [Recibo y evidencias](performance/native-task-start-publication-hold-20261120-validation.json).
