# Fuentes de LOD de bioma en WebGPU

El propietario de bioma puede suministrar bajo demanda las geometrías 3D de los niveles de autoría posteriores al primero, reutilizando el binario ya cargado. Cada fuente es compartida por slot y nivel, mantiene los UV originales y aplica la limpieza de triángulos específica de ese nivel. El proveedor conserva su propiedad y la libera al cerrarse. Las pruebas usan también los manifiestos y geometrías reales de sabana y volcanes.

Esta API no carga materiales, no crea lotes visibles ni admite pipelines. El consumidor deberá preparar y publicar el lote completo con sus materiales originales, instancias, selección y sombras antes de retirar el lote anterior. La selección por cámara y los impostores 2D siguen pendientes; el juego continúa dibujando el nivel 3D actual. No se ha medido ahorro de GPU, memoria o tiempo de fotograma.
