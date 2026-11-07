# Apariencia de cultivos bendecidos en WebGPU

Los lotes de cultivos y sus puentes de crecimiento utilizan parámetros por instancia para el tinte y resplandor de la bendición y el destello de daño confirmado. El mismo material sigue compartiéndose entre instancias y el reloj de presentación confirmado controla las transiciones. El plazo de revelación y los datos necesarios para restaurar el efecto se conservan en el checkpoint; se aceptan los checkpoints anteriores sin esos campos.

Las pruebas cubren instancias, recuperación, generación WGSL y composición con la textura y nodos de color previos. No demuestran paridad perceptiva ni coste en una GPU real. El adorno de murallas bendecidas y la comparación visual integrada siguen pendientes.

Actualización: el material compartido de murallas ya incluye el adorno de vid y el resaltado de selección descritos en [la integración de selección](b6-wall-awakening-selection-20261107.md). La comparación visual integrada y la medición del coste siguen pendientes.
