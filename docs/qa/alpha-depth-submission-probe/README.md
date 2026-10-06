# Sonda de los envíos de profundidad

La fixture de profundidad registra ahora los dibujos reales al render target de profundidad: orden, objeto/geometría/material/programa, rangos, grupos, versiones de atributos/índices/instancias, matrices, morph y mapas. Compara los siete pares de la secuencia nativa/guardada/alpha y limita los detalles publicados a ocho dibujos diferentes por par. El observer restaura renderBufferDirect en finally y conserva el retorno de la llamada original.

Pasan seis pruebas dirigidas, incluidas dos nuevas de restauración ante error y detección de cambios de orden, versiones y transformaciones. No se ha obtenido una traza nativa con esta sonda: dos intentos de crear la pestaña expiraron al adjuntar el webview; la API de tabs de browser2 devolvió una lista vacía. No se recurrió a CDP externo ni se modificó el juego para hacer pasar el contraejemplo.

Pendiente ejecutar en Volcanes y contrastar B1/B2. Las versiones no demuestran identidad de los bytes de buffers ni de todos los uniformes; incluso una comparación idéntica no atribuiría por sí sola la diferencia al shader. La sonda perturba CPU y no sirve para medir rendimiento. El contraejemplo anterior permanece válido y alpha especializado sigue desactivado en producción. Sources/hashes y alcance en proof.json.


Actualización del 6 de octubre: [traza nativa obtenida](native/README.md). Dos secuencias a 1600×900 mantienen tres diferencias frente al shader nativo, aunque B1/B2 tiene profundidad y traza idénticas; una muestra a 1280×720 coincide. La prueba limitada a props no modifica ningún dibujo visible y no descarta su participación. Se conserva un intento de precarga fallido y la consola acumulativa. Sigue pendiente atribuir la causa; candidato desactivado.
