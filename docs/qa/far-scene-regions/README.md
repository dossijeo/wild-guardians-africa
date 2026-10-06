# Peticiones regionales del horizonte experimental

FarSceneStream conserva un único resultado regional completo y una sola petición activa. Al solicitar otra región cancela la anterior y descarta completaciones/errores obsoletos mediante epoch, incluso si un proveedor ignora la cancelación. Peticiones idénticas comparten Promise; volver a la región residente cancela la carga intermedia y reutiliza el resultado. Un fallo mantiene el resultado anterior y permite reintentar. Dispose cancela y evita publicar resultados tardíos.

El visor usa este coordinador para la carga inicial y un botón de diagnóstico «Cambiar región» que desplaza la consulta 96 unidades. Los bounds siguen siendo de tamaño fijo: árboles 360×278, terreno 480×480. Mantiene escena anterior hasta recibir el resultado nuevo; prepara geometrías/instancias y sustituye las representaciones en un mismo callback. Libera geometrías/materiales anteriores, conservando el atlas compartido hasta el cierre final. Los controles de acercamiento/orbita trabajan sobre el centro residente. No se conecta aún al seguimiento automático de cámara ni a los chunks 3D de gameplay.

## Evidencia

Quince pruebas correctas (3.129 ms): latest-request-wins, retención, errores y reintento, deduplicación, retorno a región residente, dispose y respuestas tardías; worker real, transferencia de buffers, igualdad de datos originales y alturas/anclajes. Dos regiones completas superpuestas mantienen igualdad profunda de los árboles con ID común, incluyendo posición/yaw/escala/tint, y no duplican IDs.

Navegador nativo: tres clics sucesivos solicitan 96/192/288. La observación DOM conserva residente 0 con pendiente 288; al terminar queda residente 288/pendiente null (native.json/native.png), 101 árboles y GL cero/consola vacía. Otra carga solicita región 96 y comprueba acercamiento: cámara [96,23.461386,25], seis modelos cercanos, sin errores; near-region.json/near-region.png. La observación intermedia está transcrita en proof.json, no se obtuvo captura durante la espera. No acredita ausencia de popping en un desplazamiento continuo.

En región 288 el máximo error vertical en orígenes de árboles aumenta a 0,190129 unidades (media 0,018464): la aproximación de cuatro unidades requiere revisar adaptación del relieve antes de aceptar contacto visual global. El campo workerLoad del visor conserva métricas de carga inicial; ground.buildMs de una región reemplazada registra el cálculo worker, no tiempo de montaje del hilo principal. No utilizar esos campos como benchmark comparable de región inicial/reemplazo.

Cambios limitados a herramientas/visor/pruebas experimentales. No se modifica el bundle ni el mundo del juego. Pendientes streaming automático con margen e histéresis, preparación GPU/carga 3D, conservación de impostores mientras los chunks llegan tarde, supresiones de gameplay, bruma/iluminación/agua, transiciones de borde y pruebas móvil/coste total. Sigue fuera del gameplay.
