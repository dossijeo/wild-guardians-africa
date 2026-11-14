# Humo de destrucción y profundidad del terreno

El humo de destrucción de centros usa el binding de profundidad que ya comparten los VFX WebGPU para atenuar la intersección con el terreno. La captura solo se solicita cuando alguno de esos efectos la necesita. Si la captura no está lista, por ejemplo durante una redimensión, el humo sigue mostrándose sin esa atenuación hasta que la nueva textura esté disponible. No se capturan edificios ni personajes.

Las pruebas dirigidas cubren el grafo WGSL, la demanda compartida de profundidad y la sustitución del recurso con componentes simulados. La apariencia y el coste de esta integración aún requieren validación en una partida con WebGPU real; no se ha medido una mejora de rendimiento.
