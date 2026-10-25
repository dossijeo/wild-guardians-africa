# Repetición del coste de transición de hierba

Comparación original frente a viento, normales y pigmento coherentes entre LOD. Intel UHD / ANGLE D3D11, 1280×720, calidad media, semilla712, cámara normal fija y viento animado. Secuencia A/B/B/A, día y noche, calentamiento previo. Auditoría válida:480 muestras GPU y720 frames de cadencia; cámaras, draw calls, triángulos y cobertura coinciden, sin errores observados.

| Fase / variante | GPU media ms | CPU render media ms | Intervalo callbacks ms |
|---|---|---|---|
| day / base | 20.58 / 22.69 | 3.88 / 3.93 | 23.17 / 26.38 |
| day / combined | 23.34 / 22.63 | 3.72 / 3.76 | 24.33 / 24.55 |
| night / base | 22.27 / 23.91 | 3.69 / 4.93 | 24.30 / 30.34 |
| night / combined | 23.97 / 23.28 | 3.61 / 3.73 | 25.16 / 25.63 |

El promedio de bloques aumenta aproximadamente1.35ms GPU de día y0.54ms de noche. La variación del control y la degradación del último bloque impiden presentar los intervalos favorables de la candidata como una mejora causal de FPS. Conservar la candidata por coherencia visual, sin promoverla todavía por defecto ni considerarla una optimización.

La consulta imposible de960777ms de la [ronda anterior](../grass-pigment-lod-20261021/performance/README.md) no se reprodujo. Aquella ronda permanece inválida y conservada; esta repetición no identifica la causa del fallo del temporizador.

Dos medias por celda, no intervalos de confianza. CPU excluye simulación; callbacks no equivalen a presentación. Cámara fija: no mide streaming ni generación de máscaras.172 geometrías en todos los bloques;59 texturas al comienzo y57 posteriormente también en el control: no demuestra ahorro de VRAM ni residencia idéntica. No se mide memoria física GPU.

Evidencia visual separada: [72 parejas y secuencias](../grass-final-motion-20261021/README.md), [diagnóstico del extremo de LOD](../grass-pigment-endpoint-20261021/README.md). La reducción del salto de píxeles no certifica por sí sola calidad artística global. Pendientes evaluación temporal fina y Gran Río.

Reproducción con Vite en5190:

```text
node tools/experiments/measure-grass-pigment-repeat-20261021.mjs
python tools/experiments/audit-grass-pigment-repeat-20261021.py
```

Los archivos de salida deben archivarse antes de repetir; no sobrescribir evidencia previa. Sin cambios del renderizador predeterminado ni de main.
