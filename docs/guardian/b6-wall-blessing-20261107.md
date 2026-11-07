# Murallas bendecidas en WebGPU

Las murallas usan la textura botánica original y un grafo TSL compartido para el adorno y su pulso. Cada réplica conserva los parámetros y límites de su propia muralla, de modo que una bendición no cambia otras murallas del mismo tipo. El instante de aparición y los impactos confirmados se conservan en el checkpoint y se aplican tanto a la fase visible como a una candidata en preparación.

Las pruebas dirigidas cubren dos murallas simultáneas, bindings, fases y recuperación, además de generar WGSL con componentes gráficos simulados. La apariencia y el pase de sombras requieren validación en una GPU real. El halo global de postprocesado continúa pendiente; no se ha medido el coste del efecto.

El pase de halo WebGPU existente también puede iniciarse por fuentes de bendición confirmadas, sin esperar a que se haya admitido el lote de partículas. Las partículas visibles siguen manteniendo el halo durante su desvanecimiento; retirar la bendición elimina la fuente. La preparación del propio pase continúa siendo asíncrona y conserva sus controles de admisión. Esto no demuestra que el halo iguale visualmente al original: sigue pendiente la comparación integrada en dispositivo y la medición de su coste.
