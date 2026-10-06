# Comparación experimental de normales

Atlas opcional; no integrado en gameplay. Cámara fija, 1008 impostores, mezcla angular, 1280×720, DPR 1, mediodía, 45 frames de calentamiento y 180 muestras por lote. Ambos brazos usan el mismo programa con rama opcional de normales.

`benchmark-final-native.json` corresponde a las fuentes comprimidas y hashes adjuntos. Medianas GPU sin normales: 1.825937 / 1.723020 / 1.892135 / 1.956875 ms; con normales: 2.018385 / 2.038853 / 1.918281 / 1.952239 ms. Todos los lotes tienen 180 muestras, cero disjoint y GL 0. Hay variación temporal; no se demuestra coste nulo ni mejora consistente.

`benchmark-native.json` y las capturas corresponden a una versión anterior que calculaba también la aproximación antes de sustituirla. Las capturas muestran una mejora perceptual de las sombras de copa, pero no prueban equivalencia exacta, rendimiento móvil ni aceptación final. Las fuentes anteriores no se archivaron: no atribuirles los hashes finales.

La siguiente comparación, solicitada por el usuario, será iluminación precocinada de día/noche sin textura de normales ni iluminación de copa en el impostor.
