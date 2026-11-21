# Texturas cercanas de árboles bajo demanda

Los lotes de árboles 3D se construyen primero con su geometría y texturas originales. Las texturas mejoradas y sus UV se solicitan después de admitir un lote visible y cuando al menos uno de sus árboles entra en la distancia cercana de su manifiesto. El cálculo usa los mismos centro, radio y distancia que el selector de LOD. Sin cámara disponible, un lote visible solicita la mejora para no dejar permanentemente sin detalle el primer plano.

Las descargas cercanas no bloquean la cola de otros modelos. Hasta que se preparan y admiten los nuevos lotes permanece visible el lote original. Si durante la descarga ya no queda un árbol cercano, se conserva la presentación original y se reconsidera al mover la cámara. Ante un fallo hay un único reintento diferido; el cierre cancela las operaciones y el temporizador. El proveedor conserva los recursos compartidos hasta su cierre.

Las pruebas cubren una descarga retenida, la admisión diferida, el movimiento de cámara, la carga independiente de otro slot, el error persistente y el cierre. Son pruebas de contrato con renderizador simulado: quedan pendientes la comparación visual, el primer uso en WebGPU y la medición del coste de descarga, transferencia y reemplazo en una partida real.
