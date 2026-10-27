# Validación y rendimiento del Guardián

## Evidencias

- `gltf-validation.json`: validador Khronos, sin errores. Advertencias de nodos skinned bajo un padre: el padre de exportación tiene transformación identidad; los movimientos se aplican a huesos.
- `browser-checks.json`: 81 comprobaciones reales en Three.js, incluida carga/duración de las 54 voces, reproducción/pausa/seek ES/EN, nueve visemas, dos ojos, parpadeo completo/parcial, cabeza, brazos, manto, reloj ES/EN, pausas, fin y capas simultáneas.
- `regression-tests.txt`: 81 pruebas dirigidas del Guardián, audio y tutorial aprobadas.
- `final-unit-tests.txt`: pruebas adicionales de GLB y controlador.
- `deformation-checks.json`: normalización de pesos y ratios de aristas en nueve muestras por clip; no sustituye la inspección visual.
- `face-*.png`: renders Blender de las nueve formas y parpadeo.
- `tutorial-spanish.png`: integración real en la compilación de producción, cuerpo completo, diálogo y controles originales.
- `browser-spanish.png`, `browser-english.png`: capturas del laboratorio; las capturas no demuestran por sí solas precisión fonética.

La batería general `npm test` se inició y después se interrumpió por sus simulaciones largas concurrentes. No consta como aprobada. Se ejecutó la selección dirigida con concurrencia 2. La compilación final se repitió con éxito tras liberar archivos de una instancia previa de preview (un intento intermedio falló con EPERM de Windows).

## Coste medido

`browser-benchmark.json` compara ambos retratos a 300 píxeles CSS (375×375 de render en esta pantalla), 30 frames de calentamiento y 240 muestras. Hardware observado: Intel UHD, ANGLE Direct3D11, Windows, Chromium del navegador integrado.

| Métrica | Retrato 2D anterior | Guardián 3D |
|---|---:|---:|
| CPU, actualización + envío de render, mediana | 1,1 ms | 1,1 ms |
| CPU, percentil 95 | 1,5 ms | 1,7 ms |
| Actualización de animación, mediana | incluida arriba | 0,3 ms |
| Triángulos | 9.728 | 17.025 |
| Draw calls del personaje | 1 WebGL + efectos Canvas2D | 6 WebGL |
| Huesos | ninguno | 25 |

No se midió tiempo GPU con consultas de temporización: no confundir envío CPU con coste GPU. El intervalo entre frames incluye carga del navegador y de otras pestañas, y no certifica 60 FPS sostenidos del juego. Las medidas son evidencia de esta máquina, no un benchmark universal.

El GLB original ocupa 45.264.688 bytes; el final ronda 2,3 MB (valor exacto en `model-metrics.json`). El ahorro frente al GLB original no es un ahorro frente al sprite anterior: pasar a 3D aumenta descarga y memoria de GPU. Los mapas de 2K/1K y el atlas facial requieren aproximadamente 37 MiB con mipmaps RGBA8, además de geometría, morphs y matrices. El contador de texturas de Three.js incluye también texturas de morphs y huesos; no representa solo imágenes.

No se añaden bibliotecas de reconocimiento, simulación física ni IA en ejecución. La simulación de tela y Rhubarb se ejecutan offline. El canvas limita DPR a 1,5 y solo se dibuja mientras el Guardián está visible. El runtime comparte Three.js ya usado por el juego.

## Límites pendientes de certificar

- Precisión perceptiva de todos los fonemas de las 54 locuciones, especialmente phonetic en español.
- Ausencia absoluta de colisiones en nuevas poses extremas: se deben validar al crear nuevos clips.
- Coste GPU aislado y FPS sostenidos durante los escenarios más exigentes del juego.
- Los gestos por frase usan marcas estimadas; no son actuación manual ni alineación palabra por palabra.

Estos límites se mantienen visibles; no se etiquetan como pruebas superadas.

La sesión de producción en inglés cargó el juego, pero la captura final no contiene un diálogo visible (`english-game-no-dialogue.png`); no se cuenta como validación visual del tutorial inglés. La reproducción real ES/EN y su controlador sí se comprobaron en el laboratorio. En producción española se verificó también el cierre mediante el botón original.
