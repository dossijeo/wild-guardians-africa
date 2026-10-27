# Reutilización de profundidad por concurrencia

Variante QA `qa-isolated-fade-depth-pooled.js`. Devuelve al pool los targets de slots invisibles antes de asignarlos a los activos. Cada parcial visible mantiene su propia profundidad hasta finalizar el render de color. Materiales/uniformes persistentes; se cambia el sampler al adquirir otro target. No se altera geometría ni opacidad.

Comparación con el prototipo de targets permanentes, Sabana baja semilla712,1280x720,36 pasos día/noche:72 parejas. Cámara, opacidades y número de parciales exactos; cero errores WebGL. 69 parejas idénticas píxel a píxel. Día3 difiere en21 píxeles (sin parciales), día16 y noche16 en3 cada una; MAE máximo0.000093/255. No afirmar equivalencia exacta ni atribuir sin prueba estos residuos al pool. La discrepancia sin parciales demuestra que hay alguna fuente externa de variación en la captura.

Targets retenidos4→3; nominal28.125→21.094MiB (25% menos en esta ruta, no medida de VRAM real). Se crean tres targets en total; ninguna asignación adicional al repetir noche. Al finalizar: uno asignado y dos reutilizables. Pasadas de profundidad iguales:68 día y136 acumuladas tras noche. No reducción de triángulos ni afirmación de mejora de FPS; no se han vuelto a medir tiempos con esta variante.

El pool conserva el máximo de concurrencia observado, no un límite global. Tras una escena con muchos parciales puede retener más memoria; falta política de recorte, liberación completa al desmontar el helper y validación de resize/streaming prolongado antes de integración. Mantener candidata QA. El prototipo anterior permanece disponible como control.

Reproducción: Vite5190; `node tools/experiments/capture-obstruction-isolated-pool.mjs`; `python tools/experiments/package-obstruction-isolated-pool.py`. Vídeos offline a30fps, no benchmark. PNG locales regenerables; publicadas láminas, vídeos y metadata.
