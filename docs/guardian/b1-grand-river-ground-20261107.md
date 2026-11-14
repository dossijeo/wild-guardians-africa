# Terreno WebGPU del Gran Río

El perfil WebGPU Worker utiliza el proveedor de césped compartido con sabana y el atlas original `grand_river`. Las diferencias de tinte, cobertura, escala, normal y relieve son uniforms; las máscaras y posiciones se reciben por chunk confirmado. Las revisiones, admisión y liberación son las mismas del terreno existente. Un fallo de recursos informa del error y conserva el fallback de color de vértice.

Las pruebas generan WGSL idéntico para ambos biomas con parámetros y texturas compatibles, y verifican selección del atlas, máscaras y ciclo de vida. La receta conserva las identidades de textura porque cada proveedor enlaza recursos propios; igualdad del código generado no demuestra reutilización física del pipeline, que requiere instrumentación en GPU real. Siguen pendientes AO de contacto, cualquier variante de laboratorio, comparación visual día/noche y mediciones en partida. No se afirma paridad ni una mejora de rendimiento.
