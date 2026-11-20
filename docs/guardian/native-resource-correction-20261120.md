# Recepción y preparación incremental del consumidor GPU — 2026-11-20

Corrección subordinada al [objetivo](MIGRATION-OBJECTIVE.md), al [plan integrado](integrated-gpu-migration-plan-20261104.md) y a [A6](A6-CHECKLIST.md). Continúa las [cesiones de paquetes de Sol](native-preparation-packet-slices-20261120.md); no sustituye autoridad, renderer, propietarios ni planificador. [Traspaso y comandos](native-resource-correction-handoff-20261120.md).

## Problema demostrado

Pasar Farm → tarea → Harvest → Carry → Settlement → siguiente tarea no acreditaba cadencia. En la historia previamente comunicada había seis intervalos largos, hasta 93 ms, y una microtarea de 19,65 ms. Son problemas distintos: en el intervalo de 93 ms se acumularon 1.204 mensajes/deserializaciones y unos 88 ms de ocupación del consumidor antes de entrar en el presupuesto de recursos; la microtarea contenía unos 17,4 ms de copia nativa de imagen.

La reproducción propia anterior a esta corrección, con wallpaper estático, registró 2.451 muestras completas, cuatro intervalos >50 ms y máximo 136,625 ms. No es la misma ejecución que los seis intervalos anteriores. Su imagen de 4096×2048 consumió 15,535 ms en deserialización y 17,865 ms en copia; otras tres imágenes de 2048² también bloquearon la recepción. Ceder entre fábricas no protege frente a deserialización previa al handler ni subdivide una llamada nativa indivisible.

Después de corregir transporte y copias quedaba un intervalo de 51 ms, sin bloqueo largo ni guard causal del Host. La ejecución diagnóstica siguiente enlaza el flujo Dawn **5462**, desde `uploadExternalImage → applyQueue(copyExternalImageToTexture)` en el Host (pid12132/tid7972, ts596977182755, envío de 104 bytes), hasta `HandleDawnCommands` en el proceso GPU: **79,30 ms de pared / 76,97 ms CPU**. Era la primera imagen real de 2048². Los perfiles también identificaron reconstrucción de bindings dependientes y validación reiterada de la misma referencia Idle/acción dentro de una admisión.

El código de [Dawn, revisión 53f19cdb, CopyTextureForBrowserHelper.cpp](https://github.com/google/dawn/blob/53f19cdb94ac490f07029271335f13b1c60e56d9/src/dawn/native/CopyTextureForBrowserHelper.cpp#L242) mantiene un pipeline interno por formato de destino y lo crea síncronamente al primer uso; flip/alpha se parametrizan con uniforms. El flujo se interpreta con [Chromium WebGPU decoder, revisión b830442d](https://chromium.googlesource.com/chromium/src/+/b830442dc74e5dc35b6b13e79a6f60914d7adbc9/gpu/command_buffer/service/webgpu_decoder_impl.cc). Estas revisiones son referencias verificables del mecanismo, no una afirmación de correspondencia exacta con el binario Edge157 medido.

## Corrección y contratos conservados

Para transporte se contrastan [StructuredSerializeWithTransfer](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializewithtransfer) e [ImageBitmap: serialización, transferencia y cierre](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#imagebitmap), HTML Living Standard consultado el 20 de noviembre: transferir mueve la propiedad, por eso se captura una representación privada. La ventana de créditos es una política del FIFO existente, no una garantía de tiempo del estándar. La [especificación WebGPU del 16 de noviembre](https://www.w3.org/TR/2026/CRD-webgpu-20261116/#dictdef-gpuimagecopyexternalimage) define el origen superior izquierdo incluso con flip; de ahí el cálculo de regiones y sus pruebas de bordes.

Se leyó también el código instalado de Three **0.180.0**: [WebGPUTextureUtils._copyImageToTexture](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/utils/WebGPUTextureUtils.js#L695) pasa flip/alpha/mip/capa a la copia nativa; [DataMap](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/DataMap.js) guarda metadatos por identidad débil; [Attributes.delete/update](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Attributes.js) distingue creación/actualización por versión y destruye el buffer al borrar. No se comparte un atributo sólo por igualdad de bytes. Para DTO se reutiliza directamente la procedencia inmutable ya presente en [native-idle-cycle.js](../../src/world/native-idle-cycle.js): es validación estructural, distinta de un permiso nativo vivo. Negativos recomendados y ejecutados: clon externo, objeto congelado ajeno, modificación anidada, pérdida de epoch, cancelación y cierre del propietario.

| Frontera | Cambio | Propiedad y seguridad |
| --- | --- | --- |
| Productor → consumidor | Ventana negociada de ocho despachos sobre el FIFO existente; transferencia de bytes privados | ACK significa despacho, nunca ejecución GPU, READY ni retirada. Cancelar puede adelantar la cola sin conceder publicación. |
| Imagen original → transporte | `structuredClone` privado del ImageBitmap, después transferido; captura de canvas en el productor | La imagen del dueño permanece utilizable. Se cierran capturas privadas al enviar, cancelar o terminar, incluso si resuelven tarde. `createImageBitmap(bitmap)` fue rechazado por cambiar alpha en GPU real. |
| Cola nativa | Regiones de **512×512**, con origen, flip, alpha, formato, mip y capa originales | Se fija el grafo exacto de textura entre cesiones. Las solicitudes globalmente inválidas conservan la validación nativa. No hay readback, reescalado ni renderer adicional. |
| Inicialización del paquete preparado | Cesiones de planificación, validación, upload y entre forks de buffers | Cada buffer y sus bindings dependientes cambian de forma atómica; el snapshot se vuelve a fijar antes de ceder. Una cancelación conserva payloads para reintento; sólo la inicialización completa los cierra. |
| DTO y admisión | Reutilizar exclusivamente salidas propias, validadas e inmutables; conservar templates canónicos en el Host | Clones de wire y objetos congelados externos se validan íntegros. La reutilización de leases vive sólo en una llamada síncrona y usa identidades construidas por el Host; las comprobaciones de vigencia siguen ejecutándose. No se cachean permisos entre eventos. |
| Primer uso de imagen | Dos copias privadas 2×2, RGBA8 y sRGB, antes de anunciar el dispositivo READY | Mismo dispositivo y cola; error scope y `onSubmittedWorkDone` real antes de destruir temporales. El coste legítimo se registra en `adapterInfo.imageCopyPreparation`; no desaparece ni se cuenta como ahorro. |

La cesión por buffer conserva una unidad indivisible: un buffer con muchos dependientes aún puede costar tiempo. La ventana limita mensajes pendientes en el consumidor; no convierte cualquier mensaje arbitrario en una unidad de duración garantizada. El warm-up cubre los dos formatos de imagen byte utilizados aquí, no cualquier formato futuro ni todas las rutas de Dawn.

## Evidencia de GPU y coste

Mismo fixture real, modelos originales, Workers/WASM, NVIDIA Turing y Edge157; escritorio estático y ejecución GPU exclusiva. Captura `timing`, sin PNG durante cadencia. Cada ejecución congela y verifica sus inputs. El historial analizado es completo, no el último ring parcial.

| Ejecución | Muestras | Intervalos >50 ms | Máximo | Observación |
| --- | ---: | ---: | ---: | --- |
| before | 2451 | 4 | 136,625 ms | Base propia anterior a la corrección |
| after2 | 2464 | 1 | 51 ms | Región1024, sin preparación interna previa; etapa descartada |
| after4 | 2453 | 0 | 49,670 ms | Región512 y arquitectura final, con traza/observadores |
| after5-untraced | 2443 | 0 | 38,935 ms | Sin CDP ni observadores opcionales; sigue siendo fixture funcional |
| delivery | 2443 | 0 | 49,415 ms | Fuentes finales tras el guard terminal; sin CDP/observadores opcionales |

After4: draw CPU máximo8,725 ms y microtarea máxima9,344 ms de pared/8,905 ms CPU. Ochenta llamadas de imagen, máximo6,75 ms. Preparación interna inicial78,47 ms; after5:127,075 ms. Es trabajo de arranque explícito, anterior a READY, conservado en la evidencia. La cadencia nominal observada es30 Hz:33,33 ms entre callbacks es normal en esta configuración. No se afirma ausencia universal de jitter, latencia física de scanout ni cierre de plataformas.

La comparación de regiones rechaza un objetivo engañoso de minimizar sólo el máximo:256 multiplicaba el trabajo total. En el microensayo exclusivo, una copia4096 tuvo totales16,53/3,73/7,56 ms;512 tuvo32 llamadas y totales32,08/29,66/29,29 ms, con máximos1,59/1,10/1,07 ms. Son rutas con distinto primer uso, no un benchmark de throughput estabilizado. Se elige512 porque la región1024 llegó a10,175 ms en el Farm real. **Más llamadas y mayor coste agregado de copia son una limitación conocida**; el beneficio demostrado es acotar trabajo síncrono y eliminar bloqueos observados, no reducir todos los bytes o todo el trabajo GPU.

El oráculo de píxeles usa la copia nativa directa del mismo dispositivo frente al Host/client de producción, en ocho combinaciones RGBA8/sRGB × flip × alpha, con crop y origen desplazados que cruzan varias regiones. Resultado: cero bytes diferentes, imagen original utilizable, drenaje confirmado y cero recursos restantes. No se usa una segunda simulación de colores.

## Regresiones y negativos

Selección amplia heredada de bac8 más pruebas nuevas: **5036/5037**, una omisión opcional histórica, cero fallos/cancelaciones, 384 archivos; build correcto. La omisión es `cached native terrain edges preserve exact detours across moving bodies and topology changes`, que requiere los dos WASM candidatos. Conserva la selección y exclusiones previas: no es la suite completa. Inputs intactos antes/después. Tras ella se añadió un único guard tras esperar una captura: si llegó dispose/lost/error durante el await, no se permite reabrir transporte. Esa diferencia pasa **458/458** dirigidas, nuevo build y GPU final; no se atribuye retroactivamente a la ejecución amplia. La GPU final conserva 9.053 inputs, completa la vertical y el drenaje, vuelve a pasar 8/8 comparaciones de píxeles y registra 115,775 ms de preparación interna antes de READY.

Se conservan negativos reproducibles:200 mensajes recibidos antes del primer trabajo frente a límite8; referencias propias reconstruidas con los validadores anteriores; ausencia de cesión en uploads/forks; copia de ImageBitmap que alteraba alpha; captura tardía que enviaba una operación después del cierre. Las pruebas de cancelación comprueban conservación del buffer activo, rebase del grafo retenido y reintento; las de arranque comprueban fence antes de limpieza y fallo parcial sin READY. Los clones externos inválidos y las identidades de bindings inyectadas se rechazan.

La antigua prueba de seam de instrumentación falló al cambiar la firma del inicializador a async: se actualizó la búsqueda literal y volvió a pasar; no se cambió ninguna expectativa de producto. Los ensayos diagnósticos y el benchmark potencialmente concurrente se conservan separados de la aceptación de cadencia.

## Evidencia y límites de integración

[Manifiesto y archivos](performance/native-resource-correction-20261120/manifest.json) contienen recibos, trazas comprimidas, negativos, versiones, fuentes congeladas y validaciones. La traza diagnóstica archivada es un **extracto filtrado**, con hash del original completo; sirve para atribución de CPU/Dawn, nunca para acreditar la historia completa. Las trazas before/after4 son completas. Las rutas `.cache` originales de los recibos son procedencia; los nombres archivados y hashes están en el manifiesto.

No se modifica Game, Farm, productor ordinario, kernel ni contratos públicos de autoridad. Sol conserva la integración funcional y los documentos de estado. La recuperación incremental de3.123 recursos ya se entregó en78aacb134/e7fb1d5fd; no se vuelve a atribuir a esta corrección. Tampoco se acepta como mínima la demanda inicial de26.666 recursos/907 compilaciones ni se cierra A5, A6, recuperación por pérdida de dispositivo o ningún gate. La auditoría de propiedad y laboratorio A5 previos siguen vigentes.
