# Envolventes de cultivos comprobadas con vertex shaders nativos

Complemento sobre main `dcf556d`. El visor aislado `tests/browser/crop-bound-gpu.html` carga el GLB original del catálogo y los 32 bridges nativos, crea un batch con la receta actual y extrae el hook de posición de cada material. Compila ese código en WebGL2 y captura `transformed` mediante transform feedback: no vuelve a implementar las deformaciones en JavaScript.

72 mallas verificadas: 40 originales y 32 bridges, 16484394 posiciones GPU leídas. Originales: tres combinaciones de escala/apertura y dos relojes (seis muestras por malla). Bridges: t=0/0,2/0,5/0,8/1 y e=0/0,5/1 con dos relojes (30 muestras por malla); se incluyen endpoints y t/e independientes. Semilla7, viento1, uniformes nativos de altura/radios. Todos los vértices, incluidos los duplicados de los bridges, se procesan. El código extraído de posición de color y profundidad coincide en las 72 mallas. No se compara aquí la totalidad del shader final de Three ni la proyección en cámara.

No hay puntos fuera de la tolerancia de 1e-4. La máxima desviación positiva contra el límite analítico sin padding es 3,04e-7; el prototipo expande sus cajas por 1e-4. No describir este resultado como igualdad exacta en aritmética real. La lectura comprueba valores finitos y errores WebGL tras cada muestra; informe/console sin errores. Hardware Intel UHD/ANGLE D3D11, sin acreditar móvil.

La envolvente original conserva radio bajo rotación Y, limita el escalado radial, incluye desplazamiento máximo de viento y crecimiento/pliegue vertical. El bridge usa la desigualdad triangular sobre `pivot + rotate(v-root)*sqrt(weight)` y añade descenso de suelo de .75. Los raw bounds incluyen vértices, raíces y peer roots por rol. Estas envolventes pueden ser amplias; seguridad geométrica no acredita ahorro.

[Datos y hashes de hooks extraídos](gpu-envelopes.json), [fuentes y evidencia complementaria](additional-proof.json). La selección de parámetros es finita: no prueba todas las combinaciones, transformaciones arbitrarias, otros valores de viento, iluminación/sombras, texturas/alpha, VFX, matrices/origen del renderer completo, recreación del batch ni coste de gameplay. Tampoco se usa el tiempo de este visor como benchmark. Producción sigue sin importar el candidato de descarte.

Reproducir con Vite y botón «Verificar vértices en GPU» en `/tests/browser/crop-bound-gpu.html`. El contador y los casos quedan visibles; errores hacen fallar la ejecución. No se necesitan paquetes adicionales ni WebDriver externo.
