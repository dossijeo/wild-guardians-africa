# Task25 en los canales de recursos y terreno

La parada Task25 viaja por la preparación de recursos existente y reserva su propuesta en el canal de terreno. El transporte conserva la familia en la plantilla, el recibo de preparación y la atestación final. Comprueba el propietario y la frontera de la reserva antes de enviar la confirmación. Si recibe una respuesta mezclada con otra familia, libera la reserva y conserva el cuerpo en ejecución.

El envío de Task25 contiene cero mensajes de geometría. Las copias reservadas corresponden a las identidades de ruta y puerta y a los valores necesarios para confirmar la pose. La adopción lógica ocurre al confirmar la siguiente publicación de terreno, conforme al protocolo que ya usan Stroll12 y Farm24.

Comlink 4.4.2 registra el identificador de la petición antes de enviarla, resuelve únicamente la petición pendiente correspondiente y retira el identificador tras responder. Wild Guardians conserva esa correlación en su canal y aplica además sus comprobaciones de familia, frontera y reserva antes de aceptar el recibo. [Registro y envío en Comlink](https://github.com/GoogleChromeLabs/comlink/blob/v4.4.2/src/comlink.ts#L591-L605) · [Resolución y retirada en Comlink](https://github.com/GoogleChromeLabs/comlink/blob/v4.4.2/src/comlink.ts#L377-L396).

Tres pruebas usan WASM y dos canales `MessageChannel` reales. Antes del cambio fallaban porque el productor de terreno rechazaba la familia 25. La prueba de recorrido confirma una parada revalidada en WASM, verifica que el cliente rechace una atestación de otra familia y comprueba la adopción de una sola pose tras la publicación. Las otras dos pruebas mezclan los recibos de recursos y terreno por separado y verifican que se liberen las reservas.

El preparador gráfico de la prueba usa un doble. Quedan la preparación real en Surface y Host, el recibo de control y dibujo, y el disparo ordinario desde Game hasta Home. Los criterios e-R3, f-R4 y C4 siguen abiertos.

La regresión seleccionada pasó 239 pruebas en 22 archivos y la compilación de producto completó en 54,44 s. Los dos módulos WASM instalados se conservaron. El manifiesto incluye la selección, los registros y los hashes de entradas congeladas. [Evidencia de validación](performance/native-task-stop-ports-20261120/manifest.json).
