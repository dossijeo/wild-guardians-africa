# Diagnóstico de recursos y preparación de ribera

Ejecución instrumentada separada del benchmark, semilla 712, media, tres cámaras día/noche. No permite inferir aceleración ni rendimiento de streaming. Instrumenta exclusivamente la función QA de construcción y consulta propiedades internas de Three 0.180 para distinguir asignación WebGL de posesión JS.

En la primera vista diurna ambos casos poseen 25 máscaras de terreno. Control: 25 máscaras 35×35 con __webglTexture; candidata: 16 con asignación y 9 sin ella. La diferencia de nueve coincide con 68 frente a 59 texturas del contador global. Las otras categorías de texturas inventariadas coinciden. Esto identifica la categoría que explica el diferencial observado, pero no prueba por qué el historial de subida cambia. No son nueve mapas de material ausentes ni un ahorro demostrado de VRAM. Falta controlar explícitamente residencia/subida antes de atribuir diferencias de tiempos al shader.

Al volver a la primera cámara de noche, tras pasar por otras dos vistas, el control registra 20 máscaras asignadas y cinco no asignadas; la candidata mantiene 16/9. La posesión JS sigue siendo 25. El inventario no abarca todos los recursos internos del renderer, render targets o texturas ajenas a los materiales recorridos. No certifica ausencia de fugas.

Preparación candidata: primeras 25 construcciones, total 9.50 ms, media .38 ms, máximo 1.60 ms. Al inicio de noche: 35 construcciones acumuladas, total 12.20 ms, media .349 ms. Cada construcción evalúa 1225 waterInfo (nivel y distancia nativos) y copia 4900 bytes. No hay trabajo de máscara por frame. Medición de una ejecución con resolución de temporizador limitada; no extrapolar a todos los chunks ni sumar a cada fotograma. No incluye espera del worker, instalación completa ni primera presentación.

Datos por vista y texturas en captures.json; agregados en summary.json. Reproducción: Vite 5190, `node tools/experiments/trace-canyon-bank-resources.mjs`. Mantener la candidata visual; siguiente validación debe aislar preparación durante desplazamiento y controlar historial de recursos. No cambia producción, Engine ni simulación.
