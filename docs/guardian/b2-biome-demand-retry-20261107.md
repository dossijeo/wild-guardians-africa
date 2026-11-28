# Reintento de vegetación demandada

Una caída transitoria al descargar las texturas o preparar un modelo demandado podía dejar un chunk visible sin ese tipo de árbol hasta que una nueva revisión del mundo volviera a solicitarlo. La carga demandada realiza ahora un reintento diferido y único sin recorrer la escena por fotograma. Si la segunda carga también falla, se conserva el error y se espera a un cambio relevante o una solicitud explícita; el cierre del proveedor cancela el temporizador.

Las pruebas cubren la recuperación sin otra revisión, la limitación ante fallo persistente y las rutas anteriores de publicación, cancelación y carga de recursos. Usan un cargador simulado: quedan pendientes la validación en navegador y el coste real de carga y primera aparición en una partida WebGPU.
