# Coste del cruce POM interpolado

ABBA Intel UHD/D3D11 ANGLE, media1280x720, semilla712. A:cruce discreto8pasos; B:interpolación lineal. Ambos usan Rock035 ampliada y ceniza por altura. Misma cámara normal, pausa, geometría y materiales restantes.960consultasGPU/1440frames de cadencia en ventanas separadas, calentamiento180frames por ventana. Sin erroresGL/disjoint/descartes/cambios de estado; auditoría exige cámara/calls/triángulos iguales.

| Medias de bloques,ms | A1/A2 | B1/B2 |
|---|---:|---:|
|GPU día|14,299/14,405|13,985/13,836|
|GPU noche|15,505/16,905|14,685/14,623|
|CPU día|4,062/4,426|4,103/4,073|
|CPU noche|3,985/4,403|4,093/3,996|
|Intervalo día|17,252/16,719|16,904/17,273|
|Intervalo noche|17,275/16,791|17,182/17,783|
|p95 intervalo noche|22,0/17,6|21,1/25,9|

GPU menor en cuatro parejas, pero intervalos mixtos y p95B nocturno25,9ms. No prometer aceleración uniforme ni atribuir todo al refinamiento: siguen variación entre bloques y ventanas separadas. Igual número de sitios textureGradARH en fuente(3antes/después) y máximo8muestras de marcha no significa idéntico coste de ALU o caché. No hay nuevas pasadas/recursos.

Conservar por suavizado visual y ausencia de sobrecosteGPU consistente en esta serie; no promoción por FPS. [Brutos](benchmarks.json), [resumen](summary.json). Reproducir measure-volcanic-pom-refined.mjs y audit-volcanic-pom-refined.py. No sumar esta diferencia a otras series para estimar coste combinado.
