# Reflejos de cielo en suelos secos WebGPU

Los materiales de terreno del desierto y de los volcanes utilizan los panoramas compartidos de día y noche ya preparados para la escena. Las fórmulas de reflexión y sus parámetros son las respectivas traducciones TSL del tratamiento original del terreno; la carga de los panoramas y la mezcla progresiva permanecen en el Worker gráfico. El material conserva bindings estables cuando cambia el cielo y no modifica la geometría ni el estado de la simulación.

Las pruebas generan WGSL para ambos proveedores y verifican los bindings compartidos y el ciclo de vida del ambiente mediante una cola simulada. No son una comparación visual ni verifican el primer dibujo o el coste en WebGPU real. Continúan pendientes el AO de contacto, la paridad completa de iluminación y las pruebas en partida.
