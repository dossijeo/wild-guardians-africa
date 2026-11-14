# Superficies de fragmentos VFX en WebGPU

El material compartido de fragmentos utiliza las fórmulas procedurales originales para tierra, madera y piedra: ruido, vetas y el oscurecimiento y la rugosidad de la tierra húmeda. La posición se expresa en el espacio local del efecto, como en el compositor nativo. La clase de fragmento y la humedad son datos independientes por malla; las dos luces locales conservan el color original de la instancia y no aplican dos veces el pigmento.

Las pruebas generan WGSL y comprueban bindings independientes y la conexión de la humedad. No prueban la paridad perceptiva, el coste ni la compilación en un dispositivo WebGPU real. El viento de hojas y la equivalencia completa de sombras y luz ambiental siguen pendientes; el material mantiene la iluminación estándar de Three.js.
