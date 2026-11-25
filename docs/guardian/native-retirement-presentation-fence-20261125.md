# Retirada de recursos tras presentar el reemplazo

En el regreso civil de Sabana, el retiro del rig pidió un fence cuando el Host conservaba las escrituras de un paquete obsoleto y otras cinco escrituras aún no tenían un fotograma que las referenciase. El lote de retirada ahora espera una presentación posterior y un fence real. La espera conserva las escrituras y los recursos del fotograma anterior. Durante el cierre definitivo, el productor sella la salida de fotogramas y el Host descarta las escrituras inéditas antes de esperar el trabajo ya sometido.

Se conserva el rechazo del fence general y de la solicitud directa que intenta cubrir escrituras pendientes. Los dos controles reproducen el fallo anterior. Verifican que ni la repetición del fotograma anterior ni cancelar la admisión liberan el lote. Los casos de reemplazo y cierre definitivo esperan la finalización nativa. La regresión integrada pasa 301 pruebas y Vite compila.

Viz mantiene el recurso hasta que deja de estar en uso y ha pasado su fence. Dawn asocia `onSubmittedWorkDone` al número de ejecución de la cola. Wild Guardians adapta esa secuencia a la presentación y al mensaje de retirada que ya existen. [Chromium, DisplayResourceProvider](https://github.com/chromium/chromium/blob/main/components/viz/service/display/display_resource_provider.cc#L331-L362) · [Dawn, QueueBase::APIOnSubmittedWorkDone](https://github.com/google/dawn/blob/main/src/dawn/native/Queue.cpp#L172-L194).

## Comprobación en NVIDIA

La solicitud 10613 queda diferida con el fotograma 405 activo, el 406 recibido, 59 operaciones retenidas y cinco buffers del sufijo sin pins. El reemplazo 407 se presenta y la retirada se liquida después del fence 10820. El recorrido estricto dibuja ambos golpes, retira al animal y vuelve a Idle con worker-21, person-9, contrato 2, cuerpo nuevo 3 y saldo 190. El paquete 493 acredita la ausencia de Retreat antes del primer dibujo de Farm23 en el 494. El consumidor devuelve un solo drenaje y se registran cero avisos de recursos y cero errores.

En esta captura a 30 Hz pasan 1.000 ms entre el último envío válido y el del paquete 407. Se miden 218,5 ms en ocho llamadas a `Nodes.getForRender` de Three y 428,5 ms de espera de ocho pipelines en el Host. El primer dibujo del reemplazo dura 6,9 ms. En los paquetes 493 y 425 se miden 200,10 y 195,50 ms entre envíos, con espera de recursos cero y trabajo de captura previo. C4 sigue abierto con objetivo físico de 16,667 ms. [Recibos, marcas, cortes y hashes](performance/native-retirement-presentation-fence-20261125.json).
