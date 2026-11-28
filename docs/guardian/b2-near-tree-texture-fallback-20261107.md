# Fallback de texturas cercanas de árboles

Si la descarga o decodificación de una textura cercana falla, el proveedor publica el modelo 3D con sus mapas y coordenadas UV originales en vez de dejar vacío el lote. La mejora se reintenta una vez fuera del render; si se recupera, el lote anterior permanece visible hasta que la nueva geometría y su material superan la admisión. La cancelación libera la espera, y un fallo persistente mantiene el árbol original y se comunica como error sin impedir los demás recursos del bioma.

Las pruebas simulan el fallo, la recuperación, la admisión aplazada y el cierre. La primera carga todavía espera a que termine el intento inicial de textura cercana: esto no implementa carga progresiva durante una descarga lenta. El reintento está limitado a una vez por slot y no se ha comprobado el resultado visual ni el rendimiento en GPU real. Los recursos de la versión original se conservan hasta cerrar el proveedor, también tras una mejora satisfactoria.
