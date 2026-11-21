# Fundido temporal de texturas cercanas

La textura mejorada se mezcla durante 0,35 segundos de simulación desde la admisión efectiva de cada instancia. El shader multiplica ese fundido por la mezcla existente según distancia; la GPU utiliza un instante por instancia y el reloj compartido, sin publicar valores de mezcla ni crear pipelines por fotograma. En pausa el fundido permanece detenido. Las instancias nuevas con la mejora ya disponible aparecen directamente con ella.

El instante se conserva al reconstruir un chunk o cambiar de LOD y se compacta junto a las instancias visibles. Los árboles retirados dejan de conservarlo al publicar la revisión. Las pruebas comprueban el orden de publicación, el reloj, las revisiones, la compactación y la generación WGSL. No se ha comparado todavía la imagen en WebGPU real ni medido el coste de la sustitución, las sombras o los recursos. La prueba no demuestra ausencia de tirones.
