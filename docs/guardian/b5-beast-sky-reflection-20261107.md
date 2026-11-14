# Reflejo ambiental de bestias en WebGPU

La receta compartida de bestias incorpora la misma contribución del cielo que `beast-lighting.js`, con dirección reflejada, rugosidad, panoramas de día y noche y el peso original. El grafo usa los bindings estables del ambiente ya compartido por el mundo: las texturas iniciales permanecen hasta que el Worker prepara y publica los panoramas. Se crea también para volcanes y desierto, sin subir el mapa de pendiente de agua que no usan esos biomas. Las sombras siguen usando su nodo existente y no se altera la simulación.

Las pruebas cubren la construcción WGSL, la identidad del grafo al cambiar la iluminación y la propiedad de recursos del ambiente con renderizador simulado. La imagen en WebGPU real, la comparación perceptiva con WebGL y el coste de preparación y memoria, especialmente en biomas secos, aún están pendientes de validación integrada.
